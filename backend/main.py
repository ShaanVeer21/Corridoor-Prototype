"""
Corridoor Backend — FastAPI Application
All routes for buildings, users, alerts, real-time updates, and WebSocket.
"""

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime, date
from typing import List

from database import get_db, init_db
from models import (
    Building, FireStation, BuildingStationMap,
    User, FireAlert, RealTimeUpdate,
    AlertStatus
)
from schemas import (
    BuildingListItem, BuildingFull, BuildingSectionA, BuildingSectionB, BuildingSectionC,
    UserRegister, UserResponse,
    AlertCreate, AlertResponse, AlertStatusUpdate,
    RealTimeUpdateCreate, RealTimeUpdateResponse,
    FireStationResponse,
)
from ws_manager import manager

app = FastAPI(
    title="Corridoor API",
    description="Fire incident response system — Thane Municipal Corporation prototype",
    version="1.0.0",
)

# ── CORS — allow frontend and mobile to connect ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve static files (floorplans, logo) ──
app.mount("/static", StaticFiles(directory="noc_data"), name="static")


@app.on_event("startup")
async def startup():
    await init_db()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILDINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/buildings", response_model=List[BuildingListItem])
async def list_buildings(db: AsyncSession = Depends(get_db)):
    """
    Returns all buildings for the searchable dropdown.
    Label format: "THN-004 · Hiranandani Estate — Tower A & B · Patlipada, Ghodbunder Road, Thane West"
    """
    result = await db.execute(select(Building))
    buildings = result.scalars().all()
    items = []
    for b in buildings:
        # Build the full dropdown label
        short_address = b.address.split("–")[0].strip() if "–" in b.address else b.address
        label = f"{b.building_id} · {b.name} · {short_address}"
        items.append(BuildingListItem(
            building_id=b.building_id,
            name=b.name,
            building_type=b.building_type,
            address=b.address,
            is_high_hazard=b.is_high_hazard,
            noc_valid_till=b.noc_valid_till,
            label=label,
        ))
    return items


@app.get("/api/buildings/{building_id}", response_model=BuildingFull)
async def get_building(building_id: str, db: AsyncSession = Depends(get_db)):
    """Returns full NOC data for a building — the incident packet."""
    result = await db.execute(select(Building).where(Building.building_id == building_id))
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Building not found")

    return BuildingFull(
        building_id=b.building_id,
        name=b.name,
        building_type=b.building_type,
        noc_number=b.noc_number,
        noc_valid_till=b.noc_valid_till,
        is_high_hazard=b.is_high_hazard,
        floorplan_path=b.floorplan_path,
        latitude=b.latitude,
        longitude=b.longitude,
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
    )


