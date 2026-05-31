"""
Corridoor v2 — FastAPI Application
Complete API with:
- NOC PDF upload + Gemini extraction
- Floorplan PDF upload + Gemini Vision cropping
- Floor-specific plan lookup during incidents
- Photo uploads in live updates
- Responder login
- Incident categories (fire/rescue/collapse/other)
- WebSocket for real-time alerts
"""

import os
import json
import shutil
from pathlib import Path
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from datetime import datetime, date
from math import sqrt
from typing import List, Optional

from database import get_db, init_db
from models import (
    Building, FloorPlan, FireStation, BuildingStationMap,
    User, FireAlert, RealTimeUpdate,
    AlertStatus, IncidentCategory
)
from schemas import (
    BuildingListItem, BuildingFull, BuildingSectionA, BuildingSectionB, BuildingSectionC,
    FloorPlanItem,
    UserRegister, UserResponse,
    AlertCreate, AlertResponse, AlertStatusUpdate,
    RealTimeUpdateCreate, RealTimeUpdateResponse,
    FireStationResponse,
    NOCUploadResponse, FloorplanUploadResponse,
)
from ws_manager import manager
from noc_extractor_v2 import extract_noc_with_gemini, noc_data_to_building_dict
from floorplan_processor import process_floorplan_pdf, get_floorplan_for_floor, get_all_floorplans
from geocoder import geocode_address

# Ensure directories exist
NOC_DATA_DIR = Path("noc_data")
NOC_DATA_DIR.mkdir(exist_ok=True)
UPLOADS_DIR = NOC_DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
PHOTOS_DIR = NOC_DATA_DIR / "photos"
PHOTOS_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Corridoor API v2",
    description="Fire incident response system — real NOC extraction + floorplan processing",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (floorplans, photos, logo)
app.mount("/static", StaticFiles(directory="noc_data"), name="static")


@app.on_event("startup")
async def startup():
    await init_db()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HEALTH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILDINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/buildings", response_model=List[BuildingListItem])
async def list_buildings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Building).order_by(Building.building_id))
    buildings = result.scalars().all()
    items = []
    for b in buildings:
        area = b.area_name or ""
        ward = b.ward or ""
        label = f"{b.building_id} · {b.name}"
        if area:
            label += f" · {area}"
        if ward:
            label += f" · {ward}"
        items.append(BuildingListItem(
            building_id=b.building_id,
            name=b.name,
            building_type=b.building_type,
            address=b.address,
            ward=b.ward,
            area_name=b.area_name,
            is_high_hazard=b.is_high_hazard,
            noc_valid_till=b.noc_valid_till,
            floors_above_ground=b.floors_above_ground,
            floors_below_ground=b.floors_below_ground,
            total_height_metres=b.total_height_metres,
            daytime_occupancy=b.daytime_occupancy,
            latitude=b.latitude,
            longitude=b.longitude,
            label=label,
        ))
    return items


