# Audio Transcription & WebSocket Services

## Overview

This modular implementation handles:
- WebSocket connections for real-time communication
- Audio streaming and processing
- Automatic speech-to-text transcription using faster-whisper
- Multi-format transcript generation (TXT, JSON, SRT, VTT)

## Architecture

### Service Layer (`app/services/`)

#### 1. **websocket_manager.py**
Manages WebSocket connections and communication.

**Classes:**
- `WebSocketManager`: Single connection management
  - `connect()`: Accept WebSocket connection
  - `disconnect()`: Close connection gracefully
  - `send_text()`: Send text message
  - `send_json()`: Send JSON message
  - `receive()`: Receive messages
  
- `AudioStreamManager`: Audio chunk accumulation
  - `add_chunk()`: Buffer audio data
  - `get_chunks()`: Retrieve all chunks
  - `clear_chunks()`: Reset buffer
  - `get_stats()`: Get audio statistics

- `ConnectionPool`: Manage multiple connections
  - `add()`: Register new connection
  - `remove()`: Unregister connection
  - `broadcast()`: Send to all clients
  - `get_active_count()`: Count active connections

#### 2. **message_handlers.py**
Business logic for different message types.

**Functions:**
- `handle_audio_data()`: Process incoming audio chunks
- `handle_audio_complete()`: Save audio + generate transcript
- `handle_user_message()`: Process user chat messages
- `handle_end_stream()`: Handle stream termination

#### 3. **transcription.py**
Speech-to-text conversion using faster-whisper.

**Main Functions:**
- `get_whisper_model()`: Singleton model loader (GPU/CPU)
- `transcribe_audio()`: Convert audio → text with timestamps
- `save_transcript()`: Export in multiple formats
- `transcribe_and_save()`: One-shot transcription + save

**Features:**
- Auto-language detection
- GPU acceleration (CUDA) with CPU fallback
- Voice Activity Detection (VAD) for silence filtering
- Multiple output formats: TXT, JSON, SRT, VTT
- Detailed segment-level timestamps

#### 4. **audio.py**
Audio processing and format conversion.

**Functions:**
- `process_audio_stream()`: WebM → WAV conversion
- `extract_audio_from_video()`: Video → audio extraction

### Folder Structure

```
agent_data/
├── saved_audio/          # WAV audio files
│   ├── meeting_20241112_143022_abc123.wav
│   └── meeting_20241112_143022_abc123.webm
├── transcripts/          # Generated transcripts
│   ├── meeting_20241112_143022_abc123.txt
│   ├── meeting_20241112_143022_abc123.json
│   ├── meeting_20241112_143022_abc123.srt
│   └── meeting_20241112_143022_abc123.vtt
└── temp_video/           # Temporary video files
```

## Usage

### WebSocket Endpoint: `/ws`

#### Audio Streaming
```javascript
// Send binary audio data
websocket.send(audioBlob);

// Server automatically:
// 1. Accumulates audio chunks
// 2. Converts WebM → WAV
// 3. Generates transcript
// 4. Sends transcript back
```

#### Text Messages
```javascript
// Send JSON message
websocket.send(JSON.stringify({
  type: "USER_CHAT_TEXT",
  payload: "Hello, agent!"
}));

// Receive response
{
  "type": "AGENT_REPLY",
  "payload": "Agent received: Hello, agent!"
}
```

#### Server Messages

**Audio Saved:**
```json
{
  "type": "AUDIO_SAVED",
  "message": "Audio saved successfully",
  "audio_path": "/path/to/audio.wav"
}
```

**Transcription Started:**
```json
{
  "type": "TRANSCRIPTION_STARTED",
  "message": "Generating transcript..."
}
```

**Transcription Complete:**
```json
{
  "type": "TRANSCRIPTION_COMPLETE",
  "message": "Transcript generated successfully",
  "transcript_files": {
    "txt": "/path/to/transcript.txt",
    "json": "/path/to/transcript.json"
  },
  "transcript_text": "Full transcript text..."
}
```

**Error:**
```json
{
  "type": "ERROR",
  "message": "Error description"
}
```

## Configuration

### Model Selection

In `transcription.py`, change model size:

```python
model = get_whisper_model("base")  # Options: tiny, base, small, medium, large-v3
```

**Model Comparison:**
- `tiny`: Fastest, least accurate (~1GB RAM)
- `base`: **Default** - Good balance (~1GB RAM)
- `small`: Better accuracy (~2GB RAM)
- `medium`: High accuracy (~5GB RAM)
- `large-v3`: Best accuracy (~10GB RAM)

### GPU Acceleration

The system automatically uses GPU if available:
- CUDA-enabled GPU → faster-whisper uses GPU
- No GPU → falls back to CPU with optimized int8 quantization

## Transcript Formats

### TXT Format
```
Meeting Transcript - meeting_20241112_143022_abc123
================================================================================
Language: en
Duration: 125.5s
Generated: 2024-11-12 14:32:45
================================================================================

FULL TRANSCRIPT:
--------------------------------------------------------------------------------
This is the full transcript text...

TIMESTAMPED SEGMENTS:
--------------------------------------------------------------------------------
[00:00:00] Hello, everyone.
[00:00:05] Let's discuss the project...
```

### JSON Format
```json
{
  "text": "Full transcript text",
  "segments": [
    {
      "start": 0.0,
      "end": 2.5,
      "text": "Hello, everyone.",
      "confidence": 0.95
    }
  ],
  "language": "en",
  "language_probability": 0.98,
  "duration": 125.5,
  "segment_count": 45
}
```

### SRT Format (Subtitles)
```
1
00:00:00,000 --> 00:00:02,500
Hello, everyone.

2
00:00:02,500 --> 00:00:05,000
Let's discuss the project.
```

### VTT Format (WebVTT)
```
WEBVTT

00:00:00.000 --> 00:00:02.500
Hello, everyone.

00:00:02.500 --> 00:00:05.000
Let's discuss the project.
```

## Error Handling

All services include comprehensive error handling:
- Connection failures → graceful disconnect
- Audio processing errors → error message to client
- Transcription failures → detailed error logs
- Invalid messages → appropriate error responses

## Performance

### Audio Processing
- WebM validation before conversion
- Efficient chunk accumulation in memory
- FFmpeg-based conversion (~1-2 seconds for 5 minutes of audio)

### Transcription
- **Base model on CPU**: ~2x real-time (10 min audio → ~5 min processing)
- **Base model on GPU**: ~10x real-time (10 min audio → ~1 min processing)
- **Large model on GPU**: ~3x real-time (10 min audio → ~3 min processing)

## Dependencies

```txt
faster-whisper  # Speech recognition
ffmpeg-python   # Audio conversion
fastapi         # WebSocket framework
```

## Future Enhancements

- [ ] Real-time streaming transcription (word-by-word)
- [ ] Speaker diarization (who said what)
- [ ] Multi-language support with translation
- [ ] Custom vocabulary/domain adaptation
- [ ] AI agent integration for intelligent responses
