import ffmpeg
import os
from app.core.config import AUDIO_DIR, TEMP_DIR

def extract_audio_from_video(video_path: str, meeting_url: str) -> str:
    """
    Extracts audio from a video file, converts to 16kHz mono WAV,
    and saves it.
    
    Returns the path to the saved .wav file.
    """
    print(f"Starting audio extraction from {video_path}...")
    
    # Create a unique, safe filename
    safe_filename = meeting_url.split('/')[-1].replace('?', '-').replace('=', '-')
    output_audio_path = os.path.join(AUDIO_DIR, f"{safe_filename}.wav")
    
    try:
        (
            ffmpeg
            .input(video_path)
            # acodec='pcm_s16le' (standard WAV)
            # ar='16000' (16kHz sample rate for Whisper)
            # ac=1 (mono audio)
            .output(output_audio_path, acodec='pcm_s16le', ar='16000', ac=1)
            .run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
        )
        print(f"Audio extraction successful. Saved to {output_audio_path}")
        return output_audio_path
    except ffmpeg.Error as e:
        print("FFmpeg error:", e.stderr.decode())
        raise ValueError(f"FFmpeg audio extraction failed: {e.stderr.decode()}")
    finally:
        # Always clean up the temporary video file
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"Removed temporary video file: {video_path}")