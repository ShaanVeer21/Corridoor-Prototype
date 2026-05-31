"""
Corridoor v2 — Groq NOC Extractor
Rotates across multiple API keys to avoid rate limits.
Two-call extraction: building info + fire systems.
"""

import json
import os
import re
import asyncio
import httpx
import pdfplumber
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Load all available Groq keys
GROQ_KEYS = []
for i in range(1, 10):
    key = os.getenv(f"GROQ_API_KEY_{i}", "")
    if key:
        GROQ_KEYS.append(key)
if not GROQ_KEYS:
    single = os.getenv("GROQ_API_KEY", "")
    if single:
        GROQ_KEYS.append(single)

_key_index = 0

def _next_key():
    global _key_index
    if not GROQ_KEYS:
        raise ValueError("No GROQ_API_KEY set in .env file.")
    key = GROQ_KEYS[_key_index % len(GROQ_KEYS)]
    _key_index += 1
    return key

PROMPT_PART1 = """Extract building info from this Indian Fire NOC document as JSON. Only use info explicitly stated. Use null if not found. Return ONLY valid JSON, no markdown.

{
"file_number":"string","ward":"string","area_name":"string","building_name":"Name of the society/institution/project (e.g. 'Vivekanand Education Society', 'Ayaansh Buildcon', 'Mulund Hansa Villa'). Look for 'M/s.', 'for Owner', 'Society', 'Co-op', or project names. Do NOT use building type as name.",
"building_type":"string","owner_name":"string","owner_contact":"string or null",
"developer_name":"string or null","licensed_surveyor":"string or null",
"address":"string","nearest_landmark":"string or null",
"floors_above_ground":"int","floors_below_ground":"int","total_height_metres":"float",
"built_up_area_sqm":"float or null","plot_area_sqm":"float or null",
"floor_wise_usage":"object mapping floor to usage",
"staircases":"string","lifts":"string","refuge_area":"string or null",
"road_width_metres":"float or null",
"noc_type":"Provisional or Final or Renewal",
"is_high_hazard":"bool",
"scrutiny_fees":"string or null","fire_service_fees":"string or null"
}

Document text:
"""

PROMPT_PART2 = """Extract fire safety systems from this Indian Fire NOC document as JSON. Only use info explicitly stated. Use null if not found. Return ONLY valid JSON, no markdown.

{
"fire_alarm_system":"string","sprinkler_system":"string",
"wet_riser":"string or null","fire_pump_capacity":"string or null",
"hydrants_internal":"string or null","hydrants_external":"string or null",
"fire_extinguishers":"string or null","public_address_system":"string or null",
"smoke_detection":"string or null","water_spray_system":"string or null",
"ug_tank_capacity_litres":"int or null","oh_tank_capacity_litres":"int or null",
"generator_backup":"string or null","car_parking_details":"string or null",
"div_fire_officer":"string or null","chief_fire_officer":"string or null"
}

Document text:
"""

async def _call_groq(prompt, text):
    if len(text) > 5500:
        text = text[:5500]
    last_error = None
    for attempt in range(len(GROQ_KEYS) * 2):
        api_key = _next_key()
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": "llama-3.1-8b-instant", "messages": [{"role": "user", "content": prompt + text}], "temperature": 0.1, "max_tokens": 2048},
            )
        if response.status_code == 200:
            result = response.json()
            resp_text = result["choices"][0]["message"]["content"].strip()
            if resp_text.startswith("```json"): resp_text = resp_text[7:]
            if resp_text.startswith("```"): resp_text = resp_text[3:]
            if resp_text.endswith("```"): resp_text = resp_text[:-3]
            resp_text = resp_text.strip()
            try:
                return json.loads(resp_text)
            except json.JSONDecodeError:
                match = re.search(r'\{[\s\S]*\}', resp_text)
                if match: return json.loads(match.group())
                raise ValueError(f"Invalid JSON from Groq: {resp_text[:300]}")
        elif response.status_code in (429, 413):
            last_error = response.text
            print(f"Key {api_key[:10]}... rate limited, rotating...")
            if attempt >= len(GROQ_KEYS) - 1 and attempt % len(GROQ_KEYS) == len(GROQ_KEYS) - 1:
                print("All keys exhausted, waiting 10s...")
                await asyncio.sleep(10)
        else:
            raise ValueError(f"Groq error ({response.status_code}): {response.text[:300]}")
    raise ValueError(f"All Groq keys rate limited. Last: {last_error[:200] if last_error else 'unknown'}")

