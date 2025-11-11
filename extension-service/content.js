// content.js - AI Co-Pilot UI for Google Meet

const COPILOT_PANEL_ID = "ai-copilot-side-panel";
const COPILOT_TOGGLE_ID = "ai-copilot-toggle-button";

// --- Panel UI ---
function createPanel() {
  const panel = document.createElement("div");
  panel.id = COPILOT_PANEL_ID;
  panel.innerHTML = `
    <div class="copilot-header">
      <h3>AI Co-Pilot</h3>
      <button id="copilot-minimize-btn" title="Minimize">&minus;</button>
    </div>
    <div class="copilot-body">
      <button id="copilot-record-btn">
        <span class="icon">🔴</span>
        <span>Start Recording</span>
      </button>
      <p id="copilot-status">Status: Idle</p>
      
      <!-- Chat Log Area -->
      <div id="copilot-chat-log">
        <div class="agent-message">Welcome! Click Start Recording to begin.</div>
      </div>
      
      <!-- Chat Input Area -->
      <div class="copilot-chat-input-area">
        <input type="text" id="copilot-chat-input" placeholder="Ask your agent...">
        <button id="copilot-chat-send-btn" title="Send">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(panel);
  panel.style.display = "flex";

  // --- Add Event Listeners ---
  document.getElementById("copilot-record-btn").addEventListener("click", () => {
    const recordBtn = document.getElementById("copilot-record-btn");
    if (recordBtn.classList.contains("recording")) {
      console.log("Sending 'stopCapture' to background...");
      chrome.runtime.sendMessage({ action: "stopCapture" });
    } else {
      console.log("Sending 'startCapture' to background...");
      chrome.runtime.sendMessage({ action: "startCapture" });
    }
  });

  document.getElementById("copilot-minimize-btn").addEventListener("click", () => {
    togglePanelUI(); 
  });
  
  const sendBtn = document.getElementById("copilot-chat-send-btn");
  const chatInput = document.getElementById("copilot-chat-input");

  sendBtn.addEventListener("click", () => sendChatMessage(chatInput.value, chatInput));
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage(chatInput.value, chatInput);
  });
}

/**
 * Creates the small, minimized "bubble" button
 */
function createToggleButton() {
  const toggleBtn = document.createElement("button");
  toggleBtn.id = COPILOT_TOGGLE_ID;
  toggleBtn.title = "Open AI Co-Pilot";
  toggleBtn.innerHTML = `<span>AI</span>`;
  document.body.appendChild(toggleBtn);

  toggleBtn.addEventListener("click", () => {
    togglePanelUI(); 
  });
}

/**
 * Toggles the UI between maximized and minimized
 */
function togglePanelUI() {
  const existingPanel = document.getElementById(COPILOT_PANEL_ID);
  const existingToggle = document.getElementById(COPILOT_TOGGLE_ID);

  if (existingPanel) {
    // --- HIDE THE PANEL ---
    console.log("AI Co-Pilot: Minimizing panel.");
    existingPanel.remove();
    createToggleButton();
  } else {
    // --- SHOW THE PANEL ---
    console.log("AI Co-Pilot: Maximizing panel.");
    if (existingToggle) {
      existingToggle.remove();
    }
    createPanel();
  }
}

/**
 * Sends a chat message to the background script
 */
function sendChatMessage(message, inputElement) {
  if (!message || message.trim() === "") return;
  
  console.log("Sending chat message:", message);
  addMessageToLog("You", message);
  inputElement.value = ""; // Clear input
  
  // Send to background to forward to WebSocket
  chrome.runtime.sendMessage({ 
    action: "textMessage",
    payload: {
      type: "USER_CHAT_TEXT",
      payload: message
    }
  });
}

/**
 * Helper function to add a message to the chat log UI
 */
function addMessageToLog(sender, message) {
  const chatLog = document.getElementById("copilot-chat-log");
  if (!chatLog) return;
  
  let messageClass = "agent-message";
  let senderName = "Agent";
  
  if (sender === "You") {
    messageClass = "user-message";
    senderName = "You";
  }
  
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${messageClass}`;
  msgDiv.innerHTML = `<strong>${senderName}:</strong> ${message}`;
  
  chatLog.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

/**
 * Updates the UI state (button, status) based on messages from background
 */
function updateUIMode(isRecording, isConnected) {
  const recordBtn = document.getElementById("copilot-record-btn");
  const statusEl = document.getElementById("copilot-status");
  if (!recordBtn || !statusEl) return;
  
  if (isRecording) {
    recordBtn.innerHTML = `<span class="icon">■</span><span>Stop Recording</span>`;
    recordBtn.classList.add("recording");
    statusEl.textContent = "Status: Streaming live audio...";
  } else {
    recordBtn.innerHTML = `<span class="icon">🔴</span><span>Start Recording</span>`;
    recordBtn.classList.remove("recording");
    statusEl.textContent = isConnected ? "Status: Connected. Ready to record." : "Status: Idle";
  }
}

// --- Listen for messages from the background script ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  
  if (request.type === "recordingStarted") {
    updateUIMode(true, true);
    addMessageToLog("Agent", "Recording started. I'm listening...");
  } else if (request.type === "recordingStopped") {
    updateUIMode(false, false);
    addMessageToLog("Agent", "Recording stopped.");
  } else if (request.type === "error") {
    const statusEl = document.getElementById("copilot-status");
    if (statusEl) statusEl.textContent = `Error: ${request.message}`;
    addMessageToLog("Agent", `Error: ${request.message}`);
  } else if (request.type === "transcript") {
    // Handle transcript from backend
    addMessageToLog("Agent", `Transcript: ${request.text}`);
  } else if (request.type === "AGENT_REPLY") {
    // Handle agent replies from backend
    try {
      const data = typeof request.message === 'string' ? JSON.parse(request.message) : request.message;
      if (data.type === "AGENT_REPLY") {
        addMessageToLog("Agent", data.payload);
      }
    } catch (e) {
      console.error("Could not parse agent reply:", e);
      addMessageToLog("Agent", request.message);
    }
  } else if (request.type === "audioChunkSent") {
    // Optional: Update status with data transfer info
    console.log(`Audio chunk sent: ${request.size} bytes`);
  }
  
  return true; 
});

// --- INITIALIZATION ---
console.log("AI Co-Pilot Content Script loaded.");

// Wait for DOM to be ready before creating UI
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded. Injecting toggle button.");
    createToggleButton();
  });
} else {
  // DOM is already ready
  console.log("DOM already loaded. Injecting toggle button immediately.");
  createToggleButton();
}