// offscreen.js - Handles media capture in offscreen document context
// This script runs in a hidden HTML document that has access to navigator.mediaDevices

let mediaRecorder = null;
let audioStream = null;
let websocket = null;
let isRecording = false;

const WEBSOCKET_URL = 'ws://localhost:8000/ws';
const CHUNK_DURATION = 1000; // Request data every 1 second (but we'll combine all at the end)

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Offscreen received message:', message);
  
  // Only process messages targeted for offscreen
  if (message.target !== 'offscreen') {
    return false;
  }
  
  if (message.action === 'startCapture') {
    startAudioCapture(message.streamId)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  } else if (message.action === 'stopCapture') {
    stopAudioCapture();
    sendResponse({ success: true });
    return false; // Synchronous response
  } else if (message.action === 'getStatus') {
    sendResponse({ 
      isRecording,
      isConnected: websocket && websocket.readyState === WebSocket.OPEN
    });
    return false; // Synchronous response
  } else if (message.action === 'sendTextMessage') {
    // Send text message to backend
    sendTextMessage(message.payload)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  return false;
});

async function startAudioCapture(streamId) {
  try {
    console.log('Starting audio capture with stream ID:', streamId);
    
    // Step 1: Connect to WebSocket
    await connectWebSocket();
    
    // Step 2: Get MediaStream using the streamId from tabCapture (OTHER PARTICIPANTS)
    console.log('🔊 Capturing tab audio (other participants)...');
    console.log('navigator.mediaDevices:', navigator.mediaDevices);
    
    const tabAudioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });
    
    if (!tabAudioStream) {
      throw new Error('Failed to capture tab audio stream');
    }
    
    console.log('✅ Tab audio captured');
    console.log('Tab audio tracks:', tabAudioStream.getAudioTracks().map(track => ({
      id: track.id,
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState
    })));
    
    // Step 3: Get microphone audio (YOUR VOICE)
    console.log('🎤 Capturing microphone audio (your voice)...');
    let micAudioStream = null;
    
    try {
      // Request microphone permission
      micAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log('✅ Microphone audio captured');
      console.log('Mic audio tracks:', micAudioStream.getAudioTracks().map(track => ({
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState
      })));
    } catch (error) {
      console.error('❌ Failed to capture microphone:', error.name, error.message);
      
      if (error.name === 'NotAllowedError') {
        console.error('');
        console.error('🚨 MICROPHONE PERMISSION DENIED! 🚨');
        console.error('');
        console.error('To capture your voice, please:');
        console.error('1. Click the extension icon');
        console.error('2. When you click "Start Recording", a permission popup will appear');
        console.error('3. Click "Allow" to grant microphone access');
        console.error('');
        console.error('Alternative: Manually allow microphone:');
        console.error('1. Go to chrome://extensions');
        console.error('2. Find "Google Meet Live Co-Pilot"');
        console.error('3. Click "Details"');
        console.error('4. Scroll down to "Site settings"');
        console.error('5. Allow Microphone access');
        console.error('');
        
        // Notify user through background
        notifyBackground('error', { 
          message: 'Microphone permission denied. Only tab audio will be recorded. Please grant microphone permission and try again.' 
        });
      }
      
      console.warn('⚠️  Continuing without microphone - only tab audio will be recorded');
    }
    
    // Step 4: Mix audio streams if microphone is available
    console.log('🎚️ Preparing audio streams...');
    const audioContext = new AudioContext();
    
    let finalStream;
    
    if (micAudioStream) {
      // Mix tab audio + microphone
      console.log('Mixing tab audio + microphone...');
      const tabSource = audioContext.createMediaStreamSource(tabAudioStream);
      const micSource = audioContext.createMediaStreamSource(micAudioStream);
      const destination = audioContext.createMediaStreamDestination();
      
      // Connect both sources
      tabSource.connect(destination);
      micSource.connect(destination);
      
      // Also connect tab to speakers so you can hear
      tabSource.connect(audioContext.destination);
      
      finalStream = destination.stream;
      console.log('✅ Mixed: Tab audio + Microphone');
    } else {
      // Use only tab audio (which already includes your voice from Meet!)
      console.log('Using tab audio only (includes your Meet microphone)');
      const tabSource = audioContext.createMediaStreamSource(tabAudioStream);
      
      // Connect to speakers so you can hear
      tabSource.connect(audioContext.destination);
      
      finalStream = tabAudioStream;
      console.log('✅ Recording: Tab audio (includes all Meet audio + your mic from Meet)');
    }
    
    // This is the stream we'll record
    audioStream = finalStream;
    
    // Create analyser to monitor combined audio levels
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    // source.connect(audioContext.destination);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // Monitor audio levels every second
    const levelCheckInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      console.log(`🎤 Audio level: ${average.toFixed(2)} (0-255 scale)`);
    }, 1000);
    
    // Store interval ID to clear it later
    window.audioLevelCheckInterval = levelCheckInterval;
    
    // Step 3: Set up MediaRecorder to record complete audio
    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    };
    
    mediaRecorder = new MediaRecorder(audioStream, options);
    
    // Array to store all chunks - we'll combine them into one complete WebM file
    const recordedChunks = [];
    
    // Step 4: Collect audio chunks (don't send immediately)
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const totalSize = recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0) + event.data.size;
        console.log(`📦 Collected chunk #${recordedChunks.length + 1}: ${event.data.size} bytes (Total: ${totalSize} bytes)`);
        recordedChunks.push(event.data);
        
        // Notify that we're collecting data
        notifyBackground('audioChunkCollected', { size: event.data.size, total: recordedChunks.length });
      } else {
        console.warn('⚠️  Received empty chunk!');
      }
    };
    
    // Step 5: When recording stops, combine all chunks and send as one complete WebM
    mediaRecorder.onstop = async () => {
      console.log('MediaRecorder stopped');
      isRecording = false;
      
      if (recordedChunks.length > 0) {
        console.log(`Combining ${recordedChunks.length} chunks into complete audio file...`);
        console.log('Chunk details:', recordedChunks.map((chunk, i) => `#${i+1}: ${chunk.size} bytes, type: ${chunk.type}`));
        
        // Create one complete Blob from all chunks
        const completeAudioBlob = new Blob(recordedChunks, { type: 'audio/webm;codecs=opus' });
        console.log(`Complete audio size: ${completeAudioBlob.size} bytes, type: ${completeAudioBlob.type}`);
        
        // Log first 20 bytes as hex for debugging
        const sample = await completeAudioBlob.slice(0, 20).arrayBuffer();
        const sampleBytes = new Uint8Array(sample);
        console.log('First 20 bytes (hex):', Array.from(sampleBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
        
        // Convert to ArrayBuffer and send to WebSocket
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          const arrayBuffer = await completeAudioBlob.arrayBuffer();
          console.log(`📤 Sending to WebSocket: ${arrayBuffer.byteLength} bytes`);
          
          // Send audio and wait for confirmation
          try {
            websocket.send(arrayBuffer);
            console.log(`✅ Sent complete audio file: ${arrayBuffer.byteLength} bytes`);
            
            // Wait a bit for the server to process
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            notifyBackground('audioSent', { size: arrayBuffer.byteLength });
            
            // NOW close the WebSocket
            console.log('Closing WebSocket after successful send...');
            websocket.close();
            websocket = null;
          } catch (error) {
            console.error('❌ Error sending audio:', error);
            notifyBackground('error', { message: 'Failed to send audio: ' + error.message });
          }
        } else {
          console.error('❌ WebSocket not connected, cannot send audio');
          notifyBackground('error', { message: 'WebSocket disconnected' });
        }
        
        // Clear the chunks array
        recordedChunks.length = 0;
      } else {
        console.log('No audio chunks to send');
        // Close websocket if no audio to send
        if (websocket) {
          websocket.close();
          websocket = null;
        }
      }
    };
    
    mediaRecorder.onerror = (error) => {
      console.error('MediaRecorder error:', error);
      stopAudioCapture();
    };
    
    // Step 6: Start recording (collect chunks every 1 second)
    mediaRecorder.start(CHUNK_DURATION);
    isRecording = true;
    
    console.log('✅ Recording started successfully!');
    console.log(`📹 MediaRecorder state: ${mediaRecorder.state}`);
    console.log(`⏰ Chunk interval: ${CHUNK_DURATION}ms`);
    console.log(`🎙️ Recording... (collecting chunks every ${CHUNK_DURATION}ms)`);
    notifyBackground('recordingStarted');
    
  } catch (error) {
    console.error('Error starting audio capture:', error);
    stopAudioCapture();
    notifyBackground('error', { message: error.message });
  }
}

