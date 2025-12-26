# Setup and Installation Guide

## Prerequisites

- Python 3.8+
- FFmpeg installed and configured (see config.py)
- (Optional) CUDA-enabled GPU for faster transcription

## Installation Steps

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Verify FFmpeg Path

Edit `app/core/config.py` and set your FFmpeg path:

```python
FFMPEG_PATH = r"D:\ffmpeg-n8.0-latest-win64-gpl-8.0\bin\ffmpeg.exe"
```

### 3. Test Installation

```python
# Test faster-whisper installation
python -c "from faster_whisper import WhisperModel; print('✅ faster-whisper installed')"

# Test FFmpeg
python -c "import ffmpeg; print('✅ ffmpeg-python installed')"
```

### 4. First Run

The first time you run the server, faster-whisper will download the model files (~150MB for base model):

```bash
python run.py
```

Model files are cached in: `~/.cache/huggingface/hub/`

## GPU Setup (Optional but Recommended)

### For NVIDIA GPUs:

1. Install CUDA Toolkit 11.8 or 12.x
2. Install cuBLAS and cuDNN
3. Verify CUDA installation:

```bash
python -c "import torch; print('CUDA available:', torch.cuda.is_available())"
```

### Performance Comparison:

| Model | CPU (Intel i7) | GPU (RTX 3060) |
|-------|----------------|----------------|
| tiny  | 1x real-time   | 20x real-time  |
| base  | 0.5x real-time | 10x real-time  |
| small | 0.3x real-time | 7x real-time   |
| medium| 0.1x real-time | 4x real-time   |

## Troubleshooting

### Issue: "Could not load library libcudnn_ops_infer.so.8"

**Solution:**
```bash
pip install nvidia-cudnn-cu11
```

### Issue: "Model download fails"

**Solution:**
Manually download model from HuggingFace:
```bash
# For base model
wget https://huggingface.co/Systran/faster-whisper-base/resolve/main/model.bin
```

### Issue: "FFmpeg not found"

**Solution:**
1. Download FFmpeg: https://ffmpeg.org/download.html
2. Extract to a permanent location
3. Update FFMPEG_PATH in config.py

### Issue: "Out of memory" during transcription

**Solution:**
1. Use a smaller model: `tiny` or `base`
2. Enable int8 quantization (CPU) or float16 (GPU)
3. Reduce beam_size parameter

## Model Selection Guide

Choose based on your needs:

### Development/Testing
- **Model**: `tiny` or `base`
- **Reason**: Fast downloads, quick testing
- **Accuracy**: Good enough for development

### Production (English only)
- **Model**: `base` or `small`
- **Reason**: Good balance of speed and accuracy
- **Accuracy**: ~90% for clear audio

### Production (Multi-language)
- **Model**: `small` or `medium`
- **Reason**: Better language detection
- **Accuracy**: ~95% for clear audio

### High-accuracy Requirements
- **Model**: `large-v3`
- **Reason**: Best possible accuracy
- **Accuracy**: ~98% for clear audio
- **Note**: Requires GPU or very long processing time

## Testing the Services

### Test WebSocket Connection:

```python
import websockets
import asyncio

async def test():
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri) as ws:
        # Send test message
        await ws.send('{"type": "USER_CHAT_TEXT", "payload": "Hello"}')
        response = await ws.recv()
        print(response)

asyncio.run(test())
```

### Test Audio Transcription:

```python
from app.services.transcription import transcribe_and_save

# Transcribe an audio file
result = transcribe_and_save(
    audio_path="path/to/audio.wav",
    meeting_id="test_meeting",
    formats=["txt", "json"]
)

print(f"Transcript saved: {result}")
```

### Test Audio Processing:

```python
from app.services.audio import process_audio_stream

# Convert WebM to WAV
with open("audio.webm", "rb") as f:
    chunks = [f.read()]

wav_path = process_audio_stream(chunks, "test_audio")
print(f"WAV file: {wav_path}")
```

## Configuration Options

### Transcription Settings (in transcription.py):

```python
# Adjust these for your needs:
model_size = "base"        # tiny, base, small, medium, large-v3
language = None            # None for auto-detect, or "en", "es", etc.
beam_size = 5              # 1-10, higher = more accurate but slower
vad_filter = True          # Filter out silence (recommended)
```

### Audio Settings (in audio.py):

```python
# Output audio format (in process_audio_stream):
sample_rate = "16000"      # 16kHz (recommended for Whisper)
channels = 1               # Mono (required for Whisper)
codec = "pcm_s16le"        # 16-bit PCM (standard WAV)
```

## Monitoring and Logs

The system provides detailed logging:

```
✅ WebSocket ws_20241112_143022_abc123 connected
📦 Audio chunk #1: 32,768 bytes (Total: 32,768 bytes)
💾 Processing 1 audio chunks...
🎙️ Transcribing audio: meeting_20241112_143022_abc123.wav
📝 Processing segments...
✅ Transcription complete!
   Language: en (confidence: 0.980)
   Duration: 125.5s
   Segments: 45
   Text length: 2,450 characters
💾 Transcript saved: agent_data/transcripts/meeting_20241112_143022_abc123.txt
```

## Production Deployment

### Recommendations:

1. **Use GPU**: 10x faster transcription
2. **Load model at startup**: Avoid first-request delay
3. **Set up model caching**: Persist downloaded models
4. **Monitor memory**: Large models require significant RAM
5. **Rate limiting**: Prevent abuse of transcription endpoint
6. **Queue system**: Handle multiple concurrent transcriptions

### Environment Variables:

```bash
# .env file
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cuda
TRANSCRIPTION_FORMATS=txt,json,srt
MAX_AUDIO_DURATION=3600  # 1 hour limit
```

## Support

For issues or questions:
1. Check logs in console output
2. Verify FFmpeg configuration
3. Test model loading: `python -c "from app.services.transcription import get_whisper_model; get_whisper_model()"`
4. Check GPU availability: `python -c "import torch; print(torch.cuda.is_available())"`
