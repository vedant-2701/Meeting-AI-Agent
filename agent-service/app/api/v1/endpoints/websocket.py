from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
from app.services.websocket_manager import WebSocketManager, AudioStreamManager, connection_pool
from app.services.message_handlers import (
    handle_audio_data,
    handle_audio_complete,
    handle_user_message,
    handle_end_stream,
    MESSAGE_HANDLERS
)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time communication.
    Handles audio streaming, text messages, and transcription.
    """
    # Initialize managers
    ws_manager = WebSocketManager(websocket)
    audio_manager = AudioStreamManager(ws_manager.connection_id)
    
    # Connect WebSocket
    await ws_manager.connect()
    
    # Add to connection pool
    connection_pool.add(ws_manager)
    
    try:
        while ws_manager.is_connected:
            # Receive message
            data = await ws_manager.receive()
            
            if data is None:
                # Connection closed
                break
            
            # Handle binary audio data
            if "bytes" in data:
                audio_chunk = data["bytes"]
                await handle_audio_data(ws_manager, audio_manager, audio_chunk)
            
            # Handle text messages
            elif "text" in data:
                message = data["text"]
                print(f"📝 Received text message: {message}")
                
                # Try to parse as JSON
                try:
                    message_json = json.loads(message)
                    msg_type = message_json.get("type")
                    payload = message_json.get("payload")
                    
                    # Route to appropriate handler
                    handler = MESSAGE_HANDLERS.get(msg_type)
                    if handler:
                        await handler(ws_manager, payload)
                        
                        # If END_STREAM, break the loop
                        if msg_type == "END_STREAM":
                            break
                    else:
                        print(f"⚠️  Unknown message type: {msg_type}")
                        await ws_manager.send_json({
                            "type": "ERROR",
                            "message": f"Unknown message type: {msg_type}"
                        })
                
                except json.JSONDecodeError:
                    # Not JSON, treat as plain text command
                    print(f"📝 Plain text: {message}")
                    
                    if message.lower() in ["stop", "end"]:
                        print("🛑 Stop command received")
                        break
                    else:
                        # Echo back
                        await ws_manager.send_text(f"Echo: {message}")
    
    except WebSocketDisconnect:
        print(f"🔌 Client disconnected: {ws_manager.connection_id}")
    
    except Exception as e:
        print(f"❌ Error in WebSocket connection: {e}")
        import traceback
        traceback.print_exc()
        
        # Send error to client if still connected
        if ws_manager.is_connected:
            await ws_manager.send_json({
                "type": "ERROR",
                "message": f"Server error: {str(e)}"
            })
    
    finally:
        # Process any remaining audio before disconnecting
        if audio_manager.has_audio():
            print(f"📦 Processing remaining audio before disconnect...")
            await handle_audio_complete(ws_manager, audio_manager)
        
        # Remove from connection pool
        connection_pool.remove(ws_manager.connection_id)
        
        # Disconnect
        await ws_manager.disconnect()