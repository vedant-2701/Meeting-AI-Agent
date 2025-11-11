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
    Receives audio data (complete webm/opus format),
    and converts it to a WAV file using ffmpeg.
    """
    print(f"🔄 Processing {len(audio_chunks)} audio chunk(s) for {meeting_id}...")
    
    # Calculate total size
    total_size = sum(len(chunk) for chunk in audio_chunks)
    print(f"📊 Total audio data: {total_size:,} bytes ({total_size / 1024 / 1024:.2f} MB)")
    
    if total_size == 0:
        print("⚠️  No audio data to process!")
        return ""
    
    safe_filename = meeting_id.split('/')[-1].replace('?', '-').replace('=', '-')
    output_audio_path = os.path.join(AUDIO_DIR, f"{safe_filename}.wav")
    
    # Keep the webm file for debugging (don't use _temp suffix)
    webm_path = os.path.join(AUDIO_DIR, f"{safe_filename}.webm")
    
    try:
        # Write complete audio data to webm file (kept for debugging)
        print(f"📝 Writing complete audio to WebM file: {webm_path}")
        with open(webm_path, 'wb') as f:
            for i, chunk in enumerate(audio_chunks):
                chunk_size = len(chunk)
                f.write(chunk)
                print(f"   Chunk {i+1}: {chunk_size:,} bytes (first 20 bytes: {chunk[:20].hex() if chunk_size >= 20 else chunk.hex()})")
                if len(audio_chunks) > 1 and (i + 1) % 10 == 0:  # Log progress if multiple chunks
                    print(f"   Written {i + 1}/{len(audio_chunks)} chunks...")
        
        file_size = os.path.getsize(webm_path)
        print(f"✅ WebM file created: {file_size:,} bytes")
        print(f"📁 WebM file saved at: {webm_path}")
        
        # Verify it's a valid WebM file (should start with 0x1A45DFA3)
        with open(webm_path, 'rb') as f:
            header = f.read(4)
            print(f"🔍 File header (hex): {header.hex()}")
            if header[:4] == b'\x1a\x45\xdf\xa3':
                print("✅ Valid WebM/Matroska header detected")
            else:
                print(f"⚠️  WARNING: File doesn't have WebM header! Got: {header.hex()}")
        
        # Now convert the webm file to wav using ffmpeg
        print(f"🎵 Converting webm to wav using ffmpeg...")
        print(f"   Input: {webm_path}")
        print(f"   Output: {output_audio_path}")
        
        # Run ffmpeg conversion with explicit codec settings
        result = (
            ffmpeg
            .input(webm_path)
            .output(
                output_audio_path, 
                acodec='pcm_s16le',  # PCM 16-bit little-endian
                ar='16000',          # 16kHz sample rate
                ac=1,                # Mono (1 channel)
                format='wav'         # Force WAV format
            )
            .overwrite_output()
            .run(cmd=FFMPEG_PATH, capture_stdout=True, capture_stderr=True)
        )
        
        print(f"✅ FFmpeg conversion completed")
        
        # Check if output file was created
        if os.path.exists(output_audio_path):
            output_size = os.path.getsize(output_audio_path)
            print(f"✅ Audio conversion successful!")
            print(f"📁 Output file: {output_audio_path}")
            print(f"📊 Output size: {output_size:,} bytes ({output_size / 1024 / 1024:.2f} MB)")
        else:
            raise ValueError("Output WAV file was not created")
            
        return output_audio_path
        
    except ffmpeg.Error as e:
        print(f"❌ FFmpeg error during stream conversion:")
        print(f"   stderr: {e.stderr.decode() if e.stderr else 'No error output'}")
        raise ValueError(f"FFmpeg stream conversion failed: {e.stderr.decode() if e.stderr else 'Unknown error'}")
        
    except Exception as e:
        print(f"❌ Error processing audio stream: {e}")
        import traceback
        traceback.print_exc()
        raise
        
    finally:
        # Keep the webm file for debugging - don't delete it
        print(f"� WebM file kept for debugging: {webm_path}")
        pass