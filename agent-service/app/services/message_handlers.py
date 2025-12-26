"""
WebSocket message handlers.
Contains business logic for different message types.
"""
import json
from typing import Any
from app.services.websocket_manager import WebSocketManager
from app.services.audio import process_audio_stream
from app.services.transcription import transcribe_and_save


async def handle_audio_data(ws_manager: WebSocketManager, audio_manager, audio_chunk: bytes) -> None:
    """
    Handle incoming audio data.
    
    Args:
        ws_manager: WebSocket manager instance
        audio_manager: Audio stream manager instance
        audio_chunk: Raw audio data bytes
    """
    # Add chunk to audio manager
    audio_manager.add_chunk(audio_chunk)
    
    # Send acknowledgment
    await ws_manager.send_text(f"✓ Received audio data: {len(audio_chunk):,} bytes")
    
    # Get stats
    stats = audio_manager.get_stats()
    print(f"📊 Audio stats: {stats['chunk_count']} chunks, {stats['total_mb']} MB")


async def handle_audio_complete(ws_manager: WebSocketManager, audio_manager) -> None:
    """
    Process complete audio stream when recording stops.
    Converts to WAV and generates transcript.
    
    Args:
        ws_manager: WebSocket manager instance
        audio_manager: Audio stream manager instance
    """
    if not audio_manager.has_audio():
        print("⚠️  No audio to process")
        await ws_manager.send_json({
            "type": "ERROR",
            "message": "No audio data received"
        })
        return
    
    try:
        # Step 1: Save and convert audio
        print(f"💾 Processing {audio_manager.chunk_count} audio chunks...")
        audio_path = process_audio_stream(
            audio_manager.get_chunks(),
            audio_manager.connection_id
        )
        
        if not audio_path:
            raise Exception("Failed to save audio file")
        
        await ws_manager.send_json({
            "type": "AUDIO_SAVED",
            "message": f"Audio saved successfully",
            "audio_path": audio_path
        })
        
        # Step 2: Generate transcript
        print(f"🎙️ Generating transcript...")
        await ws_manager.send_json({
            "type": "TRANSCRIPTION_STARTED",
            "message": "Generating transcript..."
        })
        
        # Transcribe and save in multiple formats
        transcript_files = transcribe_and_save(
            audio_path=audio_path,
            meeting_id=audio_manager.connection_id,
            language=None,  # Auto-detect
            formats=["txt", "json"]
        )
        
        # Send transcript to client
        # Read the text file
        txt_file = transcript_files.get("txt")
        if txt_file:
            with open(txt_file, 'r', encoding='utf-8') as f:
                transcript_text = f.read()
            
            await ws_manager.send_json({
                "type": "TRANSCRIPTION_COMPLETE",
                "message": "Transcript generated successfully",
                "transcript_files": transcript_files,
                "transcript_text": transcript_text
            })
            
            print(f"✅ Transcription complete!")
            print(f"   Files: {transcript_files}")
        else:
            raise Exception("Failed to generate transcript")
        
    except Exception as e:
        print(f"❌ Error processing audio: {e}")
        import traceback
        traceback.print_exc()
        
        await ws_manager.send_json({
            "type": "ERROR",
            "message": f"Failed to process audio: {str(e)}"
        })
    finally:
        # Clear audio chunks
        audio_manager.clear_chunks()


async def handle_user_message(ws_manager: WebSocketManager, payload: Any) -> None:
    """
    Handle user text message.
    
    Args:
        ws_manager: WebSocket manager instance
        payload: Message payload (should contain 'type' and 'payload' keys)
    """
    if isinstance(payload, str):
        user_message = payload
    elif isinstance(payload, dict):
        user_message = payload.get("payload", "")
    else:
        user_message = str(payload)
    
    print(f"💬 User message: {user_message}")
    
    # TODO: Integrate with AI agent here
    # For now, just echo back
    reply = f"Agent received: {user_message}"
    
    await ws_manager.send_json({
        "type": "AGENT_REPLY",
        "payload": reply
    })
    
    print(f"📤 Sent reply: {reply}")


async def handle_end_stream(ws_manager: WebSocketManager, payload: Any) -> None:
    """
    Handle end stream command.
    
    Args:
        ws_manager: WebSocket manager instance
        payload: Message payload
    """
    print("🛑 End stream command received")
    await ws_manager.send_json({
        "type": "STREAM_ENDED",
        "message": "Stream ended successfully"
    })
    
    # Signal to close connection
    await ws_manager.disconnect()


# Message type to handler mapping
MESSAGE_HANDLERS = {
    "USER_CHAT_TEXT": handle_user_message,
    "END_STREAM": handle_end_stream,
}
