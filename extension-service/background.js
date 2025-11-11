// background.js

const PYTHON_AGENT_URL = "ws://localhost:8000/ws";

// --- Global State ---
let ws = null;
let activeTabId = null; 

// --- WebSocket Management ---
function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("WebSocket is already open.");
    return;
  }
  
  ws = new WebSocket(PYTHON_AGENT_URL);

  ws.onopen = () => {
    console.log("WebSocket connection established.");
    sendMessageToContentScript(activeTabId, "STATUS_UPDATE", "Connected to agent.");
  };

  ws.onmessage = (event) => {
    // Message received *from* Python
    console.log("Message from agent:", event.data);
    // Forward the message to the content script
    sendMessageToContentScript(activeTabId, "AGENT_REPLY", event.data);
  };

  ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
    sendMessageToContentScript(activeTabId, "STATUS_UPDATE", "Error connecting to agent.");
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed.");
    sendMessageToContentScript(activeTabId, "STATUS_UPDATE", "Disconnected.");
    ws = null; 
  };
}

function stopWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  console.log("WebSocket stopped by user.");
}

// --- Main Message Listener ---
// Listens for messages *from* the content-script.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === "WS_CONNECT") {
    activeTabId = sender.tab.id;
    console.log("Content script requests WebSocket connection...");
    connectWebSocket();
    sendResponse({ status: "connecting" });
  } 
  else if (request.type === "WS_SEND_MESSAGE") {
    activeTabId = sender.tab.id;
    console.log("Content script wants to send message:", request.payload);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(request.payload));
      sendResponse({ status: "message_sent" });
    } else {
      console.warn("WebSocket not open. Cannot send message.");
      sendResponse({ status: "error", message: "WebSocket not open." });
    }
  }
  else if (request.type === "WS_DISCONNECT") {
    console.log("Content script requests disconnect...");
    stopWebSocket();
    sendResponse({ status: "disconnected" });
  }

  return true; // Keep message port open for async responses
});

// Helper to send messages *to* the content script
function sendMessageToContentScript(tabId, type, message) {
  if (!tabId) return;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Send to the active tab, just in case
    if (tabs[0] && tabs[0].id) {
       chrome.tabs.sendMessage(tabs[0].id, { type, message }, (response) => {
         if (chrome.runtime.lastError) {
            // This is fine, panel might be closed
         }
       });
    }
  });
}

// This listener prevents "zombie" connections if the user
// closes the Meet tab.
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === activeTabId) {
    console.log(`Tab ${tabId} was closed. Stopping WebSocket.`);
    stopWebSocket();
  }
});