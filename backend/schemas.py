"""
Corridoor v2 — Pydantic Schemas
Updated for new model fields: incident categories, floor plans, 
photo uploads, responder login, multilingual, ward/area.
"""

from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List


# ── Building schemas ──

class BuildingListItem(BaseModel):
    """For searchable dropdowns and building lists."""
    building_id: str
    name: str
    building_type: str
    address: str
    ward: Optional[str] = None
    area_name: Optional[str] = None
    is_high_hazard: bool
    noc_valid_till: Optional[date] = None
    floors_above_ground: int = 0
    floors_below_ground: int = 0
    total_height_metres: float = 0.0
    daytime_occupancy: int = 0
    latitude: float = 0.0
    longitude: float = 0.0
    label: str  # Display string: "P-29345/2026 · Building Name · Area"

    class Config:
        from_attributes = True


class FloorPlanItem(BaseModel):
    """Individual floor plan metadata."""
    id: int
    floor_label: str
    floor_numbers: str  # JSON array string e.g. "[0]" or "[3,4,5,6]"
    image_path: str
    page_number: int = 0

    class Config:
        from_attributes = True


class BuildingSectionA(BaseModel):
    """NOC submission data."""
    address: str
    nearest_landmark: Optional[str] = None
    nbc_occupancy_group: str
    floors_above_ground: int
    floors_below_ground: int
    total_height_metres: float
    plot_area_sqm: Optional[float] = None
    built_up_area_sqm: Optional[float] = None
    daytime_occupancy: int
    nighttime_occupancy: int
    fire_alarm_make: str
    sprinkler_system: str
    internal_hydrants: int
    external_hydrants: int
    wet_riser: Optional[str] = None
    fire_extinguishers: Optional[str] = None


class BuildingSectionB(BaseModel):
    """Installation certificates & building file."""
    panel_model: Optional[str] = None
    detection_zones: Optional[int] = None
    fire_pump_capacity: Optional[str] = None
    public_address_system: Optional[str] = None
    generator_backup: Optional[str] = None
    amc_vendor: Optional[str] = None
    amc_valid_till: Optional[date] = None
    last_fire_drill: Optional[date] = None
    drill_attendance_pct: Optional[int] = None
    structural_stability: bool = True
    occupancy_certificate: Optional[str] = None
    architect: Optional[str] = None
    mep_consultant: Optional[str] = None
    refuge_floors: Optional[str] = None
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None


class BuildingSectionC(BaseModel):
    """Access routes & compliance history."""
    entry_points: Optional[str] = None
    exit_routes: Optional[str] = None
    previous_noc_number: Optional[str] = None
    previous_violations: Optional[str] = None
    first_contact_on_site: Optional[str] = None
    last_inspection_date: Optional[date] = None
    inspecting_officer: Optional[str] = None


class BuildingFull(BaseModel):
    """Complete building data — sent to fire station on alert."""
    building_id: str
    name: str
    name_mr: Optional[str] = None
    name_hi: Optional[str] = None
    building_type: str
    ward: Optional[str] = None
    area_name: Optional[str] = None
    file_number: Optional[str] = None
    noc_number: str
    noc_valid_till: Optional[date] = None
    noc_type: Optional[str] = None
    is_high_hazard: bool
    latitude: float
    longitude: float
    floor_wise_usage: Optional[str] = None
    floor_plans: List[FloorPlanItem] = []
    section_a: BuildingSectionA
    section_b: BuildingSectionB
    section_c: BuildingSectionC

    # Additional NOC data
    ug_tank_capacity_litres: Optional[int] = None
    oh_tank_capacity_litres: Optional[int] = None
    road_width_metres: Optional[float] = None
    developer_name: Optional[str] = None
    licensed_surveyor: Optional[str] = None
    smoke_detection: Optional[str] = None
    water_spray_system: Optional[str] = None
    car_parking_details: Optional[str] = None
    div_fire_officer: Optional[str] = None
    chief_fire_officer: Optional[str] = None

    class Config:
        from_attributes = True


# ── User schemas ──

class UserRegister(BaseModel):
    """Staff registration."""
    name: str
    role: str
    phone: Optional[str] = None
    building_id: Optional[str] = None  # null for responders
    # Responder fields
    is_responder: bool = False
    station_id: Optional[int] = None
    badge_number: Optional[str] = None
    rank: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    name: str
    role: str
    phone: Optional[str] = None
    building_id: Optional[str] = None
    is_responder: bool = False
    station_id: Optional[int] = None
    badge_number: Optional[str] = None
    rank: Optional[str] = None
    registered_at: datetime

    class Config:
        from_attributes = True


# ── Fire Alert schemas ──

class AlertCreate(BaseModel):
    """Triggered when staff sends an alert."""
    building_id: str
    reported_by: int  # user id
    incident_category: str = "fire"  # fire, rescue, collapse, other
    alert_type: str = "fire"  # Free text description for 'other'
    floor: Optional[str] = None  # e.g. "Floor 5", "Basement 1", "Ground Floor"
    floor_number: Optional[int] = None  # Parsed integer: 5, -1, 0


class AlertResponse(BaseModel):
    id: int
    building_id: str
    reported_by: int
    created_at: datetime
    status: str
    incident_category: str
    alert_type: str
    floor: Optional[str] = None
    floor_number: Optional[int] = None
    # Joined fields
    building_name: Optional[str] = None
    building_type: Optional[str] = None
    is_high_hazard: Optional[bool] = None
    ward: Optional[str] = None
    area_name: Optional[str] = None
    # Reporter info
    reporter_name: Optional[str] = None
    reporter_role: Optional[str] = None
    reporter_phone: Optional[str] = None

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    """For acknowledging or resolving an alert."""
    status: str  # "acknowledged" or "resolved"


# ── Real-time Update schemas ──

class RealTimeUpdateCreate(BaseModel):
    """Live update sent by staff during an incident."""
    alert_id: int
    sent_by: int
    floor_number: Optional[int] = None
    affected_area: Optional[str] = None
    estimated_occupants: Optional[int] = None
    message: Optional[str] = None
    # Photo is handled separately via multipart form upload


class RealTimeUpdateResponse(BaseModel):
    id: int
    alert_id: int
    sent_by: int
    floor_number: Optional[int] = None
    affected_area: Optional[str] = None
    estimated_occupants: Optional[int] = None
    message: Optional[str] = None
    photo_url: Optional[str] = None  # Full URL to photo
    sent_at: datetime
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Fire Station schemas ──

class FireStationResponse(BaseModel):
    id: int
    name: str
    name_mr: Optional[str] = None
    name_hi: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    phone: str

    class Config:
        from_attributes = True


# ── NOC Upload Response ──

class NOCUploadResponse(BaseModel):
    """Response after uploading and extracting a NOC PDF."""
    success: bool
    building_id: str
    building_name: str
    ward: Optional[str] = None
    area_name: Optional[str] = None
    fields_extracted: int
    message: str


class FloorplanUploadResponse(BaseModel):
    """Response after uploading and processing a floorplan PDF."""
    success: bool
    building_id: str
    floor_plans_extracted: int
    floor_plans: List[FloorPlanItem]
    message: str