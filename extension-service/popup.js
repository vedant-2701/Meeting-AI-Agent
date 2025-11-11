// popup.js - Controls for the extension popup

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');

// Check initial status when popup opens
checkStatus();

startBtn.addEventListener('click', async () => {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if we're on a Google Meet page
    if (!tab.url || !tab.url.includes('meet.google.com')) {
      alert('Please open a Google Meet call first!');
      return;
    }
    
    // Disable button and show loading
    startBtn.disabled = true;
    updateStatus('connecting', 'Connecting...');
    
    // Send message to background script to start capture
    const response = await chrome.runtime.sendMessage({
      action: 'startCapture',
      tabId: tab.id
    });
    
    if (response && response.success) {
      updateStatus('active', 'Recording audio...');
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    } else {
      throw new Error(response?.error || 'Failed to start recording');
    }
  } catch (error) {
    console.error('Error starting recording:', error);
    alert('Error: ' + error.message);
    updateStatus('inactive', 'Not recording');
    startBtn.disabled = false;
  }
});

stopBtn.addEventListener('click', async () => {
  try {
    stopBtn.disabled = true;
    
    // Send message to background script to stop capture
    await chrome.runtime.sendMessage({
      action: 'stopCapture'
    });
    
    updateStatus('inactive', 'Recording stopped');
    stopBtn.style.display = 'none';
    startBtn.style.display = 'block';
    startBtn.disabled = false;
  } catch (error) {
    console.error('Error stopping recording:', error);
    alert('Error: ' + error.message);
    stopBtn.disabled = false;
  }
});

async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getStatus'
    });
    
    if (response && response.isRecording) {
      updateStatus('active', 'Recording audio...');
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
    } else {
      updateStatus('inactive', 'Not recording');
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking status:', error);
    updateStatus('inactive', 'Not recording');
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
  }
}

function updateStatus(state, text) {
  statusText.textContent = text;
  statusDiv.className = `status ${state}`;
  
  const indicator = statusDiv.querySelector('.indicator');
  if (state === 'active') {
    indicator.className = 'indicator green';
  } else {
    indicator.className = 'indicator red';
  }
}