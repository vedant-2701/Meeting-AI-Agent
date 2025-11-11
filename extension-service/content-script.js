// content-scripts.js

const COPILOT_PANEL_ID = "ai-copilot-side-panel";
const COPILOT_TOGGLE_ID = "ai-copilot-toggle-button";

/**
 * Creates the main, maximized panel
 */
function createPanel() {
  const panel = document.createElement("div");
  panel.id = COPILOT_PANEL_ID;
  panel.innerHTML = `
    <div class="copilot-header">
      <h3>AI Co-Pilot</h3>
      <button id="copilot-minimize-btn" title="Minimize">&minus;</button>
    </div>
    <div class="copilot-body">
      <p id="copilot-status">Status: Idle</p>
      
      <!-- This is the new chat log area -->
      <div id="copilot-chat-log">
        <div class="agent-message">Welcome! Connect to the agent to get started.</div>
      </div>
      
      <!-- This is the new chat input area -->
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

  // --- Add Listeners for new UI elements ---

  // Minimize button
  document.getElementById("copilot-minimize-btn").addEventListener("click", () => {
    togglePanelUI(); 
  });
  
  // Send button
  const sendBtn = document.getElementById("copilot-chat-send-btn");
  const chatInput = document.getElementById("copilot-chat-input");

  sendBtn.addEventListener("click", () => {
    sendChatMessage(chatInput.value);
    chatInput.value = ""; // Clear input
  });

  // Also send on "Enter" key
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendChatMessage(chatInput.value);
      chatInput.value = "";
    }
  });

  // --- Connect to WebSocket ---
  // When the panel is created, automatically tell the background to connect
  chrome.runtime.sendMessage({ type: "WS_CONNECT" }, (response) => {
     if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
     }
  });
}

/**
 * Creates the small, minimized "bubble" button
 */
function createToggleButton() {
  const toggleBtn = document.createElement("button");
  toggleBtn.id = COPILOT_TOGGLE_ID;
  toggleBtn.title = "Maximize Co-Pilot";
  toggleBtn.innerHTML = `<span>AI</span>`; // Simple "AI" button
  document.body.appendChild(toggleBtn);

  toggleBtn.addEventListener("click", () => {
    togglePanelUI(); // This will hide the toggle and show the panel
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
    // Tell background to disconnect WebSocket
    chrome.runtime.sendMessage({ type: "WS_DISCONNECT" });
    existingPanel.remove();
    createToggleButton();
  } else {
    // --- SHOW THE PANEL ---
    console.log("AI Co-Pilot: Maximizing panel.");
    if (existingToggle) {
      existingToggle.remove();
    }
    createPanel(); // This will also trigger the WS_CONNECT
  }
}

/**
 * Sends a chat message to the background script
 */
function sendChatMessage(message) {
  if (!message || message.trim() === "") return;
  
  console.log("Sending chat message:", message);
  
  // Add our own message to the log
  addMessageToLog("You", message);
  
  // Send to background to forward to Python
  chrome.runtime.sendMessage({ 
    type: "WS_SEND_MESSAGE",
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
  // Auto-scroll to bottom
  chatLog.scrollTop = chatLog.scrollHeight;
}


// --- Listen for messages from the background script ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const statusEl = document.getElementById("copilot-status");
  
  if (request.type === "STATUS_UPDATE") {
    if (statusEl) {
      statusEl.textContent = `Status: ${request.message}`;
    }
  } else if (request.type === "AGENT_REPLY") {
    // We got a reply from Python!
    try {
      const data = JSON.parse(request.message);
      if (data.type === "AGENT_REPLY") {
        addMessageToLog("Agent", data.payload);
      }
    } catch (e) {
      console.error("Could not parse agent reply:", e);
    }
  }
  return true; 
});

// --- INITIALIZATION ---
// This code runs as soon as the script is injected
console.log("AI Co-Pilot Content Script loaded. Injecting toggle button.");
// We start by creating the *minimized* button, as you requested.
createToggleButton();