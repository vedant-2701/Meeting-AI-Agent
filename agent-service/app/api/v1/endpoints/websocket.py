# from fastapi import APIRouter, WebSocket, WebSocketDisconnect
# from typing import List
# import json
# import base64 # Import base64 library
# from app.services.audio import process_audio_stream
# import uuid

# router = APIRouter()

# class ConnectionManager:
#     def __init__(self, websocket: WebSocket):
#         self.websocket = websocket
#         self.audio_chunks: List[bytes] = []
#         self.connection_id: str = f"ws_{uuid.uuid4()}"

#     async def connect(self):
#         await self.websocket.accept()
#         print(f"WebSocket connection {self.connection_id} established.")

#     def disconnect(self):
#         print(f"WebSocket {self.connection_id} disconnected.")
#         print(f"Total chunks received: {len(self.audio_chunks)}")
        
#         if self.audio_chunks:
#             print(f"Buffering {len(self.audio_chunks)} audio chunks into a .wav file...")
#             try:
#                 process_audio_stream(self.audio_chunks, self.connection_id)
#                 print("File saving complete.")
#             except Exception as e:
#                 print(f"Could not save audio file: {e}")
#         else:
#             print("No audio chunks received, nothing to save.")

#     async def receive_text(self) -> str:
#         return await self.websocket.receive_text()

#     async def send_text(self, message: str):
#         await self.websocket.send_text(message)
    
#     def add_audio_chunk(self, chunk_data: str):
#         # Decode the Base64 string into raw bytes
#         try:
#             # *** --- THIS IS THE FIX --- ***
#             # The payload is "data:audio/webm;codecs=opus;base64,..."
#             # We split at the comma and take the second part
#             header, data = chunk_data.split(',', 1)
#             audio_bytes = base64.b64decode(data)
#             # *** --- END OF FIX --- ***
            
#             self.audio_chunks.append(audio_bytes)
#             print(f"Received and stored {len(audio_bytes)} bytes of audio data.")
#         except Exception as e:
#             # This will catch the "not enough values to unpack" error
#             print(f"Error decoding base64 audio chunk: {e}")


# @router.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     """
#     This endpoint is for the Chrome Extension.
#     It now handles text commands AND audio chunks.
#     """
#     manager = ConnectionManager(websocket)
#     await manager.connect()
#     print(manager.websocket.__dir__())
    
#     try:
#         while True:
#             # Wait for a text message from the extension
#             message_data = await manager.receive_text()
#             # message_data = await manager.websocket
#             print(message_data)
            
#             try:
#                 # Parse the JSON message
#                 message_json = json.loads(message_data)
#                 msg_type = message_json.get("type")

#                 # *** --- THIS IS THE FIX --- ***
#                 if msg_type == "AUDIO_CHUNK":
#                     # The payload is the Base64 data URL
#                     manager.add_audio_chunk(message_json.get("payload"))
#                 # *** --- END OF FIX --- ***
                
#                 elif msg_type == "END_STREAM":
#                     print("Received END_STREAM message. Closing connection.")
#                     break # Exit the loop
                
#                 elif msg_type == "USER_CHAT_TEXT":
#                     user_message = message_json.get("payload", "")
#                     print(f"Received chat message: {user_message}")
#                     reply = f"You said: {user_message}"
#                     await manager.send_text(json.dumps({
#                         "type": "AGENT_REPLY",
#                         "payload": reply
#                     }))
                
#                 else:
#                     print(f"Received unknown message type: {msg_type}")

#             except json.JSONDecodeError:
#                 print(f"Received non-JSON text message: {message_data}")
#                 await manager.send_text(json.dumps({
#                     "type": "ERROR",
#                     "message": "Invalid JSON"
#                 }))

#     except WebSocketDisconnect:
#         print("WebSocket connection closed by client.")
#     except Exception as e:
#         print(f"An error occurred in the WebSocket: {e}")
#     finally:
#         manager.disconnect()


from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import uuid
import os
from datetime import datetime
from app.services.audio import process_audio_stream

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
                
                # Handle special commands
                if message.lower() == "stop" or message.lower() == "end":
                    print("🛑 Stop command received. Closing connection...")
                    break
                
                await websocket.send_text(f"Echo: {message}")

    except WebSocketDisconnect:
        print("🔌 WebSocket connection closed by client.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        manager.disconnect()