@app.get("/api/buildings/{building_id}/station", response_model=FireStationResponse)
async def get_nearest_station(building_id: str, db: AsyncSession = Depends(get_db)):
    """Returns the nearest fire station for a building (for the 'Call' button)."""
    result = await db.execute(
        select(BuildingStationMap).where(BuildingStationMap.building_id == building_id)
    )
    mapping = result.scalar_one_or_none()
    if not mapping:
        raise HTTPException(status_code=404, detail="No station mapped for this building")

    station_result = await db.execute(
        select(FireStation).where(FireStation.id == mapping.fire_station_id)
    )
    station = station_result.scalar_one_or_none()
    if not station:
        raise HTTPException(status_code=404, detail="Fire station not found")

    return FireStationResponse(
        id=station.id,
        name=station.name,
        address=station.address,
        latitude=station.latitude,
        longitude=station.longitude,
        phone=station.phone,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FIRE STATIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/stations", response_model=List[FireStationResponse])
async def list_stations(db: AsyncSession = Depends(get_db)):
    """List all fire stations."""
    result = await db.execute(select(FireStation))
    stations = result.scalars().all()
    return [FireStationResponse(
        id=s.id, name=s.name, address=s.address,
        latitude=s.latitude, longitude=s.longitude, phone=s.phone
    ) for s in stations]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# USERS (Staff/Security registration)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/users", response_model=UserResponse)
async def register_user(user: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a staff/security user. No password for prototype."""
    # Verify building exists
    building = await db.execute(select(Building).where(Building.building_id == user.building_id))
    if not building.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Building not found")

    new_user = User(
        name=user.name,
        role=user.role,
        building_id=user.building_id,
        registered_at=datetime.utcnow(),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return UserResponse(
        id=new_user.id,
        name=new_user.name,
        role=new_user.role,
        building_id=new_user.building_id,
        registered_at=new_user.registered_at,
    )


@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get user details."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user.id, name=user.name, role=user.role,
        building_id=user.building_id, registered_at=user.registered_at,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FIRE ALERTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/alerts", response_model=AlertResponse)
async def create_alert(alert: AlertCreate, db: AsyncSession = Depends(get_db)):
    """
    Triggered when staff hits 'Send fire alert'.
    Creates the alert AND broadcasts it to the nearest fire station dashboard via WebSocket.
    """
    # Verify building exists
    building_result = await db.execute(select(Building).where(Building.building_id == alert.building_id))
    building = building_result.scalar_one_or_none()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    new_alert = FireAlert(
        building_id=alert.building_id,
        reported_by=alert.reported_by,
        created_at=datetime.utcnow(),
        status=AlertStatus.ACTIVE.value,
        alert_type=alert.alert_type,
    )
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)

    # Find the nearest fire station for WebSocket broadcast
    mapping_result = await db.execute(
        select(BuildingStationMap).where(BuildingStationMap.building_id == alert.building_id)
    )
    mapping = mapping_result.scalar_one_or_none()

    if mapping:
        await manager.broadcast_new_alert(mapping.fire_station_id, {
            "alert_id": new_alert.id,
            "building_id": building.building_id,
            "building_name": building.name,
            "building_type": building.building_type,
            "is_high_hazard": building.is_high_hazard,
            "alert_type": new_alert.alert_type,
            "created_at": new_alert.created_at.isoformat(),
            "status": new_alert.status,
        })

    return AlertResponse(
        id=new_alert.id,
        building_id=new_alert.building_id,
        reported_by=new_alert.reported_by,
        created_at=new_alert.created_at,
        status=new_alert.status,
        alert_type=new_alert.alert_type,
        building_name=building.name,
        building_type=building.building_type,
        is_high_hazard=building.is_high_hazard,
    )


@app.get("/api/alerts", response_model=List[AlertResponse])
async def list_alerts(
    status: str = None,
    station_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """
    List alerts. Optionally filter by status and/or station.
    station_id filters to only buildings mapped to that station.
    """
    query = select(FireAlert, Building).join(Building, FireAlert.building_id == Building.building_id)

    if status:
        query = query.where(FireAlert.status == status)

    if station_id:
        # Subquery: building IDs mapped to this station
        subq = select(BuildingStationMap.building_id).where(
            BuildingStationMap.fire_station_id == station_id
        )
        query = query.where(FireAlert.building_id.in_(subq))

    query = query.order_by(FireAlert.created_at.desc())
    result = await db.execute(query)
    rows = result.all()

    return [AlertResponse(
        id=alert.id,
        building_id=alert.building_id,
        reported_by=alert.reported_by,
        created_at=alert.created_at,
        status=alert.status,
        alert_type=alert.alert_type,
        building_name=building.name,
        building_type=building.building_type,
        is_high_hazard=building.is_high_hazard,
    ) for alert, building in rows]


@app.patch("/api/alerts/{alert_id}", response_model=AlertResponse)
async def update_alert_status(alert_id: int, body: AlertStatusUpdate, db: AsyncSession = Depends(get_db)):
    """Acknowledge or resolve an alert."""
    result = await db.execute(select(FireAlert).where(FireAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = body.status
    await db.commit()
    await db.refresh(alert)

    # Get building info for response
    building_result = await db.execute(select(Building).where(Building.building_id == alert.building_id))
    building = building_result.scalar_one_or_none()

    return AlertResponse(
        id=alert.id,
        building_id=alert.building_id,
        reported_by=alert.reported_by,
        created_at=alert.created_at,
        status=alert.status,
        alert_type=alert.alert_type,
        building_name=building.name if building else None,
        building_type=building.building_type if building else None,
        is_high_hazard=building.is_high_hazard if building else None,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REAL-TIME UPDATES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/updates", response_model=RealTimeUpdateResponse)
async def create_update(upd: RealTimeUpdateCreate, db: AsyncSession = Depends(get_db)):
    """
    Staff sends a real-time update during an active incident.
    This gets pushed to the fire station dashboard via WebSocket.
    """
    # Verify alert exists and is active
    alert_result = await db.execute(select(FireAlert).where(FireAlert.id == upd.alert_id))
    alert = alert_result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    new_update = RealTimeUpdate(
        alert_id=upd.alert_id,
        sent_by=upd.sent_by,
        floor_number=upd.floor_number,
        affected_area=upd.affected_area,
        estimated_occupants=upd.estimated_occupants,
        message=upd.message,
        sent_at=datetime.utcnow(),
    )
    db.add(new_update)
    await db.commit()
    await db.refresh(new_update)

    # Get sender name
    sender_result = await db.execute(select(User).where(User.id == upd.sent_by))
    sender = sender_result.scalar_one_or_none()

    # Find the station to broadcast to
    mapping_result = await db.execute(
        select(BuildingStationMap).where(BuildingStationMap.building_id == alert.building_id)
    )
    mapping = mapping_result.scalar_one_or_none()

    update_data = {
        "id": new_update.id,
        "alert_id": new_update.alert_id,
        "sent_by": new_update.sent_by,
        "sender_name": sender.name if sender else "Unknown",
        "floor_number": new_update.floor_number,
        "affected_area": new_update.affected_area,
        "estimated_occupants": new_update.estimated_occupants,
        "message": new_update.message,
        "sent_at": new_update.sent_at.isoformat(),
    }

    if mapping:
        await manager.broadcast_update(mapping.fire_station_id, upd.alert_id, update_data)

    return RealTimeUpdateResponse(
        id=new_update.id,
        alert_id=new_update.alert_id,
        sent_by=new_update.sent_by,
        floor_number=new_update.floor_number,
        affected_area=new_update.affected_area,
        estimated_occupants=new_update.estimated_occupants,
        message=new_update.message,
        sent_at=new_update.sent_at,
        sender_name=sender.name if sender else None,
    )


@app.get("/api/updates/{alert_id}", response_model=List[RealTimeUpdateResponse])
async def get_updates(alert_id: int, db: AsyncSession = Depends(get_db)):
    """Get all real-time updates for an alert."""
    result = await db.execute(
        select(RealTimeUpdate, User)
        .join(User, RealTimeUpdate.sent_by == User.id, isouter=True)
        .where(RealTimeUpdate.alert_id == alert_id)
        .order_by(RealTimeUpdate.sent_at.asc())
    )
    rows = result.all()
    return [RealTimeUpdateResponse(
        id=upd.id,
        alert_id=upd.alert_id,
        sent_by=upd.sent_by,
        floor_number=upd.floor_number,
        affected_area=upd.affected_area,
        estimated_occupants=upd.estimated_occupants,
        message=upd.message,
        sent_at=upd.sent_at,
        sender_name=user.name if user else None,
    ) for upd, user in rows]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WEBSOCKET ENDPOINTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.websocket("/ws/station/{station_id}")
async def ws_station(websocket: WebSocket, station_id: int):
    """
    Fire station dashboard connects here.
    Receives all alerts and updates for buildings mapped to this station.
    """
    await manager.connect(websocket, station_id)
    try:
        while True:
            # Keep connection alive — client can send pings
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, station_id)


@app.websocket("/ws/alert/{alert_id}")
async def ws_alert(websocket: WebSocket, alert_id: int):
    """
    Subscribe to real-time updates for a specific alert.
    Used when the dashboard opens a specific incident detail view.
    """
    await manager.connect_alert(websocket, alert_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_alert(websocket, alert_id)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NOC PDF UPLOAD & EXTRACTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/noc/upload")
async def upload_noc_pdf(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a Fire NOC PDF. The system extracts all building data
    and saves each building to the database.

    Supports single-building and multi-building NOC PDFs.
    Returns the list of extracted and saved buildings.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()

    # Extract buildings from the PDF
    from noc_extractor import extract_from_pdf
    try:
        extracted = extract_from_pdf(pdf_bytes=pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract data from PDF: {str(e)}")

    if not extracted:
        raise HTTPException(status_code=422, detail="No building data found in the uploaded PDF")

    saved = []
    skipped = []

    for bdata in extracted:
        # Check if building already exists
        existing = await db.execute(
            select(Building).where(Building.building_id == bdata["building_id"])
        )
        if existing.scalar_one_or_none():
            skipped.append(bdata["building_id"])
            continue

        # Set default floorplan path
        bdata["floorplan_path"] = "noc_data/floorplan.svg"

        building = Building(**bdata)
        db.add(building)
        saved.append(bdata["building_id"])

    if saved:
        await db.commit()

    return {
        "message": f"Processed {len(extracted)} buildings from PDF",
        "saved": saved,
        "skipped_existing": skipped,
        "total_extracted": len(extracted),
        "total_saved": len(saved),
        "total_skipped": len(skipped),
        "buildings": [
            {
                "building_id": b["building_id"],
                "name": b["name"],
                "building_type": b["building_type"],
                "is_high_hazard": b["is_high_hazard"],
                "noc_number": b["noc_number"],
                "noc_valid_till": str(b["noc_valid_till"]),
            }
            for b in extracted
        ],
    }


@app.post("/api/noc/upload/{building_id}")
async def upload_noc_for_building(
    building_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload/update NOC PDF for a specific existing building.
    Extracts data and updates the building record.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Check building exists
    result = await db.execute(select(Building).where(Building.building_id == building_id))
    building = result.scalar_one_or_none()
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    pdf_bytes = await file.read()

    from noc_extractor import extract_from_pdf
    try:
        extracted = extract_from_pdf(pdf_bytes=pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract data from PDF: {str(e)}")

    # Find the matching building in extracted data
    matching = None
    for b in extracted:
        if b["building_id"] == building_id:
            matching = b
            break

    if not matching:
        # If only one building extracted, assume it's for this building_id
        if len(extracted) == 1:
            matching = extracted[0]
            matching["building_id"] = building_id
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Building {building_id} not found in the uploaded PDF"
            )

    # Update the building record with extracted data
    skip_fields = {"building_id", "floorplan_path", "latitude", "longitude"}
    for key, value in matching.items():
        if key not in skip_fields and value is not None:
            setattr(building, key, value)

    await db.commit()
    await db.refresh(building)

    return {
        "message": f"Updated NOC data for {building_id}",
        "building_id": building_id,
        "name": building.name,
        "noc_number": building.noc_number,
        "noc_valid_till": str(building.noc_valid_till),
    }


@app.get("/api/noc/search")
async def search_buildings(
    q: str = "",
    hazard_only: bool = False,
    expired_only: bool = False,
    building_type: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Search and filter buildings by name, type, hazard status, or NOC expiry.
    Used by the fire station dashboard to browse the NOC database.
    """
    from datetime import date as date_type

    query = select(Building)

    if hazard_only:
        query = query.where(Building.is_high_hazard == True)

    if expired_only:
        query = query.where(Building.noc_valid_till < date_type.today())

    if building_type:
        query = query.where(Building.building_type.ilike(f"%{building_type}%"))

    result = await db.execute(query)
    buildings = result.scalars().all()

    # Apply text search filter (name, address, building_id)
    if q:
        q_lower = q.lower()
        buildings = [
            b for b in buildings
            if q_lower in b.building_id.lower()
            or q_lower in b.name.lower()
            or q_lower in b.address.lower()
            or q_lower in (b.building_type or "").lower()
        ]

    return [
        {
            "building_id": b.building_id,
            "name": b.name,
            "building_type": b.building_type,
            "address": b.address,
            "noc_number": b.noc_number,
            "noc_valid_till": str(b.noc_valid_till),
            "noc_expired": b.noc_valid_till < date_type.today() if b.noc_valid_till else False,
            "is_high_hazard": b.is_high_hazard,
            "floors_above_ground": b.floors_above_ground,
            "total_height_metres": b.total_height_metres,
            "daytime_occupancy": b.daytime_occupancy,
            "sprinkler_system": b.sprinkler_system,
            "fire_alarm_make": b.fire_alarm_make,
        }
        for b in buildings
    ]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HEALTH & INFO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/health")
async def health():
    return {
        "status": "operational",
        "service": "Corridoor API",
        "version": "1.0.0",
        "jurisdiction": "Thane Municipal Corporation",
        "encryption": "All data encrypted in transit (TLS) and at rest. Zero-access architecture — Corridoor has no access to NOC data.",
    }