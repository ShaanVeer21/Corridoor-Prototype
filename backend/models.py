"""
Corridoor database models — all 6 tables.
Matches the schema from the project doc exactly.
"""

from datetime import datetime, date
from sqlalchemy import (
    String, Integer, Float, Boolean, Text, Date, DateTime,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
import enum


# ── Enums ──

class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class AlertType(str, enum.Enum):
    FIRE = "fire"
    GAS_LEAK = "gas_leak"
    STRUCTURAL = "structural"
    OTHER = "other"


# ── Table 1: buildings ──

class Building(Base):
    __tablename__ = "buildings"

    building_id: Mapped[str] = mapped_column(String(10), primary_key=True)  # e.g. THN-001
    name: Mapped[str] = mapped_column(String(200))
    building_type: Mapped[str] = mapped_column(String(100))  # e.g. "Educational — University"

    # Section A — NOC submission data
    address: Mapped[str] = mapped_column(Text)
    nearest_landmark: Mapped[str] = mapped_column(Text, nullable=True)
    nbc_occupancy_group: Mapped[str] = mapped_column(String(100))
    floors_above_ground: Mapped[int] = mapped_column(Integer)
    floors_below_ground: Mapped[int] = mapped_column(Integer, default=0)
    total_height_metres: Mapped[float] = mapped_column(Float)
    plot_area_sqm: Mapped[float] = mapped_column(Float, nullable=True)
    built_up_area_sqm: Mapped[float] = mapped_column(Float, nullable=True)
    daytime_occupancy: Mapped[int] = mapped_column(Integer)
    nighttime_occupancy: Mapped[int] = mapped_column(Integer)
    fire_alarm_make: Mapped[str] = mapped_column(String(200))
    sprinkler_system: Mapped[str] = mapped_column(String(200))  # "Yes — wet pipe", "No", "Partial — ICU only"
    internal_hydrants: Mapped[int] = mapped_column(Integer, default=0)
    external_hydrants: Mapped[int] = mapped_column(Integer, default=0)
    wet_riser: Mapped[str] = mapped_column(String(200), nullable=True)
    fire_extinguishers: Mapped[str] = mapped_column(Text, nullable=True)

    # Section B — Installation certificates & building file
    panel_model: Mapped[str] = mapped_column(String(200), nullable=True)
    detection_zones: Mapped[int] = mapped_column(Integer, nullable=True)
    fire_pump_capacity: Mapped[str] = mapped_column(String(200), nullable=True)
    public_address_system: Mapped[str] = mapped_column(String(200), nullable=True)
    generator_backup: Mapped[str] = mapped_column(String(200), nullable=True)
    amc_vendor: Mapped[str] = mapped_column(String(200), nullable=True)
    amc_valid_till: Mapped[date] = mapped_column(Date, nullable=True)
    last_fire_drill: Mapped[date] = mapped_column(Date, nullable=True)
    drill_attendance_pct: Mapped[int] = mapped_column(Integer, nullable=True)
    structural_stability: Mapped[bool] = mapped_column(Boolean, default=True)
    occupancy_certificate: Mapped[str] = mapped_column(String(100), nullable=True)
    architect: Mapped[str] = mapped_column(String(200), nullable=True)
    mep_consultant: Mapped[str] = mapped_column(String(200), nullable=True)
    refuge_floors: Mapped[str] = mapped_column(String(200), nullable=True)  # "4th and 8th floor" or "N/A"
    owner_name: Mapped[str] = mapped_column(String(200), nullable=True)
    owner_contact: Mapped[str] = mapped_column(String(50), nullable=True)

    # Section C — Access routes & compliance
    entry_points: Mapped[str] = mapped_column(Text, nullable=True)
    exit_routes: Mapped[str] = mapped_column(Text, nullable=True)
    previous_noc_number: Mapped[str] = mapped_column(String(50), nullable=True)
    previous_violations: Mapped[str] = mapped_column(Text, nullable=True)
    first_contact_on_site: Mapped[str] = mapped_column(String(200), nullable=True)
    last_inspection_date: Mapped[date] = mapped_column(Date, nullable=True)
    inspecting_officer: Mapped[str] = mapped_column(String(200), nullable=True)

    # NOC & Hazard info
    noc_number: Mapped[str] = mapped_column(String(50))
    noc_valid_till: Mapped[date] = mapped_column(Date)
    is_high_hazard: Mapped[bool] = mapped_column(Boolean, default=False)

    # Floorplan & Geo
    floorplan_path: Mapped[str] = mapped_column(String(300), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="building")
    alerts: Mapped[list["FireAlert"]] = relationship(back_populates="building")


# ── Table 2: fire_stations ──

class FireStation(Base):
    __tablename__ = "fire_stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    address: Mapped[str] = mapped_column(Text)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    phone: Mapped[str] = mapped_column(String(20))

    # Relationships
    mapped_buildings: Mapped[list["BuildingStationMap"]] = relationship(back_populates="fire_station")


# ── Table 3: building_station_map ──

class BuildingStationMap(Base):
    __tablename__ = "building_station_map"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[str] = mapped_column(String(10), ForeignKey("buildings.building_id"))
    fire_station_id: Mapped[int] = mapped_column(Integer, ForeignKey("fire_stations.id"))

    fire_station: Mapped["FireStation"] = relationship(back_populates="mapped_buildings")


# ── Table 4: users ──

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(50))  # "security", "manager", "staff"
    building_id: Mapped[str] = mapped_column(String(10), ForeignKey("buildings.building_id"))
    registered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    building: Mapped["Building"] = relationship(back_populates="users")
    alerts_reported: Mapped[list["FireAlert"]] = relationship(back_populates="reporter")
    updates_sent: Mapped[list["RealTimeUpdate"]] = relationship(back_populates="sender")


# ── Table 5: fire_alerts ──

class FireAlert(Base):
    __tablename__ = "fire_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    building_id: Mapped[str] = mapped_column(String(10), ForeignKey("buildings.building_id"))
    reported_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(20), default=AlertStatus.ACTIVE.value)
    alert_type: Mapped[str] = mapped_column(String(20), default=AlertType.FIRE.value)

    building: Mapped["Building"] = relationship(back_populates="alerts")
    reporter: Mapped["User"] = relationship(back_populates="alerts_reported")
    updates: Mapped[list["RealTimeUpdate"]] = relationship(back_populates="alert")


# ── Table 6: real_time_updates ──

class RealTimeUpdate(Base):
    __tablename__ = "real_time_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    alert_id: Mapped[int] = mapped_column(Integer, ForeignKey("fire_alerts.id"))
    sent_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    floor_number: Mapped[int] = mapped_column(Integer, nullable=True)
    affected_area: Mapped[str] = mapped_column(String(200), nullable=True)
    estimated_occupants: Mapped[int] = mapped_column(Integer, nullable=True)
    message: Mapped[str] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    alert: Mapped["FireAlert"] = relationship(back_populates="updates")
    sender: Mapped["User"] = relationship(back_populates="updates_sent")