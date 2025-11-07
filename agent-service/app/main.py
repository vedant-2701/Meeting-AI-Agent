from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn

# --- Pydantic Data Model ---

# *** --- START OF CHANGE: NEW DATA STRUCTURE --- ***
# Update the Participant model
class Participant(BaseModel):
    name: str
    avatarUrl: str # Added avatar URL
    roles: List[str]  # This is now a list of roles

# Update the MeetingReport to expect a List of new Participant objects
class MeetingReport(BaseModel):
    attendeeCount: int
    attendees: List[Participant]
    meetingUrl: str
# *** --- END OF CHANGE --- ***


# Create the FastAPI app instance
app = FastAPI(title="AI Agent Service")

@app.get("/")
def read_root():
    """A simple root endpoint to check if the server is running."""
    return {"status": "AI Agent is running!"}


@app.post("/api/report")
async def receive_meeting_report(report: MeetingReport):
    """
    This is the main endpoint.
    The TypeScript bot will POST the meeting data here.
    """
    print("--- 🧠 AI Agent Received a Report ---")
    print(f"Meeting URL: {report.meetingUrl}")
    print(f"Unique Attendee Count: {report.attendeeCount}")
    
    # *** --- START OF CHANGE: UPDATED PRINT LOGIC --- ***
    # Loop through the objects and print them
    print("Attendees:")
    for p in report.attendees:
        # Join all roles, e.g., "Host, Presenter"
        role_str = f" (Roles: {', '.join(p.roles)})"
        print(f"  - {p.name}{role_str}")
        print(f"    Avatar: {p.avatarUrl}")
    # *** --- END OF CHANGE --- ***
        
    print("--------------------------------------")
    
    return {"status": "Report received and logged successfully"}

# This allows us to run the server directly with `python app/main.py`
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)