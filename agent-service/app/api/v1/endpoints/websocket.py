from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json
import uuid

router = APIRouter()

class ConnectionManager:
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.connection_id: str = f"ws_{uuid.uuid4()}"

    async def connect(self):
        await self.websocket.accept()
        print(f"WebSocket connection {self.connection_id} established.")

    def disconnect(self):
        print(f"WebSocket {self.connection_id} disconnected.")

    async def receive_text(self) -> str:
        return await self.websocket.receive_text()

    async def send_text(self, message: str):
        await self.websocket.send_text(message)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    This endpoint is for the Chrome Extension.
    It now *only* handles text-based JSON messages.
    """
    manager = ConnectionManager(websocket)
    await manager.connect()
    
    try:
        while True:
            # Wait for a text message from the extension
            message_data = await manager.receive_text()
            print(f"Received data: {message_data}")

            try:
                # Parse the JSON message
                message_json = json.loads(message_data)
                msg_type = message_json.get("type")

                if msg_type == "USER_CHAT_TEXT":
                    user_message = message_json.get("payload", "")
                    print(f"Received chat message: {user_message}")
                    
                    # --- AI LOGIC WILL GO HERE ---
                    # For now, just send an echo back
                    
                    reply = f"You said: {user_message}"
                    await manager.send_text(json.dumps({
                        "type": "AGENT_REPLY",
                        "payload": reply
                    }))
                
                else:
                    print(f"Received unknown message type: {msg_type}")


            except json.JSONDecodeError:
                print(f"Received non-JSON text message: {message_data}")
                await manager.send_text(json.dumps({
                    "type": "ERROR",
                    "message": "Invalid JSON"
                }))

    except WebSocketDisconnect:
        print("WebSocket connection closed by client.")
    except Exception as e:
        print(f"An error occurred in the WebSocket: {e}")
    finally:
        manager.disconnect()