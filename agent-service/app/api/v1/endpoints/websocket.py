from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import uuid
import os
from datetime import datetime
from app.services.audio import process_audio_stream
import json

router = APIRouter()

class AudioStreamManager:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.audio_chunks: List[bytes] = []
        self.connection_id: str = f"meeting_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        self.chunk_count = 0

    async def connect(self):
        await self.websocket.accept()
        print(f"✅ WebSocket connection {self.connection_id} established.")

    def add_audio_chunk(self, chunk: bytes):
        """Store audio chunk in memory"""
        self.audio_chunks.append(chunk)
        self.chunk_count += 1
        print(f"📦 Chunk #{self.chunk_count}: Received {len(chunk)} bytes (Total: {len(self.audio_chunks)} chunks)")

    def save_audio(self):
        """Save accumulated audio chunks to file"""
        if not self.audio_chunks:
            print("⚠️  No audio chunks to save.")
            return None
        
        print(f"💾 Saving {len(self.audio_chunks)} audio chunks to file...")
        try:
            audio_path = process_audio_stream(self.audio_chunks, self.connection_id)
            print(f"✅ Audio saved successfully: {audio_path}")
            return audio_path
        except Exception as e:
            print(f"❌ Error saving audio: {e}")
            return None

    def disconnect(self):
        """Clean up and save audio on disconnect"""
        print(f"🔌 WebSocket {self.connection_id} disconnected.")
        print(f"📊 Total chunks received: {len(self.audio_chunks)}")
        
        # Save audio on disconnect
        self.save_audio()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
        
    manager = AudioStreamManager(websocket)
    await manager.connect()
    
    try:
        while True:
            # Receive data (binary or text)
            try:
                data = await websocket.receive()
            except RuntimeError as e:
                # Client closed connection
                print(f"Client disconnected: {e}")
                break

            if "bytes" in data:
                # Binary audio data received
                audio_chunk = data["bytes"]
                manager.add_audio_chunk(audio_chunk)
                
                # Acknowledge receipt
                try:
                    await websocket.send_text(f"✓ Received audio data: {len(audio_chunk):,} bytes")
                except:
                    # Client may have already disconnected
                    print("Could not send acknowledgment (client may have disconnected)")
                
                # Process audio after receiving
                print(f"🎵 Processing audio file ({len(audio_chunk):,} bytes)...")
                audio_path = manager.save_audio()
                if audio_path:
                    try:
                        await websocket.send_text(f"✓ Audio saved: {os.path.basename(audio_path)}")
                    except:
                        print("Could not send save confirmation (client disconnected)")

            elif "text" in data:
                # Text message received
                message = data["text"]
                print(f"📝 Received text message: {message}")
                
                # Try to parse as JSON
                try:
                    message_json = json.loads(message)
                    msg_type = message_json.get("type")
                    
                    if msg_type == "USER_CHAT_TEXT":
                        # User sent a chat message
                        user_message = message_json.get("payload", "")
                        print(f"💬 User chat: {user_message}")
                        
                        # Process the message and send reply
                        # TODO: Integrate with AI agent here
                        reply = f"Agent received: {user_message}"
                        
                        response = json.dumps({
                            "type": "AGENT_REPLY",
                            "payload": reply
                        })
                        await websocket.send_text(response)
                        print(f"📤 Sent reply: {reply}")
                    
                    elif msg_type == "END_STREAM":
                        print("🛑 END_STREAM command received. Closing connection...")
                        break
                    
                    else:
                        print(f"⚠️  Unknown message type: {msg_type}")
                        
                except json.JSONDecodeError:
                    # Not JSON, treat as plain text
                    print(f"📝 Plain text: {message}")
                    
                    # Handle special commands
                    if message.lower() == "stop" or message.lower() == "end":
                        print("🛑 Stop command received. Closing connection...")
                        break
                    
                    # Echo back
                    await websocket.send_text(f"Echo: {message}")

    except WebSocketDisconnect:
        print("🔌 WebSocket connection closed by client.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        manager.disconnect()