@app.get("/api/buildings/{building_id:path}", response_model=BuildingFull)
async def get_building(building_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Building).where(Building.building_id == building_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(404, f"Building {building_id} not found")

    # Get floor plans
    fp_result = await db.execute(
        select(FloorPlan).where(FloorPlan.building_id == building_id).order_by(FloorPlan.id)
    )
    floor_plans = [FloorPlanItem(
        id=fp.id, floor_label=fp.floor_label, floor_numbers=fp.floor_numbers,
        image_path=fp.image_path, page_number=fp.page_number
    ) for fp in fp_result.scalars().all()]

    return BuildingFull(
        building_id=b.building_id,
        name=b.name,
        name_mr=b.name_mr,
        name_hi=b.name_hi,
        building_type=b.building_type,
        ward=b.ward,
        area_name=b.area_name,
        file_number=b.file_number,
        noc_number=b.noc_number,
        noc_valid_till=b.noc_valid_till,
        noc_type=b.noc_type,
        is_high_hazard=b.is_high_hazard,
        latitude=b.latitude,
        longitude=b.longitude,
        floor_wise_usage=b.floor_wise_usage,
        floor_plans=floor_plans,
        section_a=BuildingSectionA(
            address=b.address,
            nearest_landmark=b.nearest_landmark,
            nbc_occupancy_group=b.nbc_occupancy_group,
            floors_above_ground=b.floors_above_ground,
            floors_below_ground=b.floors_below_ground,
            total_height_metres=b.total_height_metres,
            plot_area_sqm=b.plot_area_sqm,
            built_up_area_sqm=b.built_up_area_sqm,
            daytime_occupancy=b.daytime_occupancy,
            nighttime_occupancy=b.nighttime_occupancy,
            fire_alarm_make=b.fire_alarm_make,
            sprinkler_system=b.sprinkler_system,
            internal_hydrants=b.internal_hydrants,
            external_hydrants=b.external_hydrants,
            wet_riser=b.wet_riser,
            fire_extinguishers=b.fire_extinguishers,
        ),
        section_b=BuildingSectionB(
            panel_model=b.panel_model,
            detection_zones=b.detection_zones,
            fire_pump_capacity=b.fire_pump_capacity,
            public_address_system=b.public_address_system,
            generator_backup=b.generator_backup,
            amc_vendor=b.amc_vendor,
            amc_valid_till=b.amc_valid_till,
            last_fire_drill=b.last_fire_drill,
            drill_attendance_pct=b.drill_attendance_pct,
            structural_stability=b.structural_stability,
            occupancy_certificate=b.occupancy_certificate,
            architect=b.architect,
            mep_consultant=b.mep_consultant,
            refuge_floors=b.refuge_floors,
            owner_name=b.owner_name,
            owner_contact=b.owner_contact,
        ),
        section_c=BuildingSectionC(
            entry_points=b.entry_points,
            exit_routes=b.exit_routes,
            previous_noc_number=b.previous_noc_number,
            previous_violations=b.previous_violations,
            first_contact_on_site=b.first_contact_on_site,
            last_inspection_date=b.last_inspection_date,
            inspecting_officer=b.inspecting_officer,
        ),
        ug_tank_capacity_litres=b.ug_tank_capacity_litres,
        oh_tank_capacity_litres=b.oh_tank_capacity_litres,
        road_width_metres=b.road_width_metres,
        developer_name=b.developer_name,
        licensed_surveyor=b.licensed_surveyor,
        smoke_detection=b.smoke_detection,
        water_spray_system=b.water_spray_system,
        car_parking_details=b.car_parking_details,
        div_fire_officer=b.div_fire_officer,
        chief_fire_officer=b.chief_fire_officer,
    )


@app.get("/api/buildings/{building_id:path}/station", response_model=FireStationResponse)
async def get_nearest_station(building_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BuildingStationMap).where(BuildingStationMap.building_id == building_id)
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        # Return first station as fallback
        result = await db.execute(select(FireStation).limit(1))
        station = result.scalar_one_or_none()
        if not station:
            raise HTTPException(404, "No fire stations found")
        return station
    
    result = await db.execute(select(FireStation).where(FireStation.id == mapping.fire_station_id))
    station = result.scalar_one_or_none()
    if not station:
        raise HTTPException(404, "Fire station not found")
    return station


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOOR PLANS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/buildings/{building_id:path}/floorplans", response_model=List[FloorPlanItem])
async def get_floor_plans(building_id: str, db: AsyncSession = Depends(get_db)):
    """Get all floor plans for a building."""
    result = await db.execute(
        select(FloorPlan).where(FloorPlan.building_id == building_id).order_by(FloorPlan.id)
    )
    return result.scalars().all()


@app.get("/api/buildings/{building_id:path}/floorplans/floor/{floor_number}")
async def get_floor_plan_for_floor(building_id: str, floor_number: int, db: AsyncSession = Depends(get_db)):
    """
    Get the specific floor plan that covers a given floor number.
    Used during incidents when staff reports fire on a specific floor.
    """
    result = await db.execute(
        select(FloorPlan).where(FloorPlan.building_id == building_id)
    )
    plans = result.scalars().all()
    
    if not plans:
        raise HTTPException(404, "No floor plans found for this building")
    
    # Convert to dicts for the matcher
    plan_dicts = [
        {"id": p.id, "floor_label": p.floor_label, 
         "floor_numbers": json.loads(p.floor_numbers) if p.floor_numbers else [],
         "image_path": p.image_path, "page_number": p.page_number}
        for p in plans
    ]
    
    matched = get_floorplan_for_floor(plan_dicts, floor_number)
    if not matched:
        # Return all plans if no match
        return {"matched": False, "floor_plans": plan_dicts}
    
    return {"matched": True, "floor_plan": matched, "all_floor_plans": plan_dicts}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FIRE STATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/stations", response_model=List[FireStationResponse])
async def list_stations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FireStation))
    return result.scalars().all()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# USERS (Staff + Responders)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/users", response_model=UserResponse)
