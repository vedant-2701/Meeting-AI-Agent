import websocket
import json
import time

WS_URL = "ws://localhost:8000/ws"

def test_websocket():
    print(f"Connecting to WebSocket at {WS_URL}...")
    try:
        ws = websocket.create_connection(WS_URL)
        print("✅ Connection successful!")
    except Exception as e:
        print(f"❌ Connection FAILED: {e}")
        print("Is the 'agent-service' (python run.py) running in another terminal?")
        return

    try:
        # --- Test 1: Send a Text (JSON) message ---
        print("\n--- Test 1: Sending Text (JSON) ---")
        test_chat_message = {
            "type": "USER_CHAT_TEXT",
            "payload": "Hello agent, this is a test"
        }
        # The FastAPI server expects a text string, not a JSON object
        ws.send(json.dumps(test_chat_message))
        print(f"Sent: {test_chat_message}")
        
        result = ws.recv()
        print(f"Server response: {result}")
        assert result == f"You said: {json.dumps(test_chat_message)}"
        print("✅ Text test successful!")


        # --- Test 2: Send a Binary (Audio) message ---
        print("\n--- Test 2: Sending Binary (Audio) ---")
        # Create 1024 bytes of fake audio data
        fake_audio_chunk = b'\x01' * 1024 
        
        ws.send_binary(fake_audio_chunk)
        print(f"Sent: {len(fake_audio_chunk)} bytes of audio data")

        result = ws.recv()
        print(f"Server response: {result}")
        assert result == "Audio chunk received"
        print("✅ Audio test successful!")

    except Exception as e:
        print(f"❌ Test FAILED: {e}")
    finally:
        print("\nClosing connection.")
        ws.close()

if __name__ == "__main__":
    # Wait 1 second for the server to be ready (if you just started it)
    time.sleep(1) 
    test_websocket()