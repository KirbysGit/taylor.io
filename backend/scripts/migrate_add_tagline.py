"""
Add nullable `tagline` column to `contacts` (SQLite).

Run once after pulling this change, from the repo root:

    python backend/scripts/migrate_add_tagline.py

Or from `backend/`:

    python scripts/migrate_add_tagline.py

Safe to run multiple times: skips if the column already exists.
Existing rows keep all data; new column defaults to NULL.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BACKEND_DIR / "tailor.db"


def main() -> None:
    if not DB_PATH.exists():
        print(f"No database file at {DB_PATH}. Create or copy your DB first, then run again.")
        return

    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.execute("PRAGMA table_info(contacts)")
        columns = [row[1] for row in cur.fetchall()]
        if not columns:
            print("Table `contacts` not found; nothing to do.")
            return
        if "tagline" in columns:
            print("Column `contacts.tagline` already exists; migration not needed.")
            return
        conn.execute("ALTER TABLE contacts ADD COLUMN tagline VARCHAR(500)")
        conn.commit()
        print(f"Added `contacts.tagline` to {DB_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
