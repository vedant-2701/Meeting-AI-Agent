from fastapi import APIRouter, WebSocket, WebSocketDisconnect

# Create a new router for this endpoint
router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    This is the main WebSocket endpoint for the Chrome Extension (Mode 1).
    It will handle real-time audio and chat.
    """
    await websocket.accept()
    print("WebSocket connection established (Mode 1 Co-Pilot connected).")
    try:
        while True:
            # Wait for a message from the extension
            # This can be either bytes (audio) or text (JSON)
            data = await websocket.receive()

            if "bytes" in data:
                # This is an audio chunk
                audio_chunk = data["bytes"]
                print(f"Received {len(audio_chunk)} bytes of audio data.")
                
                # TODO: 1. Add audio_chunk to a Queue
                # TODO: 2. A background worker pulls from queue
                # TODO: 3. Worker sends chunk to Whisper
                # TODO: 4. Get transcript back from Whisper
                
                # For now, just send a simple text pong
                await websocket.send_text("Audio chunk received")

            elif "text" in data:
                # This is a text message (e.g., from the chat box)
                message_data = data["text"]
                print(f"Received text message: {message_data}")
                
                # In the future, we'll parse this JSON
                # e.g., msg = json.loads(message_data)
                # if msg['type'] == 'USER_CHAT_TEXT':
                #    send_to_gemini(msg['payload'])

                # For now, just echo it back
                await websocket.send_text(f"You said: {message_data}")

    except WebSocketDisconnect:
        print("WebSocket connection closed.")
    except Exception as e:
        print(f"An error occurred in the WebSocket: {e}")
    finally:
        print("Client disconnected.")