function stopAudioCapture() {
  console.log('Stopping audio capture');
  
  // Clear audio level monitoring interval
  if (window.audioLevelCheckInterval) {
    clearInterval(window.audioLevelCheckInterval);
    window.audioLevelCheckInterval = null;
    console.log('Cleared audio level monitoring');
  }
  
  // Stop the media recorder (this will trigger onstop event which sends audio)
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    // Note: Don't close WebSocket here - let onstop handler send audio first
  }
  
  // Stop the audio stream tracks
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  
  // DON'T close WebSocket here - the onstop handler will do it after sending audio
  console.log('Waiting for onstop handler to send audio and close WebSocket...');
  
  isRecording = false;
  notifyBackground('recordingStopped');
}

function connectWebSocket() {
  return new Promise((resolve, reject) => {
    console.log('Connecting to WebSocket:', WEBSOCKET_URL);
    
    websocket = new WebSocket(WEBSOCKET_URL);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      resolve();
    };
    
    websocket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      
      // Try to parse as JSON first
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'AGENT_REPLY') {
          // Agent reply - forward to content script
          console.log('📨 Agent reply:', data.payload);
          notifyBackground('AGENT_REPLY', { message: data.payload });
        } else {
          // Other JSON messages
          notifyBackground('message', data);
        }
      } catch (e) {
        // Not JSON, treat as plain text (transcript, status messages, etc.)
        console.log('📝 Plain text message:', event.data);
        notifyBackground('transcript', { text: event.data });
      }
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      reject(error);
    };
    
    websocket.onclose = () => {
      console.log('WebSocket closed');
      websocket = null;
    };
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (websocket && websocket.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket connection timeout'));
      }
    }, 5000);
  });
}

function sendTextMessage(payload) {
  return new Promise(async (resolve, reject) => {
    console.log('Sending text message to WebSocket:', payload);
    
    // If WebSocket is not connected, establish connection first
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.log('📡 WebSocket not connected. Establishing connection...');
      try {
        await connectWebSocket();
        console.log('✅ WebSocket connected. Ready to send message.');
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
        notifyBackground('error', { 
          message: 'Cannot connect to backend. Please make sure the backend server is running.' 
        });
        reject(new Error('Failed to connect to backend'));
        return;
      }
    }
    
    try {
      // Send as JSON string
      const message = JSON.stringify(payload);
      websocket.send(message);
      console.log('✅ Text message sent to backend');
      resolve();
    } catch (error) {
      console.error('❌ Error sending text message:', error);
      reject(error);
    }
  });
}

function notifyBackground(type, data = {}) {
  // Send message back to background.js
  try {
    chrome.runtime.sendMessage({
      source: 'offscreen',
      type,
      ...data
    }, (response) => {
      // Check for errors but don't throw
      if (chrome.runtime.lastError) {
        console.log('Could not send message to background:', chrome.runtime.lastError.message);
      }
    });
  } catch (err) {
    console.log('Error sending message to background:', err.message);
  }
}
