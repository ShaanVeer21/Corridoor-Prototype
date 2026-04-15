"""
Pydantic schemas for API request/response validation.
"""

from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


# ── Building schemas ──

class BuildingListItem(BaseModel):
    """For the searchable dropdown on mobile app."""
    building_id: str
    name: str
    building_type: str
    address: str
    is_high_hazard: bool
    noc_valid_till: date
    label: str  # Full dropdown string: "THN-004 · Hiranandani Estate — Tower A & B · Patlipada, Ghodbunder Road"

    class Config:
        from_attributes = True


class BuildingSectionA(BaseModel):
    """NOC submission data."""
    address: str
    nearest_landmark: Optional[str]
    nbc_occupancy_group: str
    floors_above_ground: int
    floors_below_ground: int
    total_height_metres: float
    plot_area_sqm: Optional[float]
    built_up_area_sqm: Optional[float]
    daytime_occupancy: int
    nighttime_occupancy: int
    fire_alarm_make: str
    sprinkler_system: str
    internal_hydrants: int
    external_hydrants: int
    wet_riser: Optional[str]
    fire_extinguishers: Optional[str]


class BuildingSectionB(BaseModel):
    """Installation certificates & building file."""
    panel_model: Optional[str]
    detection_zones: Optional[int]
    fire_pump_capacity: Optional[str]
    public_address_system: Optional[str]
    generator_backup: Optional[str]
    amc_vendor: Optional[str]
    amc_valid_till: Optional[date]
    last_fire_drill: Optional[date]
    drill_attendance_pct: Optional[int]
    structural_stability: bool
    occupancy_certificate: Optional[str]
    architect: Optional[str]
    mep_consultant: Optional[str]
    refuge_floors: Optional[str]
    owner_name: Optional[str]
    owner_contact: Optional[str]


class BuildingSectionC(BaseModel):
    """Access routes & compliance history."""
    entry_points: Optional[str]
    exit_routes: Optional[str]
    previous_noc_number: Optional[str]
    previous_violations: Optional[str]
    first_contact_on_site: Optional[str]
    last_inspection_date: Optional[date]
    inspecting_officer: Optional[str]


class BuildingFull(BaseModel):
    """Complete NOC data — sent to fire station dashboard on alert."""
    building_id: str
    name: str
    building_type: str
    noc_number: str
    noc_valid_till: date
    is_high_hazard: bool
    floorplan_path: Optional[str]
    latitude: float
    longitude: float
    section_a: BuildingSectionA
    section_b: BuildingSectionB
    section_c: BuildingSectionC

    class Config:
        from_attributes = True


# ── User schemas ──

class UserRegister(BaseModel):
    """Staff registration — no password for prototype."""
    name: str
    role: str  # "security", "manager", "staff"
    building_id: str


class UserResponse(BaseModel):
    id: int
    name: str
    role: str
    building_id: str
    registered_at: datetime

    class Config:
        from_attributes = True


# ── Fire Alert schemas ──

class AlertCreate(BaseModel):
    """Triggered when staff hits 'Send fire alert'."""
    building_id: str
    reported_by: int  # user id
    alert_type: str = "fire"


class AlertResponse(BaseModel):
    id: int
    building_id: str
    reported_by: int
    created_at: datetime
    status: str
    alert_type: str
    building_name: Optional[str] = None
    building_type: Optional[str] = None
    is_high_hazard: Optional[bool] = None

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    """For acknowledging or resolving an alert."""
    status: str  # "acknowledged" or "resolved"


# ── Real-time Update schemas ──

class RealTimeUpdateCreate(BaseModel):
    """Live update sent by staff during an incident."""
    alert_id: int
    sent_by: int  # user id
    floor_number: Optional[int] = None
    affected_area: Optional[str] = None
    estimated_occupants: Optional[int] = None
    message: Optional[str] = None


class RealTimeUpdateResponse(BaseModel):
    id: int
    alert_id: int
    sent_by: int
    floor_number: Optional[int]
    affected_area: Optional[str]
    estimated_occupants: Optional[int]
    message: Optional[str]
    sent_at: datetime
    sender_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Fire Station schemas ──

class FireStationResponse(BaseModel):
    id: int
    name: str
    address: str
    latitude: float
    longitude: float
    phone: str

    class Config:
        from_attributes = True