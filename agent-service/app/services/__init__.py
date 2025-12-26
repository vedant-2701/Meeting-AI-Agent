"""
Services module - Business logic and utility services.

This module contains:
- audio.py: Audio processing and format conversion
- transcription.py: Speech-to-text using faster-whisper
- websocket_manager.py: WebSocket connection management
- message_handlers.py: WebSocket message routing and handling
"""

from app.services.audio import process_audio_stream, extract_audio_from_video
from app.services.transcription import transcribe_audio, transcribe_and_save, get_whisper_model
from app.services.websocket_manager import WebSocketManager, AudioStreamManager, ConnectionPool, connection_pool
from app.services.message_handlers import MESSAGE_HANDLERS

__all__ = [
    # Audio processing
    "process_audio_stream",
    "extract_audio_from_video",
    
    # Transcription
    "transcribe_audio",
    "transcribe_and_save",
    "get_whisper_model",
    
    # WebSocket management
    "WebSocketManager",
    "AudioStreamManager",
    "ConnectionPool",
    "connection_pool",
    
    # Message handlers
    "MESSAGE_HANDLERS",
]
