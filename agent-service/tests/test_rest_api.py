import requests
import json
import os

API_URL = "http://localhost:8000/api/report-with-media"
DUMMY_FILE = "dummy_video.webm"

# 1. Create a fake video file for uploading
print(f"Creating dummy file: {DUMMY_FILE}...")
# with open(DUMMY_FILE, "wb") as f:
#     f.write(b"this is a fake video file, not real webm")

# 2. Create a fake JSON report
print("Creating fake report JSON...")
report_data = {
    "attendeeCount": 2,
    "attendees": [
        {"name": "Test User 1", "avatarUrl": "url1", "roles": ["Host", "You"]},
        {"name": "Test User 2", "avatarUrl": "url2", "roles": ["Participant"]}
    ],
    "meetingUrl": "https://meet.google.com/test-123-abc",
    "chat": [
        {"sender": "Test User 1", "time": "10:00 AM", "message": "This is a test"}
    ]
}
report_json = json.dumps(report_data)

# 3. Prepare the multipart-form data
files = {
    'report_json': (None, report_json, 'application/json'),
    'video_file': (os.path.basename(DUMMY_FILE), open(DUMMY_FILE, 'rb'), 'video/webm')
}

# 4. Send the POST request
print(f"\nSending POST request to {API_URL}...")
try:
    response = requests.post(API_URL, files=files)
    
    print(f"✅ Request successful!")
    print(f"Status Code: {response.status_code}")
    print(f"Response JSON: {response.json()}")

    # Verify the dummy video file was deleted by the server
    if not os.path.exists(f"temp/{DUMMY_FILE}"):
        print("✅ Server correctly cleaned up temp video file.")
    
    # Verify the new audio file was created
    audio_file_path = f"agent_data/saved_audio/test-123-abc.wav"
    if os.path.exists(audio_file_path):
        print(f"✅ Server successfully created audio file: {audio_file_path}")
    else:
        print(f"❌ Server FAILED to create audio file at: {audio_file_path}")
        print("NOTE: This test WILL FAIL if you do not have 'ffmpeg' installed on your computer.")

except Exception as e:
    print(f"❌ Request FAILED: {e}")
    print("Is the 'agent-service' (python run.py) running in another terminal?")

finally:
    # Clean up the local dummy file
    if os.path.exists(DUMMY_FILE):
        # os.remove(DUMMY_FILE)
        print(f"Cleaned up local file: {DUMMY_FILE}")