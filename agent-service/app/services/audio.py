import ffmpeg
import os
import subprocess
# Import our new config variable
from app.core.config import AUDIO_DIR, TEMP_DIR, FFMPEG_PATH

def extract_audio_from_video(video_path: str, meeting_url: str) -> str:
    """
    (This function is for Mode 2 - unchanged)
    Extracts audio from a video file, converts to 16kHz mono WAV,
    and saves it.
    """
    print(f"Starting audio extraction from {video_path}...")
    
    safe_filename = meeting_url.split('/')[-1].replace('?', '-').replace('=', '-')
    output_audio_path = os.path.join(AUDIO_DIR, f"{safe_filename}.wav")
    
    try:
        # *** --- START OF FFMPEG FIX --- ***
        # We now tell ffmpeg to use the .exe at the specific path
        (
            ffmpeg
            .input(video_path)
            .output(output_audio_path, acodec='pcm_s16le', ar='16000', ac=1)
            # Use the .exe path and capture errors
            .run(cmd=FFMPEG_PATH, overwrite_output=True, capture_stdout=True, capture_stderr=True) 
        )
        # *** --- END OF FFMPEG FIX --- ***
        
        print(f"Audio extraction successful. Saved to {output_audio_path}")
        return output_audio_path
    except ffmpeg.Error as e:
        print("FFmpeg error:", e.stderr.decode())
        raise ValueError(f"FFmpeg audio extraction failed: {e.stderr.decode()}")
    finally:
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"Removed temporary video file: {video_path}")


def process_audio_stream(audio_chunks: list[bytes], meeting_id: str) -> str:
    """
    Receives a list of audio chunks (in webm/opus format),
    stitches them together, and converts to a single WAV file using ffmpeg.
    """
    print(f"Processing {len(audio_chunks)} audio chunks for {meeting_id}...")
    
    safe_filename = meeting_id.split('/')[-1].replace('?', '-').replace('=', '-')
    output_audio_path = os.path.join(AUDIO_DIR, f"LIVE_{safe_filename}.wav")
    
    try:
        # *** --- START OF FFMPEG FIX --- ***
        # We use the .exe path here as well
        process = (
            ffmpeg
            .input('pipe:', format='webm')
            .output(output_audio_path, acodec='pcm_s16le', ar='16000', ac=1)
            # Tell run_async where the ffmpeg.exe is
            .run_async(cmd=FFMPEG_PATH, pipe_stdin=True, pipe_stdout=True, pipe_stderr=True)
        )
        # *** --- END OF FFMPEG FIX --- ***
        
        for chunk in audio_chunks:
            process.stdin.write(chunk)
            
        process.stdin.close()
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            print("FFmpeg error during stream conversion:", stderr.decode())
            raise ValueError("FFmpeg stream conversion failed")
            
        print(f"Live stream audio successfully saved to {output_audio_path}")
        return output_audio_path
        
    except Exception as e:
        print(f"Error processing audio stream: {e}")
        return ""