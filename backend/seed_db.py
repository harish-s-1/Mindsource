"""CLI: (re)create and seed the SQLite database with simulated demo data.

Usage:
    python seed_db.py          # seed only if empty
    python seed_db.py --reset  # drop and reseed everything
"""

from __future__ import annotations

import sys

from app.database import SessionLocal
from app.seed import reset_and_seed, seed_if_empty


def main() -> None:
    reset = "--reset" in sys.argv[1:]
    db = SessionLocal()
    try:
        if reset:
            reset_and_seed(db)
            print("Database reset and reseeded with simulated demo data.")
        else:
            seed_if_empty(db)
            print("Database ensured/seeded (no-op if already populated).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