async def register_user(data: UserRegister, db: AsyncSession = Depends(get_db)):
    user = User(
        name=data.name,
        role=data.role,
        phone=data.phone,
        building_id=data.building_id,
        is_responder=data.is_responder,
        station_id=data.station_id,
        badge_number=data.badge_number,
        rank=data.rank,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@app.post("/api/responder/login", response_model=UserResponse)
async def responder_login(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Fire responder login. Creates or finds existing responder.
    No password for prototype.
    """
    # Check if responder already exists by badge number
    if data.badge_number:
        result = await db.execute(
            select(User).where(User.badge_number == data.badge_number, User.is_responder == True)
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing
    
    # Create new responder
    user = User(
        name=data.name,
        role=data.rank or data.role or "Fire Responder",
        phone=data.phone,
        is_responder=True,
        station_id=data.station_id,
        badge_number=data.badge_number,
        rank=data.rank,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FIRE ALERTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/alerts", response_model=AlertResponse)
async def create_alert(data: AlertCreate, db: AsyncSession = Depends(get_db)):
    # Validate building exists
    result = await db.execute(select(Building).where(Building.building_id == data.building_id))
    building = result.scalar_one_or_none()
    if not building:
        raise HTTPException(404, f"Building {data.building_id} not found")

    # Get reporter info
    result = await db.execute(select(User).where(User.id == data.reported_by))
    reporter = result.scalar_one_or_none()

    alert = FireAlert(
        building_id=data.building_id,
        reported_by=data.reported_by,
        incident_category=data.incident_category,
        alert_type=data.alert_type,
        floor=data.floor,
        floor_number=data.floor_number,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    # Build response with joined data
    response_data = {
        "id": alert.id,
        "building_id": alert.building_id,
        "reported_by": alert.reported_by,
        "created_at": alert.created_at.isoformat(),
        "status": alert.status,
        "incident_category": alert.incident_category,
        "alert_type": alert.alert_type,
        "floor": alert.floor,
        "floor_number": alert.floor_number,
        "building_name": building.name,
        "building_type": building.building_type,
        "is_high_hazard": building.is_high_hazard,
        "ward": building.ward,
        "area_name": building.area_name,
        "reporter_name": reporter.name if reporter else None,
        "reporter_role": reporter.role if reporter else None,
        "reporter_phone": reporter.phone if reporter else None,
    }

    # Broadcast to all stations via WebSocket
    await manager.broadcast_to_all_stations({
        "type": "NEW_ALERT",
        "data": response_data,
    })

    return AlertResponse(**response_data)


@app.get("/api/alerts", response_model=List[AlertResponse])
async def list_alerts(
    status: Optional[str] = None,
    station_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(FireAlert).order_by(FireAlert.created_at.desc())
    if status:
        query = query.where(FireAlert.status == status)

    result = await db.execute(query)
    alerts = result.scalars().all()

    items = []
    for a in alerts:
        # Get building info
        b_result = await db.execute(select(Building).where(Building.building_id == a.building_id))
        building = b_result.scalar_one_or_none()
        # Get reporter info
        r_result = await db.execute(select(User).where(User.id == a.reported_by))
        reporter = r_result.scalar_one_or_none()

        items.append(AlertResponse(
            id=a.id,
            building_id=a.building_id,
            reported_by=a.reported_by,
            created_at=a.created_at,
            status=a.status,
            incident_category=a.incident_category,
            alert_type=a.alert_type,
            floor=a.floor,
            floor_number=a.floor_number,
            building_name=building.name if building else None,
            building_type=building.building_type if building else None,
            is_high_hazard=building.is_high_hazard if building else None,
            ward=building.ward if building else None,
            area_name=building.area_name if building else None,
            reporter_name=reporter.name if reporter else None,
            reporter_role=reporter.role if reporter else None,
            reporter_phone=reporter.phone if reporter else None,
        ))

    return items


@app.patch("/api/alerts/{alert_id}", response_model=AlertResponse)
async def update_alert_status(alert_id: int, data: AlertStatusUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FireAlert).where(FireAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    alert.status = data.status
    await db.commit()
    await db.refresh(alert)

    # Get building and reporter
    b_result = await db.execute(select(Building).where(Building.building_id == alert.building_id))
    building = b_result.scalar_one_or_none()
    r_result = await db.execute(select(User).where(User.id == alert.reported_by))
    reporter = r_result.scalar_one_or_none()

    return AlertResponse(
        id=alert.id,
        building_id=alert.building_id,
        reported_by=alert.reported_by,
        created_at=alert.created_at,
        status=alert.status,
        incident_category=alert.incident_category,
        alert_type=alert.alert_type,
        floor=alert.floor,
        floor_number=alert.floor_number,
        building_name=building.name if building else None,
        building_type=building.building_type if building else None,
        is_high_hazard=building.is_high_hazard if building else None,
        ward=building.ward if building else None,
        area_name=building.area_name if building else None,
        reporter_name=reporter.name if reporter else None,
        reporter_role=reporter.role if reporter else None,
        reporter_phone=reporter.phone if reporter else None,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REAL-TIME UPDATES (with photo upload)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/updates", response_model=RealTimeUpdateResponse)
async def send_update(data: RealTimeUpdateCreate, db: AsyncSession = Depends(get_db)):
    """Send a text-only update."""
    update_obj = RealTimeUpdate(
        alert_id=data.alert_id,
        sent_by=data.sent_by,
        floor_number=data.floor_number,
        affected_area=data.affected_area,
        estimated_occupants=data.estimated_occupants,
        message=data.message,
    )
    db.add(update_obj)
    await db.commit()
    await db.refresh(update_obj)

    # Get sender name
    sender_result = await db.execute(select(User).where(User.id == data.sent_by))
    sender = sender_result.scalar_one_or_none()

    response_data = {
        "id": update_obj.id,
        "alert_id": update_obj.alert_id,
        "sent_by": update_obj.sent_by,
        "floor_number": update_obj.floor_number,
        "affected_area": update_obj.affected_area,
        "estimated_occupants": update_obj.estimated_occupants,
        "message": update_obj.message,
        "photo_url": None,
        "sent_at": update_obj.sent_at.isoformat(),
        "sender_name": sender.name if sender else None,
    }

    # Broadcast via WebSocket
    await manager.broadcast_to_alert(data.alert_id, {
        "type": "REAL_TIME_UPDATE",
        "data": response_data,
    })
    await manager.broadcast_to_all_stations({
        "type": "REAL_TIME_UPDATE",
        "data": response_data,
    })

    return RealTimeUpdateResponse(**response_data)


@app.post("/api/updates/with-photo", response_model=RealTimeUpdateResponse)
async def send_update_with_photo(
    alert_id: int = Form(...),
    sent_by: int = Form(...),
    message: Optional[str] = Form(None),
    floor_number: Optional[int] = Form(None),
    affected_area: Optional[str] = Form(None),
    estimated_occupants: Optional[int] = Form(None),
    photo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Send an update with a photo attachment."""
    # Save photo
    photo_filename = f"alert_{alert_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{photo.filename}"
    photo_path = PHOTOS_DIR / photo_filename
    with open(photo_path, "wb") as f:
        content = await photo.read()
        f.write(content)
    
    relative_photo_path = f"photos/{photo_filename}"

    update_obj = RealTimeUpdate(
        alert_id=alert_id,
        sent_by=sent_by,
        floor_number=floor_number,
        affected_area=affected_area,
        estimated_occupants=estimated_occupants,
        message=message,
        photo_path=relative_photo_path,
    )
    db.add(update_obj)
    await db.commit()
    await db.refresh(update_obj)

    sender_result = await db.execute(select(User).where(User.id == sent_by))
    sender = sender_result.scalar_one_or_none()

    photo_url = f"/static/{relative_photo_path}"

    response_data = {
        "id": update_obj.id,
        "alert_id": update_obj.alert_id,
        "sent_by": update_obj.sent_by,
        "floor_number": update_obj.floor_number,
        "affected_area": update_obj.affected_area,
        "estimated_occupants": update_obj.estimated_occupants,
        "message": update_obj.message,
        "photo_url": photo_url,
        "sent_at": update_obj.sent_at.isoformat(),
        "sender_name": sender.name if sender else None,
    }

    await manager.broadcast_to_alert(alert_id, {"type": "REAL_TIME_UPDATE", "data": response_data})
    await manager.broadcast_to_all_stations({"type": "REAL_TIME_UPDATE", "data": response_data})

    return RealTimeUpdateResponse(**response_data)


@app.get("/api/updates/{alert_id}", response_model=List[RealTimeUpdateResponse])
async def get_updates(alert_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RealTimeUpdate).where(RealTimeUpdate.alert_id == alert_id).order_by(RealTimeUpdate.sent_at)
    )
    updates = result.scalars().all()

    items = []
    for u in updates:
        sender_result = await db.execute(select(User).where(User.id == u.sent_by))
        sender = sender_result.scalar_one_or_none()
        
        photo_url = f"/static/{u.photo_path}" if u.photo_path else None

        items.append(RealTimeUpdateResponse(
            id=u.id,
            alert_id=u.alert_id,
            sent_by=u.sent_by,
            floor_number=u.floor_number,
            affected_area=u.affected_area,
            estimated_occupants=u.estimated_occupants,
            message=u.message,
            photo_url=photo_url,
            sent_at=u.sent_at,
            sender_name=sender.name if sender else None,
        ))
    return items


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NOC UPLOAD + EXTRACTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/noc/upload", response_model=NOCUploadResponse)
async def upload_noc(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a NOC PDF → extract with Gemini → save to database.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are accepted")

    # Save uploaded file
    upload_path = UPLOADS_DIR / f"noc_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    with open(upload_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        # Extract with Gemini
        extracted = await extract_noc_with_gemini(str(upload_path))
        building_data = noc_data_to_building_dict(extracted)
        building_data["noc_pdf_path"] = str(upload_path.relative_to(Path(".")))

        # Geocode the address to get lat/lng
        try:
            coords = await geocode_address(
                building_data.get("address", ""),
                building_data.get("area_name"),
            )
            building_data["latitude"] = coords["latitude"]
            building_data["longitude"] = coords["longitude"]
        except Exception as e:
            print(f"Geocoding failed: {e}")

        # Check if building already exists
        result = await db.execute(
            select(Building).where(Building.building_id == building_data["building_id"])
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing building with new NOC data
            for key, value in building_data.items():
                if value is not None and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing)
            message = f"Building {building_data['building_id']} created from NOC"

        # Auto-assign nearest fire station
        try:
            bid = building_data["building_id"]
            blat = building_data.get("latitude", 0)
            blng = building_data.get("longitude", 0)
            
            # Check if mapping already exists
            existing_map = await db.execute(
                select(BuildingStationMap).where(BuildingStationMap.building_id == bid)
            )
            if not existing_map.scalar_one_or_none():
                # Find nearest station by distance
                stations_result = await db.execute(select(FireStation))
                all_stations = stations_result.scalars().all()
                if all_stations:
                    if blat != 0 and blng != 0:
                        nearest = min(all_stations, key=lambda s: sqrt((s.latitude - blat)**2 + (s.longitude - blng)**2))
                    else:
                        nearest = all_stations[0]
                    mapping = BuildingStationMap(building_id=bid, fire_station_id=nearest.id)
                    db.add(mapping)
                    await db.commit()
        except Exception as e:
            print(f"Auto station mapping failed: {e}")

        # Count non-null extracted fields
        else:
            # Create new building
            # Remove keys that aren't model fields
            model_fields = {c.name for c in Building.__table__.columns}
            filtered_data = {k: v for k, v in building_data.items() if k in model_fields}
            
            building = Building(**filtered_data)
            db.add(building)
            await db.commit()
            await db.refresh(building)
            message = f"Building {building_data['building_id']} created from NOC"

        # Count non-null extracted fields
        fields_extracted = sum(1 for v in extracted.values() if v is not None)

        return NOCUploadResponse(
            success=True,
            building_id=building_data["building_id"],
            building_name=building_data["name"],
            ward=building_data.get("ward"),
            area_name=building_data.get("area_name"),
            fields_extracted=fields_extracted,
            message=message,
        )

    except Exception as e:
        raise HTTPException(500, f"NOC extraction failed: {str(e)}")

@app.get("/api/noc/pdf/{building_id:path}")
async def get_noc_pdf(building_id: str, db: AsyncSession = Depends(get_db)):
    """Serve the original NOC PDF file for viewing."""
    result = await db.execute(select(Building).where(Building.building_id == building_id))
    building = result.scalar_one_or_none()
    if not building or not building.noc_pdf_path:
        raise HTTPException(404, "NOC PDF not found")
    
    pdf_path = Path(building.noc_pdf_path)
    if not pdf_path.exists():
        raise HTTPException(404, "NOC PDF file missing from disk")
    
    from fastapi.responses import FileResponse
    return FileResponse(str(pdf_path), media_type="application/pdf", filename=f"NOC_{building_id.replace('/', '_')}.pdf")

@app.post("/api/noc/upload/{building_id:path}/floorplan", response_model=FloorplanUploadResponse)
async def upload_floorplan(
    building_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a floorplan PDF for a specific building.
    Processes with Gemini Vision to identify and crop individual floor plans.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Only PDF files are accepted")

    # Verify building exists
    result = await db.execute(select(Building).where(Building.building_id == building_id))
    building = result.scalar_one_or_none()
    if not building:
        raise HTTPException(404, f"Building {building_id} not found. Upload the NOC document first.")

    # Save uploaded file
    safe_id = building_id.replace("/", "_").replace(" ", "_")
    upload_path = UPLOADS_DIR / f"floorplan_{safe_id}_{file.filename}"
    with open(upload_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Update building record
    building.floorplan_pdf_path = str(upload_path.relative_to(Path(".")))
    
    try:
        # Process with Gemini Vision
        floor_plans = await process_floorplan_pdf(str(upload_path), building_id)

        # Delete existing floor plans for this building
        await db.execute(delete(FloorPlan).where(FloorPlan.building_id == building_id))

        # Save new floor plans
        db_plans = []
        for plan in floor_plans:
            fp = FloorPlan(
                building_id=building_id,
                floor_label=plan["floor_label"],
                floor_numbers=json.dumps(plan["floor_numbers"]),
                image_path=plan["image_path"],
                page_number=plan["page_number"],
            )
            db.add(fp)
            db_plans.append(fp)

        await db.commit()

        # Refresh to get IDs
        plan_items = []
        for fp in db_plans:
            await db.refresh(fp)
            plan_items.append(FloorPlanItem(
                id=fp.id, floor_label=fp.floor_label, floor_numbers=fp.floor_numbers,
                image_path=fp.image_path, page_number=fp.page_number,
            ))

        return FloorplanUploadResponse(
            success=True,
            building_id=building_id,
            floor_plans_extracted=len(plan_items),
            floor_plans=plan_items,
            message=f"Extracted {len(plan_items)} floor plans from {file.filename}",
        )

    except Exception as e:
        raise HTTPException(500, f"Floorplan processing failed: {str(e)}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NOC SEARCH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/noc/search")
async def search_noc(
    q: Optional[str] = None,
    hazard_only: bool = False,
    expired_only: bool = False,
    ward: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Building)

    if q:
        search = f"%{q}%"
        query = query.where(
            Building.building_id.ilike(search) |
            Building.name.ilike(search) |
            Building.address.ilike(search) |
            Building.building_type.ilike(search) |
            Building.area_name.ilike(search) |
            Building.ward.ilike(search) |
            Building.file_number.ilike(search)
        )

    if hazard_only:
        query = query.where(Building.is_high_hazard == True)
    
    if ward:
        query = query.where(Building.ward.ilike(f"%{ward}%"))

    result = await db.execute(query.order_by(Building.building_id))
    buildings = result.scalars().all()

    items = []
    now = date.today()
    for b in buildings:
        noc_expired = b.noc_valid_till < now if b.noc_valid_till else False
        if expired_only and not noc_expired:
            continue
        items.append({
            "building_id": b.building_id,
            "name": b.name,
            "building_type": b.building_type,
            "address": b.address,
            "ward": b.ward,
            "area_name": b.area_name,
            "floors_above_ground": b.floors_above_ground,
            "daytime_occupancy": b.daytime_occupancy,
            "noc_valid_till": b.noc_valid_till.isoformat() if b.noc_valid_till else None,
            "noc_expired": noc_expired,
            "is_high_hazard": b.is_high_hazard,
        })

    return items


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WEBSOCKET ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.websocket("/ws/station/{station_id}")
async def station_ws(websocket: WebSocket, station_id: int):
    await manager.connect_station(station_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_station(station_id, websocket)


@app.websocket("/ws/alert/{alert_id}")
async def alert_ws(websocket: WebSocket, alert_id: int):
    await manager.connect_alert(alert_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_alert(alert_id, websocket)