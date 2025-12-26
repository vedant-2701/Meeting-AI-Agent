import os

"""
Global configuration settings for the application.
"""

# *** --- START OF FFMPEG FIX --- ***
#
# 1. EDIT THIS LINE:
# Paste the FULL path to your 'ffmpeg.exe' file.
# Use double backslashes (\\) for Windows paths.
#
# EXAMPLE: FFMPEG_PATH = "D:\\ffmpeg-n8.0\\bin\\ffmpeg.exe"
#
FFMPEG_PATH = r"D:\ffmpeg-n8.0-latest-win64-gpl-8.0\bin\ffmpeg.exe"
#
# *** --- END OF FFMPEG FIX --- ***


# Base directory for our "database" and file storage
DATA_DIR = "agent_data"

# JSON file for storing report metadata
DB_FILE = os.path.join(DATA_DIR, "db.json")

# Directory for storing final .wav audio files
AUDIO_DIR = os.path.join(DATA_DIR, "saved_audio")

# Directory for storing temporary video files during processing
TEMP_DIR = os.path.join(DATA_DIR, "temp_video")

# Directory for storing transcripts
TRANSCRIPTS_DIR = os.path.join(DATA_DIR, "transcripts")

# Create directories if they don't exist
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)