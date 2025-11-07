from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
import json
import os
from fastapi.middleware.cors import CORSMiddleware # Import CORS

# --- Database ---
DB_FILE = "db.json"

# --- Pydantic Data Models ---
# This must match the 'types.ts' file in your Next.js app
class Participant(BaseModel):
    name: str
    avatarUrl: str
    roles: List[str]

class MeetingReport(BaseModel):
    attendeeCount: int
    attendees: List[Participant]
    meetingUrl: str

# Create the FastAPI app instance
app = FastAPI(title="AI Agent Service")

# *** --- THIS IS CRITICAL FOR YOUR FRONTEND --- ***
# This allows your Next.js app (running on localhost:3000)
# to make requests to this API (running on localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins (you can restrict to "http://localhost:3000")
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)
# *** --- END OF CRITICAL SECTION --- ***


def read_db() -> Dict[str, MeetingReport]:
    """Reads all reports from the JSON database file."""
    if not os.path.exists(DB_FILE):
        return {}
    with open(DB_FILE, "r") as f:
        try:
            # Load the JSON file and parse it into Pydantic models
            data = json.load(f)
            return {key: MeetingReport(**value) for key, value in data.items()}
        except json.JSONDecodeError:
            return {}

def write_db(db: Dict[str, MeetingReport]):
    """Writes all reports back to the JSON database file."""
    with open(DB_FILE, "w") as f:
        # Convert Pydantic models back to plain dicts for JSON serialization
        serializable_db = {key: value.dict() for key, value in db.items()}
        json.dump(serializable_db, f, indent=4)

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"status": "AI Agent is running!"}

# --- THIS ENDPOINT IS FOR THE FRONTEND ---
@app.get("/api/reports", response_model=List[MeetingReport])
async def get_all_reports():
    """
    New endpoint for the React frontend.
    Returns a list of all saved meeting reports.
    """
    print("GET /api/reports: Fetching all reports for frontend...")
    db = read_db()
    # Return a list of all the report objects
    return list(db.values())

# --- THIS ENDPOINT IS FOR THE BOT ---
@app.post("/api/report")
async def receive_meeting_report(report: MeetingReport):
    """
    This endpoint is for the BOT.
    It receives a new report and saves it to the database.
    """
    print("--- 🧠 AI Agent Received a Report ---")
    print(f"Meeting URL: {report.meetingUrl}")
    print(f"Unique Attendee Count: {report.attendeeCount}")
    
    db = read_db()
    
    # Use the meeting URL as a unique key
    report_key = report.meetingUrl
    db[report_key] = report # Save the Pydantic model
    
    write_db(db)
    
    print(f"Report for {report_key} saved to db.json.")
    
    # Print the new report details
    print("Attendees:")
    for p in report.attendees:
        role_str = f" (Roles: {', '.join(p.roles)})"
        print(f"  - {p.name}{role_str}")
        
    print("--------------------------------------")
    
    return {"status": f"Report for {report_key} saved"}

# This allows us to run the server directly with `python app/main.py`
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)