"""
Transcription service using faster-whisper for audio-to-text conversion.
"""
import os
from typing import Optional, Dict, List
from datetime import datetime
from faster_whisper import WhisperModel
from app.core.config import AUDIO_DIR, TRANSCRIPTS_DIR

# Initialize the Whisper model (singleton pattern for efficiency)
_whisper_model: Optional[WhisperModel] = None


def get_whisper_model(model_size: str = "base") -> WhisperModel:
    """
    Get or initialize the Whisper model.
    Uses singleton pattern to avoid loading model multiple times.
    
    Args:
        model_size: Model size (tiny, base, small, medium, large-v2, large-v3)
                   - tiny: Fastest, least accurate
                   - base: Good balance (default)
                   - small: Better accuracy
                   - medium/large: Best accuracy, slower
    
    Returns:
        WhisperModel instance
    """
    global _whisper_model
    
    if _whisper_model is None:
        print(f"🔄 Loading Whisper model ({model_size})...")
        try:
            # Initialize model with GPU if available, otherwise CPU
            _whisper_model = WhisperModel(
                model_size,
                device="cuda",  # Will fallback to CPU if CUDA not available
                compute_type="float16"  # Use float16 for GPU, auto-converts to float32 on CPU
            )
            print(f"✅ Whisper model loaded successfully!")
        except Exception as e:
            print(f"⚠️  GPU not available, loading model on CPU...")
            _whisper_model = WhisperModel(
                model_size,
                device="cpu",
                compute_type="int8"  # More efficient on CPU
            )
            print(f"✅ Whisper model loaded on CPU")
    
    return _whisper_model


def transcribe_audio(
    audio_path: str,
    language: Optional[str] = None,
    task: str = "transcribe",
    beam_size: int = 5,
    vad_filter: bool = True
) -> Dict[str, any]:
    """
    Transcribe audio file to text using faster-whisper.
    
    Args:
        audio_path: Path to audio file (WAV, MP3, etc.)
        language: Source language code (e.g., 'en', 'es'). None for auto-detection.
        task: 'transcribe' or 'translate' (translate to English)
        beam_size: Beam search size (higher = more accurate but slower)
        vad_filter: Use Voice Activity Detection to filter out silence
    
    Returns:
        Dictionary containing:
            - text: Full transcription text
            - segments: List of segment details (text, start, end, confidence)
            - language: Detected language
            - duration: Audio duration in seconds
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")
    
    print(f"🎙️ Transcribing audio: {os.path.basename(audio_path)}")
    print(f"   Language: {language or 'auto-detect'}")
    print(f"   Task: {task}")
    print(f"   VAD filter: {vad_filter}")
    
    # Get model
    model = get_whisper_model()
    
    # Transcribe
    segments, info = model.transcribe(
        audio_path,
        language=language,
        task=task,
        beam_size=beam_size,
        vad_filter=vad_filter,
        word_timestamps=False  # Set to True if you need word-level timestamps
    )
    
    # Convert generator to list and extract information
    segments_list = []
    full_text = []
    
    print(f"📝 Processing segments...")
    for segment in segments:
        segment_data = {
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
            "confidence": round(segment.avg_logprob, 3) if hasattr(segment, 'avg_logprob') else None
        }
        segments_list.append(segment_data)
        full_text.append(segment.text.strip())
        
        # Log progress for longer transcriptions
        if len(segments_list) % 10 == 0:
            print(f"   Processed {len(segments_list)} segments...")
    
    result = {
        "text": " ".join(full_text),
        "segments": segments_list,
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration": round(info.duration, 2),
        "segment_count": len(segments_list)
    }
    
    print(f"✅ Transcription complete!")
    print(f"   Language: {result['language']} (confidence: {result['language_probability']})")
    print(f"   Duration: {result['duration']}s")
    print(f"   Segments: {result['segment_count']}")
    print(f"   Text length: {len(result['text'])} characters")
    
    return result


def save_transcript(
    transcript_data: Dict[str, any],
    meeting_id: str,
    format: str = "txt"
) -> str:
    """
    Save transcript to file.
    
    Args:
        transcript_data: Transcription result from transcribe_audio()
        meeting_id: Meeting identifier
        format: Output format ('txt', 'json', 'srt', 'vtt')
    
    Returns:
        Path to saved transcript file
    """
    safe_filename = meeting_id.split('/')[-1].replace('?', '-').replace('=', '-')
    
    if format == "txt":
        output_path = os.path.join(TRANSCRIPTS_DIR, f"{safe_filename}.txt")
        with open(output_path, 'w', encoding='utf-8') as f:
            # Write header
            f.write(f"Meeting Transcript - {safe_filename}\n")
            f.write(f"{'=' * 80}\n")
            f.write(f"Language: {transcript_data['language']}\n")
            f.write(f"Duration: {transcript_data['duration']}s\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"{'=' * 80}\n\n")
            
            # Write full text
            f.write("FULL TRANSCRIPT:\n")
            f.write("-" * 80 + "\n")
            f.write(transcript_data['text'])
            f.write("\n\n")
            
            # Write segments with timestamps
            f.write("TIMESTAMPED SEGMENTS:\n")
            f.write("-" * 80 + "\n")
            for segment in transcript_data['segments']:
                timestamp = format_timestamp(segment['start'])
                f.write(f"[{timestamp}] {segment['text']}\n")
    
    elif format == "json":
        import json
        output_path = os.path.join(TRANSCRIPTS_DIR, f"{safe_filename}.json")
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(transcript_data, f, indent=2, ensure_ascii=False)
    
    elif format == "srt":
        output_path = os.path.join(TRANSCRIPTS_DIR, f"{safe_filename}.srt")
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(transcript_data['segments'], 1):
                f.write(f"{i}\n")
                f.write(f"{format_srt_timestamp(segment['start'])} --> {format_srt_timestamp(segment['end'])}\n")
                f.write(f"{segment['text']}\n\n")
    
    elif format == "vtt":
        output_path = os.path.join(TRANSCRIPTS_DIR, f"{safe_filename}.vtt")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("WEBVTT\n\n")
            for segment in transcript_data['segments']:
                f.write(f"{format_vtt_timestamp(segment['start'])} --> {format_vtt_timestamp(segment['end'])}\n")
                f.write(f"{segment['text']}\n\n")
    
    else:
        raise ValueError(f"Unsupported format: {format}")
    
    print(f"💾 Transcript saved: {output_path}")
    return output_path


def format_timestamp(seconds: float) -> str:
    """Format seconds to HH:MM:SS"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def format_srt_timestamp(seconds: float) -> str:
    """Format seconds to SRT timestamp (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_vtt_timestamp(seconds: float) -> str:
    """Format seconds to WebVTT timestamp (HH:MM:SS.mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def transcribe_and_save(
    audio_path: str,
    meeting_id: str,
    language: Optional[str] = None,
    formats: List[str] = ["txt", "json"]
) -> Dict[str, str]:
    """
    Convenience function to transcribe audio and save in multiple formats.
    
    Args:
        audio_path: Path to audio file
        meeting_id: Meeting identifier
        language: Source language (None for auto-detect)
        formats: List of output formats
    
    Returns:
        Dictionary mapping format to file path
    """
    # Transcribe
    transcript_data = transcribe_audio(audio_path, language=language)
    
    # Save in requested formats
    saved_files = {}
    for fmt in formats:
        try:
            file_path = save_transcript(transcript_data, meeting_id, format=fmt)
            saved_files[fmt] = file_path
        except Exception as e:
            print(f"❌ Failed to save {fmt} format: {e}")
    
    return saved_files
