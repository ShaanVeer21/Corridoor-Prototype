"""
Corridoor v2 — Database Models
Updated schema with:
- BMC file number as building ID
- Ward, area, floor-wise usage
- Floor plans table (per-floor cropped images)
- Incident categories (fire/rescue/collapse/other)
- Photo uploads in live updates
- Reporter info on alerts
- Multilingual name fields
"""

from datetime import datetime, date
from sqlalchemy import (
    String, Integer, Float, Boolean, Text, Date, DateTime,
    ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


# ── Enums ──

class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class IncidentCategory(str, enum.Enum):
    FIRE = "fire"
    RESCUE = "rescue"
    COLLAPSE = "collapse"
    OTHER = "other"


# ── Table 1: buildings ──

class Building(Base):
    __tablename__ = "buildings"

    building_id: Mapped[str] = mapped_column(String(50), primary_key=True)  # BMC file number e.g. P-29345/2026
    name: Mapped[str] = mapped_column(String(300))
    name_mr: Mapped[str] = mapped_column(String(300), nullable=True)  # Marathi
    name_hi: Mapped[str] = mapped_column(String(300), nullable=True)  # Hindi
    building_type: Mapped[str] = mapped_column(String(200))
    
    # Location metadata
    ward: Mapped[str] = mapped_column(String(20), nullable=True)  # e.g. "N Ward"
    area_name: Mapped[str] = mapped_column(String(100), nullable=True)  # e.g. "Ghatkopar"
    file_number: Mapped[str] = mapped_column(String(200), nullable=True)  # Full BMC file number
    cts_number: Mapped[str] = mapped_column(String(100), nullable=True)

    # Section A — NOC submission data
    address: Mapped[str] = mapped_column(Text)
    address_mr: Mapped[str] = mapped_column(Text, nullable=True)
    address_hi: Mapped[str] = mapped_column(Text, nullable=True)
    nearest_landmark: Mapped[str] = mapped_column(Text, nullable=True)
    nbc_occupancy_group: Mapped[str] = mapped_column(String(100))
    floors_above_ground: Mapped[int] = mapped_column(Integer)
    floors_below_ground: Mapped[int] = mapped_column(Integer, default=0)
    total_height_metres: Mapped[float] = mapped_column(Float)
    plot_area_sqm: Mapped[float] = mapped_column(Float, nullable=True)
    built_up_area_sqm: Mapped[float] = mapped_column(Float, nullable=True)
    daytime_occupancy: Mapped[int] = mapped_column(Integer, default=0)
    nighttime_occupancy: Mapped[int] = mapped_column(Integer, default=0)
    fire_alarm_make: Mapped[str] = mapped_column(String(300))
    sprinkler_system: Mapped[str] = mapped_column(String(300))
    internal_hydrants: Mapped[int] = mapped_column(Integer, default=0)
    external_hydrants: Mapped[int] = mapped_column(Integer, default=0)
    wet_riser: Mapped[str] = mapped_column(String(300), nullable=True)
    fire_extinguishers: Mapped[str] = mapped_column(Text, nullable=True)

    # Section B — Installation certificates & building file
    panel_model: Mapped[str] = mapped_column(String(200), nullable=True)
    detection_zones: Mapped[int] = mapped_column(Integer, nullable=True)
    fire_pump_capacity: Mapped[str] = mapped_column(String(300), nullable=True)
    public_address_system: Mapped[str] = mapped_column(String(300), nullable=True)
    generator_backup: Mapped[str] = mapped_column(String(300), nullable=True)
    amc_vendor: Mapped[str] = mapped_column(String(200), nullable=True)
    amc_valid_till: Mapped[date] = mapped_column(Date, nullable=True)
    last_fire_drill: Mapped[date] = mapped_column(Date, nullable=True)
    drill_attendance_pct: Mapped[int] = mapped_column(Integer, nullable=True)
    structural_stability: Mapped[bool] = mapped_column(Boolean, default=True)
    occupancy_certificate: Mapped[str] = mapped_column(String(100), nullable=True)
    architect: Mapped[str] = mapped_column(String(200), nullable=True)
    mep_consultant: Mapped[str] = mapped_column(String(200), nullable=True)
    refuge_floors: Mapped[str] = mapped_column(String(300), nullable=True)
    owner_name: Mapped[str] = mapped_column(String(200), nullable=True)
    owner_contact: Mapped[str] = mapped_column(String(100), nullable=True)

    # Section C — Access routes & compliance
    entry_points: Mapped[str] = mapped_column(Text, nullable=True)
    exit_routes: Mapped[str] = mapped_column(Text, nullable=True)
    previous_noc_number: Mapped[str] = mapped_column(String(50), nullable=True)
    previous_violations: Mapped[str] = mapped_column(Text, nullable=True)
    first_contact_on_site: Mapped[str] = mapped_column(String(200), nullable=True)
    last_inspection_date: Mapped[date] = mapped_column(Date, nullable=True)
    inspecting_officer: Mapped[str] = mapped_column(String(200), nullable=True)

    # NOC & Hazard info
    noc_number: Mapped[str] = mapped_column(String(100))
    noc_valid_till: Mapped[date] = mapped_column(Date, nullable=True)
    noc_type: Mapped[str] = mapped_column(String(50), default="Provisional")  # Provisional, Final, Renewal
    is_high_hazard: Mapped[bool] = mapped_column(Boolean, default=False)

    # Additional NOC extracted data
    floor_wise_usage: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string
    ug_tank_capacity_litres: Mapped[int] = mapped_column(Integer, nullable=True)
    oh_tank_capacity_litres: Mapped[int] = mapped_column(Integer, nullable=True)
    road_width_metres: Mapped[float] = mapped_column(Float, nullable=True)
    developer_name: Mapped[str] = mapped_column(String(200), nullable=True)
    licensed_surveyor: Mapped[str] = mapped_column(String(200), nullable=True)
    smoke_detection: Mapped[str] = mapped_column(Text, nullable=True)
    water_spray_system: Mapped[str] = mapped_column(Text, nullable=True)
    car_parking_details: Mapped[str] = mapped_column(Text, nullable=True)
    scrutiny_fees: Mapped[str] = mapped_column(String(100), nullable=True)
    fire_service_fees: Mapped[str] = mapped_column(String(100), nullable=True)
    div_fire_officer: Mapped[str] = mapped_column(String(200), nullable=True)
    chief_fire_officer: Mapped[str] = mapped_column(String(200), nullable=True)

    # Geo
    latitude: Mapped[float] = mapped_column(Float, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Original document storage
    noc_pdf_path: Mapped[str] = mapped_column(String(300), nullable=True)
    floorplan_pdf_path: Mapped[str] = mapped_column(String(300), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    floor_plans: Mapped[list["FloorPlan"]] = relationship(back_populates="building", cascade="all, delete-orphan")
    users: Mapped[list["User"]] = relationship(back_populates="building")
    alerts: Mapped[list["FireAlert"]] = relationship(back_populates="building")


# ── Table 2: floor_plans (NEW) ──

class FloorPlan(Base):
    __tablename__ = "floor_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[str] = mapped_column(String(50), ForeignKey("buildings.building_id"))
    floor_label: Mapped[str] = mapped_column(String(200))  # e.g. "GROUND FLOOR PLAN"
    floor_numbers: Mapped[str] = mapped_column(Text)  # JSON array e.g. "[0]" or "[3,4,5,6]"
    image_path: Mapped[str] = mapped_column(String(300))  # Relative path under noc_data/
    page_number: Mapped[int] = mapped_column(Integer, default=0)  # Source PDF page

    building: Mapped["Building"] = relationship(back_populates="floor_plans")


# ── Table 3: fire_stations ──

class FireStation(Base):
    __tablename__ = "fire_stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    name_mr: Mapped[str] = mapped_column(String(200), nullable=True)
    name_hi: Mapped[str] = mapped_column(String(200), nullable=True)
    address: Mapped[str] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    phone: Mapped[str] = mapped_column(String(20))

    mapped_buildings: Mapped[list["BuildingStationMap"]] = relationship(back_populates="fire_station")


# ── Table 4: building_station_map ──

class BuildingStationMap(Base):
    __tablename__ = "building_station_map"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[str] = mapped_column(String(50), ForeignKey("buildings.building_id"))
    fire_station_id: Mapped[int] = mapped_column(Integer, ForeignKey("fire_stations.id"))

    fire_station: Mapped["FireStation"] = relationship(back_populates="mapped_buildings")


# ── Table 5: users ──

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(50))  # "security", "manager", "staff"
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    building_id: Mapped[str] = mapped_column(String(50), ForeignKey("buildings.building_id"), nullable=True)
    
    # Fire responder fields (null for building staff)
    is_responder: Mapped[bool] = mapped_column(Boolean, default=False)
    station_id: Mapped[int] = mapped_column(Integer, ForeignKey("fire_stations.id"), nullable=True)
    badge_number: Mapped[str] = mapped_column(String(50), nullable=True)
    rank: Mapped[str] = mapped_column(String(100), nullable=True)
    
    registered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    building: Mapped["Building"] = relationship(back_populates="users")
    alerts_reported: Mapped[list["FireAlert"]] = relationship(back_populates="reporter")
    updates_sent: Mapped[list["RealTimeUpdate"]] = relationship(back_populates="sender")


# ── Table 6: fire_alerts ──

class FireAlert(Base):
    __tablename__ = "fire_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[str] = mapped_column(String(50), ForeignKey("buildings.building_id"))
    reported_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(20), default=AlertStatus.ACTIVE.value)
    
    # Incident details
    incident_category: Mapped[str] = mapped_column(String(20), default=IncidentCategory.FIRE.value)
    alert_type: Mapped[str] = mapped_column(String(100), default="fire")  # Free text from "Other"
    floor: Mapped[str] = mapped_column(String(50), nullable=True)  # e.g. "Floor 5", "Basement 1"
    floor_number: Mapped[int] = mapped_column(Integer, nullable=True)  # Parsed: 5, -1, 0, etc.

    building: Mapped["Building"] = relationship(back_populates="alerts")
    reporter: Mapped["User"] = relationship(back_populates="alerts_reported")
    updates: Mapped[list["RealTimeUpdate"]] = relationship(back_populates="alert")


# ── Table 7: real_time_updates ──

class RealTimeUpdate(Base):
    __tablename__ = "real_time_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_id: Mapped[int] = mapped_column(Integer, ForeignKey("fire_alerts.id"))
    sent_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    floor_number: Mapped[int] = mapped_column(Integer, nullable=True)
    affected_area: Mapped[str] = mapped_column(String(200), nullable=True)
    estimated_occupants: Mapped[int] = mapped_column(Integer, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=True)
    photo_path: Mapped[str] = mapped_column(String(300), nullable=True)  # Path to uploaded photo
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    alert: Mapped["FireAlert"] = relationship(back_populates="updates")
    sender: Mapped["User"] = relationship(back_populates="updates_sent")