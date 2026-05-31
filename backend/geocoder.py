"""
Corridoor v2 — Address Geocoder
Uses OpenStreetMap Nominatim (free, no API key) to convert addresses to lat/lng.
"""

import httpx
import asyncio
import re

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# User-Agent is required by Nominatim's usage policy
HEADERS = {
    "User-Agent": "Corridoor-FireResponse/2.0 (corridoor.app)"
}


async def geocode_address(address: str, area: str = None, city: str = "Mumbai") -> dict:
    """
    Geocode an Indian address to lat/lng using Nominatim.
    Returns {"latitude": float, "longitude": float} or {"latitude": 0.0, "longitude": 0.0} on failure.
    
    Tries multiple query strategies:
    1. Full address
    2. Area + city
    3. Pincode extraction
    """
    if not address:
        return {"latitude": 0.0, "longitude": 0.0}
    
    # Extract pincode if present
    pincode_match = re.search(r'\b\d{6}\b', address)
    pincode = pincode_match.group() if pincode_match else None
    
    # Build search queries in priority order
    queries = []
    
    # Try 1: Full address
    clean_address = re.sub(r'[()]', ' ', address)  # Remove parentheses
    clean_address = re.sub(r'\s+', ' ', clean_address).strip()
    queries.append(clean_address)
    
    # Try 2: Area + city + pincode
    if area:
        q = f"{area}, {city}"
        if pincode:
            q += f" {pincode}"
        queries.append(q)
    
    # Try 3: Just area + city
    if area:
        queries.append(f"{area}, {city}, India")
    
    # Try 4: Extract locality from address
    # Look for patterns like "Ghatkopar (East)" or "Mulund (West)"
    locality_match = re.search(r'(\w+)\s*\([EWew](?:ast|est)?\)', address)
    if locality_match:
        queries.append(f"{locality_match.group()}, {city}, India")
    
    # Try 5: Pincode alone
    if pincode:
        queries.append(f"{pincode}, India")
    
    for query in queries:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    NOMINATIM_URL,
                    params={
                        "q": query,
                        "format": "json",
                        "limit": 1,
                        "countrycodes": "in",
                    },
                    headers=HEADERS,
                )
            
            if response.status_code == 200:
                results = response.json()
                if results and len(results) > 0:
                    lat = float(results[0]["lat"])
                    lon = float(results[0]["lon"])
                    print(f"Geocoded '{query}' → {lat}, {lon}")
                    return {"latitude": lat, "longitude": lon}
            
            # Nominatim rate limit: max 1 request per second
            await asyncio.sleep(1.1)
            
        except Exception as e:
            print(f"Geocoding failed for '{query}': {e}")
            continue
    
    print(f"Could not geocode address: {address}")
    return {"latitude": 0.0, "longitude": 0.0}