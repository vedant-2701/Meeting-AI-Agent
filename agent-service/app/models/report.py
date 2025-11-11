from pydantic import BaseModel
from typing import List

"""
Pydantic models define the shape of our data.
This ensures data is valid coming into and out of the API.
"""

class ChatMessage(BaseModel):
    sender: str
    time: str
    message: str

class Participant(BaseModel):
    name: str
    avatarUrl: str
    roles: List[str]

# This is the base report from the bot
class MeetingReport(BaseModel):
    attendeeCount: int
    attendees: List[Participant]
    meetingUrl: str
    chat: List[ChatMessage] 

# This is the final report we save to our DB,
# which includes the path to the saved audio file.
class FinalReport(MeetingReport):
    audioFile: str = ""