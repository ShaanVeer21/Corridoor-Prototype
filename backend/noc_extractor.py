"""
NOC PDF Extraction Engine v2
Parses uploaded Fire NOC PDFs and extracts structured building data.

Uses pdftotext -layout for column-aware text extraction, then parses
each line to extract key-value pairs from the two-column NOC layout.

Supports:
- Single-building PDFs (one NOC document)
- Multi-building PDFs (like the Corridoor database with 20 buildings)
"""

import re
import subprocess
import tempfile
import os
from datetime import date
from typing import Optional, Dict, List


def _clean(text: str) -> str:
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text).strip()


def _extract_int(text: str) -> Optional[int]:
    if not text:
        return None
    nums = re.sub(r'[,\s]', '', text)
    match = re.search(r'(\d+)', nums)
    return int(match.group(1)) if match else None


def _extract_float(text: str) -> Optional[float]:
    if not text:
        return None
    nums = re.sub(r'[,\s]', '', text)
    match = re.search(r'([\d.]+)', nums)
    return float(match.group(1)) if match else None


def _parse_date(text: str) -> Optional[date]:
    if not text:
        return None
    text = _clean(text)
    month_map = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12
    }
    match = re.search(
        r'(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})',
        text, re.IGNORECASE
    )
    if match:
        return date(int(match.group(3)), month_map[match.group(2).lower()], int(match.group(1)))
    match = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', text)
    if match:
        return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
    return None


def _extract_layout_text(pdf_path: str) -> str:
    result = subprocess.run(
        ['pdftotext', '-layout', pdf_path, '-'],
        capture_output=True, text=True
    )
    return result.stdout