async def extract_noc_with_groq(pdf_path):
    raw_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages[:4]):
            text = page.extract_text()
            if text: raw_text += text + "\n"
    if not raw_text.strip():
        raise ValueError("Could not extract text from PDF.")
    if not GROQ_KEYS:
        raise ValueError("No GROQ_API_KEY set in .env file.")
    fire_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            if i >= 3:
                text = page.extract_text()
                if text: fire_text += text + "\n"
    part1 = await _call_groq(PROMPT_PART1, raw_text[:5500])
    part2 = await _call_groq(PROMPT_PART2, (fire_text if fire_text.strip() else raw_text)[:5500])
    return {**part1, **part2}

async def extract_noc_with_gemini(pdf_path):
    return await extract_noc_with_groq(pdf_path)

def generate_building_id(file_number, area_name=None):
    if not file_number:
        import uuid
        return f"{(area_name or 'UNK')[:3].upper()}-{str(uuid.uuid4())[:8].upper()}"
    parts = file_number.split("/")
    return f"{parts[0]}/{parts[1]}" if len(parts) >= 2 else file_number[:20]

def extract_ward(file_number, raw_text=""):
    m = re.search(r'/([A-Z])\s*(?:Ward|WARD)/|/([A-Z])-Ward/', file_number or "")
    if m: return f"{m.group(1) or m.group(2)} Ward"
    m = re.search(r'(\w)\s+Ward\b', raw_text)
    if m: return f"{m.group(1)} Ward"
    return None

