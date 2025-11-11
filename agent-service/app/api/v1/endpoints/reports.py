from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from typing import List
import shutil
import os

from app.models.report import MeetingReport, FinalReport
from app.db.session import read_db, write_db
from app.services.audio import extract_audio_from_video
from app.core.config import TEMP_DIR

# Create a new router for these endpoints
router = APIRouter()

@router.get("/reports", response_model=List[FinalReport])
async def get_all_reports():
    """
    Endpoint for the React frontend.
    Returns a list of all saved meeting reports.
    """
    print("GET /api/reports: Fetching all reports for frontend...")
    db = read_db()
    return list(db.values())


@router.post("/report-with-media")
async def receive_report_with_media(
    report_json: str = Form(...), 
    video_file: UploadFile = File(...)
):
    """
    Endpoint for the Mode 2 (Autonomous Bot).
    Receives JSON and a video file, processes audio, and saves.
    """
    print("--- 🧠 AI Agent Received a Report with Media (Mode 2) ---")
    
    # 1. Parse the JSON report string
    try:
        report = MeetingReport.parse_raw(report_json)
        print(f"Report for {report.meetingUrl} parsed successfully.")
    except Exception as e:
        print(f"Error parsing report JSON: {e}")
        raise HTTPException(status_code=400, detail="Invalid report JSON")

    # 2. Save the temporary video file
    temp_video_path = os.path.join(TEMP_DIR, video_file.filename or "temp_video.webm")
    try:
        with open(temp_video_path, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)
        print(f"Temporary video saved to {temp_video_path}")
    except Exception as e:
        print(f"Error saving video file: {e}")
        raise HTTPException(status_code=500, detail="Could not save video file")
    finally:
        video_file.file.close()

    # 3. Use our service to extract audio
    try:
        audio_path = extract_audio_from_video(temp_video_path, report.meetingUrl)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # 4. Save the final report to the database
    db = read_db()
    report_key = report.meetingUrl
    
    final_report = FinalReport(
        **report.dict(), 
        audioFile=audio_path
    )
    
    db[report_key] = final_report
    write_db(db)
    
    print(f"Report and audio path saved to db.json.")
    print("--------------------------------------")
    
    return {"status": f"Report and audio for {report_key} saved"}