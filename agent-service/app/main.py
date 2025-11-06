from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn # Import uvicorn

# --- Pydantic Data Model ---
# This defines the structure of the data we EXPECT to receive from the bot.
class MeetingReport(BaseModel):
    attendeeCount: int
    attendees: List[str]
    meetingUrl: str

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
    print(f"Attendee Count: {report.attendeeCount}")
    print(f"Attendees: {', '.join(report.attendees)}")
    print("--------------------------------------")
    
    return {"status": "Report received and logged successfully"}

# This allows us to run the server directly with `python app/main.py`
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)