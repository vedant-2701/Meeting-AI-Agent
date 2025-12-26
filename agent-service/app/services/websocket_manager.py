"""
WebSocket connection management and message handling.
Separates WebSocket logic from endpoint routing for better modularity.
"""
from typing import List, Optional, Callable, Dict, Any
from fastapi import WebSocket
from datetime import datetime
import uuid
import json


class WebSocketManager:
    """
    Manages a single WebSocket connection with message handling capabilities.
    """
    
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.connection_id: str = f"ws_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        self.is_connected: bool = False
        
        # Message handlers registry
        self._message_handlers: Dict[str, Callable] = {}
    
    async def connect(self) -> None:
        """Accept WebSocket connection."""
        await self.websocket.accept()
        self.is_connected = True
        print(f"✅ WebSocket {self.connection_id} connected")
    
    async def disconnect(self) -> None:
        """Close WebSocket connection gracefully."""
        if self.is_connected:
            try:
                await self.websocket.close()
            except:
                pass
            finally:
                self.is_connected = False
                print(f"🔌 WebSocket {self.connection_id} disconnected")
    
    async def send_text(self, message: str) -> bool:
        """
        Send text message to client.
        
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.is_connected:
            print("⚠️  Cannot send message: WebSocket not connected")
            return False
        
        try:
            await self.websocket.send_text(message)
            return True
        except Exception as e:
            print(f"❌ Error sending text message: {e}")
            return False
    
    async def send_json(self, data: Dict[str, Any]) -> bool:
        """
        Send JSON message to client.
        
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            message = json.dumps(data)
            return await self.send_text(message)
        except Exception as e:
            print(f"❌ Error sending JSON message: {e}")
            return False
    
    async def receive(self) -> Optional[Dict[str, Any]]:
        """
        Receive message from client.
        
        Returns:
            Dictionary with 'type' and 'data' keys, or None if connection closed
        """
        try:
            data = await self.websocket.receive()
            return data
        except RuntimeError as e:
            print(f"Connection closed: {e}")
            self.is_connected = False
            return None
        except Exception as e:
            print(f"❌ Error receiving message: {e}")
            return None
    
    def register_handler(self, message_type: str, handler: Callable) -> None:
        """
        Register a handler for a specific message type.
        
        Args:
            message_type: Type of message to handle (e.g., 'USER_CHAT_TEXT')
            handler: Async function to handle the message
        """
        self._message_handlers[message_type] = handler
        print(f"📝 Registered handler for '{message_type}'")
    
    async def handle_message(self, message_type: str, payload: Any) -> None:
        """
        Route message to appropriate handler.
        
        Args:
            message_type: Type of message
            payload: Message payload
        """
        handler = self._message_handlers.get(message_type)
        if handler:
            try:
                await handler(self, payload)
            except Exception as e:
                print(f"❌ Error in handler for '{message_type}': {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"⚠️  No handler registered for message type: '{message_type}'")


class AudioStreamManager:
    """
    Manages audio streaming for a WebSocket connection.
    Handles audio chunk accumulation and processing.
    """
    
    def __init__(self, connection_id: str):
        self.connection_id = connection_id
        self.audio_chunks: List[bytes] = []
        self.chunk_count: int = 0
        self.total_bytes: int = 0
    
    def add_chunk(self, chunk: bytes) -> None:
        """
        Add audio chunk to buffer.
        
        Args:
            chunk: Audio data bytes
        """
        self.audio_chunks.append(chunk)
        self.chunk_count += 1
        self.total_bytes += len(chunk)
        print(f"📦 Audio chunk #{self.chunk_count}: {len(chunk):,} bytes (Total: {self.total_bytes:,} bytes)")
    
    def get_chunks(self) -> List[bytes]:
        """Get all accumulated audio chunks."""
        return self.audio_chunks
    
    def clear_chunks(self) -> None:
        """Clear audio chunk buffer."""
        self.audio_chunks.clear()
        self.chunk_count = 0
        self.total_bytes = 0
        print(f"🗑️ Audio chunks cleared")
    
    def has_audio(self) -> bool:
        """Check if any audio chunks are stored."""
        return len(self.audio_chunks) > 0
    
    def get_stats(self) -> Dict[str, int]:
        """Get statistics about accumulated audio."""
        return {
            "chunk_count": self.chunk_count,
            "total_bytes": self.total_bytes,
            "total_mb": round(self.total_bytes / (1024 * 1024), 2)
        }


class ConnectionPool:
    """
    Manages multiple WebSocket connections.
    Useful for broadcasting messages or tracking active connections.
    """
    
    def __init__(self):
        self.connections: Dict[str, WebSocketManager] = {}
    
    def add(self, manager: WebSocketManager) -> None:
        """Add a WebSocket connection to the pool."""
        self.connections[manager.connection_id] = manager
        print(f"➕ Added connection to pool: {manager.connection_id} (Total: {len(self.connections)})")
    
    def remove(self, connection_id: str) -> None:
        """Remove a WebSocket connection from the pool."""
        if connection_id in self.connections:
            del self.connections[connection_id]
            print(f"➖ Removed connection from pool: {connection_id} (Remaining: {len(self.connections)})")
    
    async def broadcast(self, message: str) -> int:
        """
        Broadcast text message to all connected clients.
        
        Returns:
            Number of clients that received the message
        """
        sent_count = 0
        for manager in self.connections.values():
            if await manager.send_text(message):
                sent_count += 1
        return sent_count
    
    async def broadcast_json(self, data: Dict[str, Any]) -> int:
        """
        Broadcast JSON message to all connected clients.
        
        Returns:
            Number of clients that received the message
        """
        sent_count = 0
        for manager in self.connections.values():
            if await manager.send_json(data):
                sent_count += 1
        return sent_count
    
    def get_active_count(self) -> int:
        """Get number of active connections."""
        return len(self.connections)
    
    def get_connection_ids(self) -> List[str]:
        """Get list of all connection IDs."""
        return list(self.connections.keys())


# Global connection pool instance
connection_pool = ConnectionPool()
