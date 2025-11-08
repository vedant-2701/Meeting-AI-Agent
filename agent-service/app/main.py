from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
import json
import os
from fastapi.middleware.cors import CORSMiddleware

# --- Database ---
DB_FILE = "db.json"

# --- Pydantic Data Models ---

# *** --- NEW CHATMESSAGE MODEL --- ***
class ChatMessage(BaseModel):
    sender: str
    time: str
    message: str

class Participant(BaseModel):
    name: str
    avatarUrl: str
    roles: List[str]

class MeetingReport(BaseModel):
    attendeeCount: int
    attendees: List[Participant]
    meetingUrl: str
    chat: List[ChatMessage] # *** --- ADDED THIS LINE --- ***


# Create the FastAPI app instance
app = FastAPI(title="AI Agent Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_db() -> Dict[str, MeetingReport]:
    """Reads all reports from the JSON database file."""
    if not os.path.exists(DB_FILE):
        return {}
    with open(DB_FILE, "r") as f:
        try:
            data = json.load(f)
            # Parse the loaded data back into Pydantic models
            return {key: MeetingReport(**value) for key, value in data.items()}
        except json.JSONDecodeError:
            return {}

def write_db(db: Dict[str, MeetingReport]):
    """Writes all reports back to the JSON database file."""
    with open(DB_FILE, "w") as f:
        serializable_db = {key: value.dict() for key, value in db.items()}
        json.dump(serializable_db, f, indent=4)

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"status": "AI Agent is running!"}

@app.get("/api/reports", response_model=List[MeetingReport])
async def get_all_reports():
    """Returns a list of all saved meeting reports for the frontend."""
    print("GET /api/reports: Fetching all reports for frontend...")
    db = read_db()
    return list(db.values())


@app.post("/api/report")
async def receive_meeting_report(report: MeetingReport):
    """This endpoint is for the BOT to save a new report."""
    print("--- 🧠 AI Agent Received a Report ---")
    print(f"Meeting URL: {report.meetingUrl}")
    print(f"Unique Attendee Count: {report.attendeeCount}")
    
    db = read_db()
    report_key = report.meetingUrl
    db[report_key] = report # Save the full report
    write_db(db)
    
    print(f"Report for {report_key} saved to db.json.")
    
    # Print the new report details
    print("Attendees:")
    for p in report.attendees:
        role_str = f" (Roles: {', '.join(p.roles)})"
        print(f"  - {p.name}{role_str}")
        
    # *** --- NEW PRINT LOGIC FOR CHAT --- ***
    print(f"Chat Log ({len(report.chat)} messages):")
    for msg in report.chat:
        print(f"  - [{msg.time}] {msg.sender}: {msg.message}")
    # *** --- END OF NEW LOGIC --- ***
        
    print("--------------------------------------")
    
    return {"status": f"Report for {report_key} saved"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)