def noc_data_to_building_dict(extracted):
    def si(v, d=0):
        if v is None: return d
        if isinstance(v, int): return v
        if isinstance(v, float): return int(v)
        if isinstance(v, str):
            n = re.findall(r'\d+', v)
            return int(n[0]) if n else d
        return d
    def sf(v, d=0.0):
        if v is None: return d
        if isinstance(v, (int, float)): return float(v)
        if isinstance(v, str):
            n = re.findall(r'[\d.]+', v)
            return float(n[0]) if n else d
        return d
    def ss(v, d=""):
        if v is None: return d
        if isinstance(v, dict): return json.dumps(v)
        if isinstance(v, bool): return str(v)
        return str(v)
    fn = ss(extracted.get("file_number"))
    an = ss(extracted.get("area_name"))
    bid = generate_building_id(fn, an)
    w = ss(extracted.get("ward")) or extract_ward(fn)
    bn = ss(extracted.get("building_name"))
    if not bn or bn == "null" or bn.lower() == "none" or "low-rise" in bn.lower() or "high-rise" in bn.lower() or "building" in bn.lower().split()[-1:]:
        # Name looks like a type description, not an actual name — try owner/developer
        dev = ss(extracted.get("developer_name"))
        owner = ss(extracted.get("owner_name"), "")
        name_source = dev if dev and dev != "null" and dev.lower() != "none" else owner
        name_source = re.sub(r'^(?:Mr\.|Mrs\.|Ms\.|Smt\.|M/s\.)\s*', '', name_source).strip()
        if name_source:
            bn = f"{name_source} — {an}"
        else:
            bn = f"Building at {an}"
    ih = extracted.get("is_high_hazard", False)
    if isinstance(ih, str): ih = ih.lower() in ("true", "yes", "1")
    fu = extracted.get("floor_wise_usage")
    fus = json.dumps(fu) if isinstance(fu, dict) else ss(fu)
    return {
        "building_id": bid, "name": bn, "building_type": ss(extracted.get("building_type"), "Unknown"),
        "ward": w, "area_name": an, "file_number": fn,
        "address": ss(extracted.get("address"), "Address not specified"),
        "nearest_landmark": ss(extracted.get("nearest_landmark")) or None,
        "nbc_occupancy_group": ss(extracted.get("building_type"), "Unknown"),
        "floors_above_ground": si(extracted.get("floors_above_ground")),
        "floors_below_ground": si(extracted.get("floors_below_ground")),
        "total_height_metres": sf(extracted.get("total_height_metres")),
        "plot_area_sqm": sf(extracted.get("plot_area_sqm")) or None,
        "built_up_area_sqm": sf(extracted.get("built_up_area_sqm")) or None,
        "daytime_occupancy": 0, "nighttime_occupancy": 0,
        "fire_alarm_make": ss(extracted.get("fire_alarm_system"), "As per NOC requirements"),
        "sprinkler_system": ss(extracted.get("sprinkler_system"), "As per NOC requirements"),
        "internal_hydrants": si(extracted.get("hydrants_internal")),
        "external_hydrants": si(extracted.get("hydrants_external")),
        "wet_riser": ss(extracted.get("wet_riser")) or None,
        "fire_extinguishers": ss(extracted.get("fire_extinguishers")) or None,
        "panel_model": None, "detection_zones": None,
        "fire_pump_capacity": ss(extracted.get("fire_pump_capacity")) or None,
        "public_address_system": ss(extracted.get("public_address_system")) or None,
        "generator_backup": ss(extracted.get("generator_backup")) or None,
        "amc_vendor": None, "amc_valid_till": None, "last_fire_drill": None, "drill_attendance_pct": None,
        "structural_stability": True, "occupancy_certificate": None,
        "architect": ss(extracted.get("licensed_surveyor")) or None, "mep_consultant": None,
        "refuge_floors": ss(extracted.get("refuge_area")) or None,
        "owner_name": ss(extracted.get("owner_name")) or None,
        "owner_contact": ss(extracted.get("owner_contact")) or None,
        "entry_points": None, "exit_routes": ss(extracted.get("staircases")) or None,
        "previous_noc_number": None, "previous_violations": None,
        "first_contact_on_site": ss(extracted.get("owner_name")) or None,
        "last_inspection_date": None, "inspecting_officer": ss(extracted.get("div_fire_officer")) or None,
        "noc_number": fn, "noc_valid_till": None,
        "noc_type": ss(extracted.get("noc_type"), "Provisional"), "is_high_hazard": bool(ih),
        "floor_wise_usage": fus,
        "ug_tank_capacity_litres": si(extracted.get("ug_tank_capacity_litres")) or None,
        "oh_tank_capacity_litres": si(extracted.get("oh_tank_capacity_litres")) or None,
        "road_width_metres": sf(extracted.get("road_width_metres")) or None,
        "cts_number": ss(extracted.get("cts_number")) or None,
        "developer_name": ss(extracted.get("developer_name")) or None,
        "licensed_surveyor": ss(extracted.get("licensed_surveyor")) or None,
        "smoke_detection": ss(extracted.get("smoke_detection")) or None,
        "water_spray_system": ss(extracted.get("water_spray_system")) or None,
        "car_parking_details": ss(extracted.get("car_parking_details")) or None,
        "scrutiny_fees": ss(extracted.get("scrutiny_fees")) or None,
        "fire_service_fees": ss(extracted.get("fire_service_fees")) or None,
        "div_fire_officer": ss(extracted.get("div_fire_officer")) or None,
        "chief_fire_officer": ss(extracted.get("chief_fire_officer")) or None,
        "latitude": 0.0, "longitude": 0.0, "floorplan_path": None,
    }