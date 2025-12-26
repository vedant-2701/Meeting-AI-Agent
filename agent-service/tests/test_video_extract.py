"""
Test script to extract audio from a video file
"""
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import os
from app.services.audio import extract_audio_from_video
from app.core.config import AUDIO_DIR

def test_extract_audio_from_video():
    video_path = r"E:\Full Stack Projects\Meeting AI Agent\agent-service\agent_data\temp_video\sample3.mp4"
    
    # Check if video exists
    if not os.path.exists(video_path):
        print(f"❌ Video file not found: {video_path}")
        print("\n📝 Please update the 'video_path' variable with your actual video path")
        print("   Supported formats: MP4, MKV, WebM, AVI, MOV, etc.")
        return
    
    print("=" * 60)
    print("🎬 VIDEO TO AUDIO EXTRACTION TEST")
    print("=" * 60)
    
    # Get video filename for meeting_url parameter
    video_filename = os.path.basename(video_path).rsplit('.', 1)[0]
    
    print(f"\n📹 Input video: {video_path}")
    print(f"📁 Output directory: {AUDIO_DIR}")
    
    try:
        # Extract audio from video
        print("\n🔄 Extracting audio...")
        audio_path = extract_audio_from_video(video_path, video_filename)
        
        print("\n" + "=" * 60)
        print("✅ EXTRACTION SUCCESSFUL!")
        print("=" * 60)
        print(f"📁 Audio saved to: {audio_path}")
        
        # Show file size
        if os.path.exists(audio_path):
            size = os.path.getsize(audio_path)
            print(f"📊 File size: {size:,} bytes ({size / 1024 / 1024:.2f} MB)")
            
        # Ask if user wants to transcribe
        print("\n" + "-" * 60)
        print("💡 To transcribe this audio, run:")
        print(f"   python tests/test_transcription.py")
        print(f"   (Update the audio_path in that file to: {audio_path})")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_extract_audio_from_video()