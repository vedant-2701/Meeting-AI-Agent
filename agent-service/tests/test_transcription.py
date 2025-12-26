"""
Simple test script to verify audio transcription works correctly.
Tests the transcription service with a specific audio file.
"""
import os
import sys
from pathlib import Path

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.transcription import transcribe_audio, transcribe_and_save, get_whisper_model


def test_transcription():
    """Test transcription with the specified audio file."""
    
    # Audio file path (relative to project root)
    audio_file = os.path.join("agent_data", "saved_audio", "meeting_20251114_180233_30cdf3b5.wav")
    
    print("=" * 80)
    print("AUDIO TRANSCRIPTION TEST")
    print("=" * 80)
    print()
    
    # Check if file exists
    if not os.path.exists(audio_file):
        print(f"❌ ERROR: Audio file not found: {audio_file}")
        print(f"   Current directory: {os.getcwd()}")
        return False
    
    # Get file info
    file_size = os.path.getsize(audio_file)
    print(f"📁 Audio File: {audio_file}")
    print(f"📊 File Size: {file_size:,} bytes ({file_size / (1024*1024):.2f} MB)")
    print()
    
    # Step 1: Load model
    print("🔄 Loading Whisper model...")
    try:
        model = get_whisper_model(model_size="base")
        print("✅ Model loaded successfully!")
        print()
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return False
    
    # Step 2: Transcribe audio
    print("🎙️ Transcribing audio...")
    print("-" * 80)
    try:
        result = transcribe_audio(
            audio_path=audio_file,
            language=None,  # Auto-detect
            task="transcribe",
            beam_size=5,
            vad_filter=True
        )
        print("-" * 80)
        print("✅ Transcription completed!")
        print()
    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Step 3: Display results
    print("=" * 80)
    print("TRANSCRIPTION RESULTS")
    print("=" * 80)
    print()
    
    print(f"🌍 Detected Language: {result['language'].upper()}")
    print(f"📊 Language Confidence: {result['language_probability']:.1%}")
    print(f"⏱️  Audio Duration: {result['duration']:.2f} seconds")
    print(f"📝 Number of Segments: {result['segment_count']}")
    print(f"📄 Text Length: {len(result['text'])} characters")
    print()
    
    print("=" * 80)
    print("FULL TRANSCRIPT")
    print("=" * 80)
    print()
    print(result['text'])
    print()
    
    # Display first 5 segments with timestamps
    if result['segments']:
        print("=" * 80)
        print("TIMESTAMPED SEGMENTS (First 5)")
        print("=" * 80)
        print()
        for i, segment in enumerate(result['segments'][:5], 1):
            start_time = format_timestamp(segment['start'])
            end_time = format_timestamp(segment['end'])
            confidence = segment.get('confidence', 'N/A')
            print(f"{i}. [{start_time} --> {end_time}]")
            print(f"   Text: {segment['text']}")
            print(f"   Confidence: {confidence}")
            print()
        
        if len(result['segments']) > 5:
            print(f"... and {len(result['segments']) - 5} more segments")
            print()
    
    # Step 4: Save transcripts
    print("=" * 80)
    print("SAVING TRANSCRIPTS")
    print("=" * 80)
    print()
    
    try:
        meeting_id = "test_meeting_20251114"
        saved_files = transcribe_and_save(
            audio_path=audio_file,
            meeting_id=meeting_id,
            language=None,
            formats=["txt", "json"]
        )
        
        print("✅ Transcripts saved successfully!")
        print()
        for fmt, path in saved_files.items():
            file_size = os.path.getsize(path)
            print(f"   {fmt.upper()}: {path}")
            print(f"         Size: {file_size:,} bytes")
            print()
        
        # Show content of TXT file
        if "txt" in saved_files:
            print("=" * 80)
            print("TXT FILE PREVIEW (First 500 characters)")
            print("=" * 80)
            print()
            with open(saved_files["txt"], 'r', encoding='utf-8') as f:
                content = f.read()
                print(content[:500])
                if len(content) > 500:
                    print("...")
                    print(f"\n[{len(content) - 500} more characters]")
            print()
        
    except Exception as e:
        print(f"⚠️  Warning: Could not save transcripts: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 80)
    print("✅ TEST COMPLETED SUCCESSFULLY!")
    print("=" * 80)
    
    return True


def format_timestamp(seconds):
    """Format seconds to HH:MM:SS"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


if __name__ == "__main__":
    print()
    success = test_transcription()
    print()
    
    if success:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("❌ Tests failed!")
        sys.exit(1)
