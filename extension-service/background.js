// background.js - Chrome Extension Service Worker
// This manages the offscreen document for audio capture

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// Utility function to ensure the offscreen document is open
async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });

  if (existingContexts.length > 0) {
    console.log('Offscreen document already exists');
    return;
  }

  // Create the offscreen document
  console.log('Creating offscreen document');
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['USER_MEDIA'], // Changed from AUDIO_PLAYBACK to USER_MEDIA for getUserMedia
    justification: 'Required for capturing and streaming tab audio using getUserMedia API.'
  });
}

// Listen for messages from popup, content script, or offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  // Handle messages FROM offscreen document (forward to content scripts)
  if (message.source === 'offscreen') {
    notifyContentScript(message.type, message);
    sendResponse({ success: true });
    return false; // Synchronous response
  }
  
  // Handle messages TO offscreen document (from popup/content script)
  if (message.action === 'startCapture') {
    handleStartCapture(message, sendResponse);
    return true; // Will respond asynchronously
  } else if (message.action === 'stopCapture') {
    handleStopCapture(sendResponse);
    return true; // Will respond asynchronously
  } else if (message.action === 'getStatus') {
    handleGetStatus(sendResponse);
    return true; // Will respond asynchronously
  } else if (message.action === 'textMessage') {
    handleTextMessage(message, sendResponse);
    return true; // Will respond asynchronously
  }
  
  return false;
});

// Separate async function for startCapture
async function handleStartCapture(message, sendResponse) {
  try {
    await setupOffscreenDocument(); // Ensure offscreen document is ready
    
    // Get stream ID for the tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: message.tabId
    });
    
    console.log('Stream ID obtained:', streamId);
    
    // Send the command to the offscreen document with the streamId
    chrome.runtime.sendMessage({ 
      target: 'offscreen',
      action: 'startCapture',
      streamId: streamId
    }, (response) => {
      // Check if there was an error sending the message
      if (chrome.runtime.lastError) {
        console.error('Error sending to offscreen:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
  } catch (error) {
    console.error('Error in startCapture:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Separate async function for stopCapture
async function handleStopCapture(sendResponse) {
  try {
    chrome.runtime.sendMessage({ 
      target: 'offscreen',
      action: 'stopCapture'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending to offscreen:', chrome.runtime.lastError);
      }
      sendResponse({ success: true });
    });
  } catch (error) {
    console.error('Error in stopCapture:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Separate async function for getStatus
async function handleGetStatus(sendResponse) {
  try {
    chrome.runtime.sendMessage({ 
      target: 'offscreen',
      action: 'getStatus'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting status from offscreen:', chrome.runtime.lastError);
        sendResponse({ isRecording: false, isConnected: false });
      } else {
        sendResponse(response || { isRecording: false, isConnected: false });
      }
    });
  } catch (error) {
    console.error('Error in getStatus:', error);
    sendResponse({ isRecording: false, isConnected: false });
  }
}

// Separate async function for sending text messages
async function handleTextMessage(message, sendResponse) {
  try {
    console.log('Forwarding text message to offscreen:', message.payload);
    
    // Ensure offscreen document exists (it will auto-connect WebSocket)
    await setupOffscreenDocument();
    
    // Send the message
    chrome.runtime.sendMessage({ 
      target: 'offscreen',
      action: 'sendTextMessage',
      payload: message.payload
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending text message to offscreen:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true });
      }
    });
  } catch (error) {
    console.error('Error in handleTextMessage:', error);
    sendResponse({ success: false, error: error.message });
  }
}



function notifyContentScript(type, data = {}) {
  // Send message to all Google Meet tabs
  chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type,
        ...data
      }, (response) => {
        // Check for errors but don't throw
        if (chrome.runtime.lastError) {
          console.log('Could not send message to content script:', chrome.runtime.lastError.message);
        }
      });
    });
  });
}

// Clean up on extension unload
chrome.runtime.onSuspend.addListener(() => {
  // Notify offscreen document to stop capture
  chrome.runtime.sendMessage({ 
    target: 'offscreen',
    action: 'stopCapture'
  });
});