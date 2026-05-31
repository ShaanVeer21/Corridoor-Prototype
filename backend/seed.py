"""
Corridoor v2 — Database Seed Script
Seeds fire stations only. Buildings are now created dynamically via NOC upload.
Run: python seed.py
"""

import asyncio
from database import engine, async_session
from models import Base, FireStation, BuildingStationMap


async def seed():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as db:
        # ── Fire Stations ──
        stations = [
            FireStation(
                name="Thane Main Fire Station",
                name_mr="ठाणे मुख्य अग्निशमन केंद्र",
                name_hi="ठाणे मुख्य अग्निशमन केंद्र",
                address="Jail Road, Thane West - 400601",
                latitude=19.1968, longitude=72.9726,
                phone="+919137166421",
            ),
            FireStation(
                name="Wagle Estate Fire Station",
                name_mr="वागळे इस्टेट अग्निशमन केंद्र",
                name_hi="वाघले एस्टेट अग्निशमन केंद्र",
                address="Wagle Industrial Estate, Thane - 400604",
                latitude=19.2094, longitude=72.9632,
                phone="+919137166421",
            ),
            FireStation(
                name="Ghodbunder Road Fire Station",
                name_mr="घोडबंदर रोड अग्निशमन केंद्र",
                name_hi="घोडबंदर रोड अग्निशमन केंद्र",
                address="Ghodbunder Road, Thane West - 400607",
                latitude=19.2403, longitude=72.9638,
                phone="+919137166421",
            ),
            FireStation(
                name="Kalwa Fire Station",
                name_mr="कळवा अग्निशमन केंद्र",
                name_hi="कल्वा अग्निशमन केंद्र",
                address="Kalwa, Thane - 400605",
                latitude=19.2048, longitude=72.9907,
                phone="+919137166421",
            ),
            FireStation(
                name="Mulund Fire Station",
                name_mr="मुलुंड अग्निशमन केंद्र",
                name_hi="मुलुंड अग्निशमन केंद्र",
                address="Mulund West, Mumbai - 400080",
                latitude=19.1726, longitude=72.9501,
                phone="+919137166421",
            ),
            FireStation(
                name="Ghatkopar Fire Station",
                name_mr="घाटकोपर अग्निशमन केंद्र",
                name_hi="घाटकोपर अग्निशमन केंद्र",
                address="Ghatkopar East, Mumbai - 400077",
                latitude=19.0860, longitude=72.9080,
                phone="+919137166421",
            ),
        ]

        for s in stations:
            db.add(s)

        await db.commit()
        print(f"✓ Seeded {len(stations)} fire stations")
        print()
        print("Database ready!")
        print("Buildings will be created when you upload NOC documents via the dashboard.")
        print()
        print("To start: uvicorn main:app --reload --host 0.0.0.0 --port 8000")


if __name__ == "__main__":
    asyncio.run(seed())