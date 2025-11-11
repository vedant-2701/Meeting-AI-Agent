import json
import os
from typing import Dict
from app.core.config import DB_FILE
from app.models.report import FinalReport

# Define our "Database" type for type hinting
Database = Dict[str, FinalReport]

def read_db() -> Database:
    """Reads all reports from the JSON database file."""
    if not os.path.exists(DB_FILE):
        return {}
    
    # Ensure file is not empty
    if os.path.getsize(DB_FILE) == 0:
        return {}
        
    with open(DB_FILE, "r") as f:
        try:
            data = json.load(f)
            # Parse the loaded dicts back into Pydantic models
            return {key: FinalReport(**value) for key, value in data.items()}
        except json.JSONDecodeError:
            return {}

def write_db(db: Database):
    """Writes all reports back to the JSON database file."""
    with open(DB_FILE, "w") as f:
        # Convert Pydantic models back to plain dicts for JSON serialization
        serializable_db = {key: value.dict() for key, value in db.items()}
        json.dump(serializable_db, f, indent=4)