def _extract_layout_text_from_bytes(pdf_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        f.write(pdf_bytes)
        tmp_path = f.name
    try:
        return _extract_layout_text(tmp_path)
    finally:
        os.unlink(tmp_path)


def _find_value(text: str, key_pattern: str) -> Optional[str]:
    """Find value for a key in layout text. Key and value separated by 2+ spaces."""
    pattern = key_pattern + r'\s{2,}(.+?)$'
    match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
    if match:
        val = _clean(match.group(1))
        return val if val else None
    return None


def _split_into_building_blocks(text: str) -> List[str]:
    parts = re.split(r'(?=\n\s*THN-\d{3}\s+THN/NOC/)', text)
    blocks = []
    for part in parts:
        if re.search(r'THN-\d{3}\s+THN/NOC/', part):
            blocks.append(part)
    return blocks


def extract_building_from_block(block: str) -> Optional[Dict]:
    """Extract all NOC fields from a single building's layout text block."""

    id_match = re.search(r'(THN-\d{3})', block)
    if not id_match:
        return None
    building_id = id_match.group(1)

    noc_match = re.search(r'(THN/NOC/\d{4}/\d{3,4})', block)
    noc_number = noc_match.group(1) if noc_match else "Unknown"

    # ── Name & Type — scan non-empty lines after the ID line ──
    lines = block.strip().split('\n')
    name = None
    building_type = None
    found_id_line = False
    content_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(r'THN-\d{3}\s+THN/NOC/', stripped):
            found_id_line = True
            continue
        if found_id_line and not stripped.startswith('SECTION') and not stripped.startswith('Fields '):
            content_lines.append(stripped)
            if len(content_lines) >= 2:
                break

    if content_lines:
        name = content_lines[0]
    if len(content_lines) >= 2:
        # Second line might be "NOC: ... | Valid Till: ..." or the type
        if not content_lines[1].startswith('NOC:'):
            building_type = content_lines[1]
        elif len(content_lines) > 2:
            building_type = content_lines[2] if len(content_lines) > 2 else None

    # If name looks like a type line, swap
    type_keywords = ['Educational', 'Institutional', 'Mercantile', 'Residential', 'Assembly',
                     'Industrial', 'Business', 'Storage', 'HIGH HAZARD']
    if name and any(kw in name for kw in type_keywords) and not any(c.isdigit() for c in name[:4]):
        building_type = name
        name = building_id

    # ── NOC Valid Till ──
    valid_match = re.search(
        r'Valid\s+Till:\s*(\d{1,2})\s*\n?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})',
        block, re.IGNORECASE
    )
    if valid_match:
        noc_valid_till = _parse_date(f"{valid_match.group(1)} {valid_match.group(2)} {valid_match.group(3)}")
    else:
        v2 = re.search(r'Valid\s+Till:\s*(.+?)(?:\n|$)', block, re.IGNORECASE)
        noc_valid_till = _parse_date(v2.group(1)) if v2 else None

    is_high_hazard = bool(re.search(r'HIGH\s*HAZARD|EXTREME\s*HAZARD', block, re.IGNORECASE))

    # ══════════════════════════════════════
    # SECTION A
    # ══════════════════════════════════════
    address = _find_value(block, r'Address')
    nearest_landmark = _find_value(block, r'Nearest\s+Landmark')
    nbc_group = _find_value(block, r'NBC\s+Occupancy\s+Group')
    floors_above = _extract_int(_find_value(block, r'Floors\s+Above\s+Ground'))
    floors_below = _extract_int(_find_value(block, r'Floors\s+Below\s+Ground'))
    if floors_below is None:
        floors_below = 0
    height = _extract_float(_find_value(block, r'Total\s+Building\s+Height'))
    plot_area = _extract_float(_find_value(block, r'Plot\s+Area'))
    built_up_area = _extract_float(_find_value(block, r'Total\s+Built.Up\s+Area'))

    # Daytime occupancy — try layout match, then inline
    daytime_occ = _extract_int(_find_value(block, r'Daytime\s*Occupancy'))
    if not daytime_occ:
        dm = re.search(r'(\d[\d,]+)\s+persons', block)
        if dm:
            daytime_occ = _extract_int(dm.group(1))

    nighttime_occ = _extract_int(_find_value(block, r'Nighttime\s+Occupancy'))
    fire_alarm = _find_value(block, r'Fire\s+Alarm\s+System\s+\(Make\)')
    sprinkler = _find_value(block, r'Sprinkler\s+System')
    internal_hydrants = _extract_int(_find_value(block, r'Internal\s+Hydrants'))
    external_hydrants = _extract_int(_find_value(block, r'External\s+Hydrants'))
    wet_riser = _find_value(block, r'Wet\s+Riser')
    extinguishers = _find_value(block, r'Fire\s+Extinguishers')

    # ══════════════════════════════════════
    # SECTION B
    # ══════════════════════════════════════
    panel_model = _find_value(block, r'Panel\s+Model\s+&?\s*Series')
    detection_zones = _extract_int(_find_value(block, r'Number\s+of\s+Detection\s+Zones'))
    pump_capacity = _find_value(block, r'Fire\s+Pump\s+Capacity')
    pa_system = _find_value(block, r'Public\s+Address\s+System')
    generator = _find_value(block, r'Generator\s+Backup')
    amc_vendor = _find_value(block, r'AMC\s+Vendor')
    amc_valid_text = _find_value(block, r'AMC\s+Contract\s+Valid\s+Till')
    amc_valid_till = _parse_date(amc_valid_text)
    drill_text = _find_value(block, r'Last\s+Fire\s+Drill')
    last_fire_drill = _parse_date(drill_text)
    drill_attendance = _extract_int(_find_value(block, r'Drill\s+Attendance'))
    structural_text = _find_value(block, r'Structural\s+Stability\s+Certificate')
    structural = bool(structural_text and 'yes' in structural_text.lower())
    oc_text = _find_value(block, r'Occupancy\s+Certificate')
    oc_number = None
    if oc_text:
        oc_m = re.search(r'(OC/[\w/]+|Railway\s+Board\s+Clearance\s+[\w/]+)', oc_text)
        oc_number = oc_m.group(1) if oc_m else oc_text
    architect = _find_value(block, r'Architect\s*/?\s*Project\s+Designer')
    mep = _find_value(block, r'MEP\s*/?\s*Fire\s+Consultant')
    refuge = _find_value(block, r'Refuge\s+Floor\(s\)')
    owner_name = _find_value(block, r'Owner\s+Name')
    owner_contact = _find_value(block, r'Owner\s+Contact')

    # ══════════════════════════════════════
    # SECTION C
    # ══════════════════════════════════════
    entry_match = re.search(r'Entry\s+Points?:\s*(.+?)(?:\n\s*Exit|\n\n)', block, re.DOTALL | re.IGNORECASE)
    entry_points = _clean(entry_match.group(1)) if entry_match else None

    exit_match = re.search(r'Exit\s+Routes?:\s*(.+?)(?:\n\s*Previous|\n\n)', block, re.DOTALL | re.IGNORECASE)
    exit_routes = _clean(exit_match.group(1)) if exit_match else None

    prev_match = re.search(r'Previous\s+NOC\s+Number\s+(THN/NOC/[\d/]+)', block)
    prev_noc = prev_match.group(1) if prev_match else None

    violations_match = re.search(r'Previous\s+Violations?\s*/?\s*Deficiencies?\s{2,}(.+?)(?:\n|$)', block, re.IGNORECASE)
    violations = _clean(violations_match.group(1)) if violations_match else None

    contact_match = re.search(r'First\s+Contact\s+on\s+Site:\s*(.+?)(?:\n|$)', block, re.IGNORECASE)
    first_contact = _clean(contact_match.group(1)) if contact_match else None

    inspection_match = re.search(r'Last\s+Inspection:\s*(.+?)(?:\||$)', block, re.IGNORECASE)
    last_inspection = _parse_date(inspection_match.group(1)) if inspection_match else None

    officer_match = re.search(r'Inspecting\s+Officer:\s*(.+?)(?:\n|$)', block, re.IGNORECASE)
    inspecting_officer = _clean(officer_match.group(1)) if officer_match else None

    return {
        "building_id": building_id,
        "name": _clean(name) if name else building_id,
        "building_type": _clean(building_type) if building_type else "Unknown",
        "address": address or "Unknown",
        "nearest_landmark": nearest_landmark,
        "nbc_occupancy_group": nbc_group or "Unknown",
        "floors_above_ground": floors_above or 0,
        "floors_below_ground": floors_below or 0,
        "total_height_metres": height or 0.0,
        "plot_area_sqm": plot_area,
        "built_up_area_sqm": built_up_area,
        "daytime_occupancy": daytime_occ or 0,
        "nighttime_occupancy": nighttime_occ or 0,
        "fire_alarm_make": fire_alarm or "Unknown",
        "sprinkler_system": sprinkler or "Unknown",
        "internal_hydrants": internal_hydrants or 0,
        "external_hydrants": external_hydrants or 0,
        "wet_riser": wet_riser,
        "fire_extinguishers": extinguishers,
        "panel_model": panel_model,
        "detection_zones": detection_zones,
        "fire_pump_capacity": pump_capacity,
        "public_address_system": pa_system,
        "generator_backup": generator,
        "amc_vendor": amc_vendor,
        "amc_valid_till": amc_valid_till,
        "last_fire_drill": last_fire_drill,
        "drill_attendance_pct": drill_attendance,
        "structural_stability": structural,
        "occupancy_certificate": oc_number,
        "architect": architect,
        "mep_consultant": mep,
        "refuge_floors": refuge,
        "owner_name": owner_name,
        "owner_contact": owner_contact,
        "entry_points": entry_points,
        "exit_routes": exit_routes,
        "previous_noc_number": prev_noc,
        "previous_violations": violations,
        "first_contact_on_site": first_contact,
        "last_inspection_date": last_inspection,
        "inspecting_officer": inspecting_officer,
        "noc_number": noc_number,
        "noc_valid_till": noc_valid_till or date.today(),
        "is_high_hazard": is_high_hazard,
        "floorplan_path": None,
        "latitude": 0.0,
        "longitude": 0.0,
    }


def extract_from_pdf(pdf_path: str = None, pdf_bytes: bytes = None) -> List[Dict]:
    """
    Extract all buildings from a NOC PDF.
    Returns list of building dicts ready for database insertion.
    """
    if pdf_bytes:
        full_text = _extract_layout_text_from_bytes(pdf_bytes)
    elif pdf_path:
        full_text = _extract_layout_text(pdf_path)
    else:
        raise ValueError("Provide either pdf_path or pdf_bytes")

    blocks = _split_into_building_blocks(full_text)

    buildings = []
    seen = set()
    for block in blocks:
        building = extract_building_from_block(block)
        if building and building["building_id"] and building["building_id"] not in seen:
            seen.add(building["building_id"])
            buildings.append(building)

    return buildings


if __name__ == "__main__":
    buildings = extract_from_pdf("/mnt/user-data/uploads/CORRIDOOR_NOC_Database.pdf")
    print(f"\n{'='*70}")
    print(f"  Extracted {len(buildings)} buildings from NOC PDF")
    print(f"{'='*70}\n")

    for b in buildings:
        hazard = " ⚠️  HIGH HAZARD" if b["is_high_hazard"] else ""
        expired = ""
        if b["noc_valid_till"] and b["noc_valid_till"] < date(2025, 3, 26):
            expired = " [NOC EXPIRED]"

        print(f"  {b['building_id']} | {b['name']}{hazard}{expired}")
        print(f"    NOC: {b['noc_number']} | Valid: {b['noc_valid_till']}")
        print(f"    Type: {b['building_type']}")
        print(f"    Address: {b['address']}")
        print(f"    Floors: {b['floors_above_ground']}+{b['floors_below_ground']}B | Height: {b['total_height_metres']}m")
        print(f"    Occupancy: {b['daytime_occupancy']} day / {b['nighttime_occupancy']} night")
        print(f"    Alarm: {b['fire_alarm_make']}")
        print(f"    Sprinkler: {b['sprinkler_system']}")
        print(f"    Hydrants: {b['internal_hydrants']} int / {b['external_hydrants']} ext")
        print(f"    Entry: {b['entry_points']}")
        print(f"    Exit: {b['exit_routes']}")
        print(f"    Owner: {b['owner_name']} ({b['owner_contact']})")
        print()