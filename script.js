const elements = {
    input: document.getElementById('input'),
    script: document.getElementById('script'),
    viewer: document.getElementById('viewer'),
    font: document.getElementById('font'),
    mirrorBtn: document.getElementById('mirrorBtn'),
    cameraBtn: document.getElementById('cameraBtn'),
    closeCamera: document.getElementById('closeCamera'),
    cameraWindow: document.getElementById('cameraWindow'),
    cameraHeader: document.getElementById('cameraHeader'),
    camera: document.getElementById('camera'),
    resizeHandle: document.getElementById('resizeHandle'),
    recordBtn: document.getElementById('recordBtn'),
    latestRecording: document.getElementById('latestRecording'),
    downloadRecording: document.getElementById('downloadRecording'),
    recordingsModal: document.getElementById('recordings-modal'),
    closeModal: document.getElementById('closeModal')
};

const state = {
    isMirrored: false,
    cameraActive: false,
    isRecording: false,
    cameraStream: null,
    audioStream: null,
    mediaRecorder: null,
    recordedChunks: [],
    recordingStartTime: null,
    recordingIntervalId: null,
    latestMp4Url: null
};

// --- TEXT & PROMPTER LOGIC ---
function updateScriptText() {
    elements.script.innerText = elements.input.value || "Your transmission script will appear here.";
}

elements.input.addEventListener('input', updateScriptText);

elements.font.addEventListener('input', () => {
    elements.script.style.fontSize = `${elements.font.value}px`;
});

elements.mirrorBtn.addEventListener('click', () => {
    state.isMirrored = !state.isMirrored;
    elements.script.style.transform = state.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    elements.mirrorBtn.style.background = state.isMirrored ? '#2a2a4a' : '';
});

// --- CAMERA UI LOGIC ---
elements.cameraBtn.addEventListener('click', async () => {
    if (state.cameraActive) {
        closeCameraSystem();
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        state.cameraStream = new MediaStream(stream.getVideoTracks());
        state.audioStream = new MediaStream(stream.getAudioTracks());
        
        elements.camera.srcObject = stream; // Preview needs both to monitor
        elements.camera.play();
        elements.cameraWindow.style.display = 'flex';
        state.cameraActive = true;
    } catch (err) {
        console.error(err);
        alert('Optics offline: Could not access webcam/microphone. Ensure permissions are granted.');
    }
});

function closeCameraSystem() {
    if (state.cameraStream) state.cameraStream.getTracks().forEach(track => track.stop());
    if (state.audioStream) state.audioStream.getTracks().forEach(track => track.stop());
    elements.cameraWindow.style.display = 'none';
    state.cameraActive = false;
    elements.camera.srcObject = null;
}

elements.closeCamera.addEventListener('click', closeCameraSystem);

// Window Draggable Logic
let isDragging = false, dragStartX, dragStartY, initialLeft, initialTop;
elements.cameraHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = elements.cameraWindow.getBoundingClientRect();
    const parentRect = elements.viewer.getBoundingClientRect();
    initialLeft = rect.left - parentRect.left;
    initialTop = rect.top - parentRect.top;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    elements.cameraWindow.style.left = `${initialLeft + (e.clientX - dragStartX)}px`;
    elements.cameraWindow.style.top = `${initialTop + (e.clientY - dragStartY)}px`;
    elements.cameraWindow.style.right = 'auto';
    elements.cameraWindow.style.bottom = 'auto';
});
document.addEventListener('mouseup', () => isDragging = false);

// Window Resizable Logic
let isResizing = false, resizeStartX, resizeStartY, initialWidth, initialHeight;
elements.resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    const rect = elements.cameraWindow.getBoundingClientRect();
    initialWidth = rect.width;
    initialHeight = rect.height;
    e.stopPropagation();
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    elements.cameraWindow.style.width = `${Math.max(160, initialWidth + (e.clientX - resizeStartX))}px`;
    elements.cameraWindow.style.height = `${Math.max(120, initialHeight + (e.clientY - resizeStartY))}px`;
});
document.addEventListener('mouseup', () => isResizing = false);

// --- RECORDING LOGIC ---
function updateRecordingTimer() {
    const now = Date.now();
    const diff = new Date(now - state.recordingStartTime);
    const m = String(diff.getUTCMinutes()).padStart(2, '0');
    const s = String(diff.getUTCSeconds()).padStart(2, '0');
    elements.recordBtn.innerHTML = `Halt Recording (${m}:${s})`;
}

elements.recordBtn.addEventListener('click', () => {
    if (!state.isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

function startRecording() {
    state.recordedChunks = [];
    
    // Ensure the optics/webcam feed is actually active before starting
    if (!state.cameraStream || state.cameraStream.getVideoTracks().length === 0) {
        alert("Optics offline: Please turn on 'Toggle Optics' before initiating recording.");
        return;
    }

    // Grab raw video and audio straight from the source streams
    const tracks = [state.cameraStream.getVideoTracks()[0]];
    if (state.audioStream && state.audioStream.getAudioTracks().length > 0) {
        tracks.push(state.audioStream.getAudioTracks()[0]);
    }

    const rawCameraMediaStream = new MediaStream(tracks);
    const options = { mimeType: 'video/webm; codecs=vp8,opus' };
    
    try {
        state.mediaRecorder = new MediaRecorder(rawCameraMediaStream, options);
    } catch (e) {
        state.mediaRecorder = new MediaRecorder(rawCameraMediaStream);
    }

    state.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) state.recordedChunks.push(e.data);
    };

    state.mediaRecorder.onstop = processRecording;
    
    state.mediaRecorder.start();
    state.isRecording = true;
    state.recordingStartTime = Date.now();
    state.recordingIntervalId = setInterval(updateRecordingTimer, 1000);
    elements.recordBtn.innerHTML = `Halt Recording (00:00)`;
    elements.recordBtn.style.backgroundColor = 'rgba(184, 40, 61, 0.9)'; 
}

function stopRecording() {
    state.isRecording = false;
    clearInterval(state.recordingIntervalId);
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
    }
    elements.recordBtn.style.backgroundColor = ''; 
}

// --- FFMPEG CONVERSION LOGIC ---
async function processRecording() {
    elements.recordBtn.disabled = true;
    elements.recordBtn.innerHTML = `Encoding... 0%`;

    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    state.recordedChunks = [];

    try {
        const { createFFmpeg, fetchFile } = FFmpeg;
        const ffmpeg = createFFmpeg({ 
            log: true,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
        });
        
        ffmpeg.setProgress(({ ratio }) => {
            const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
            elements.recordBtn.innerHTML = `Encoding... ${percent}%`;
        });

        await ffmpeg.load();
        await ffmpeg.FS('writeFile', 'input.webm', await fetchFile(blob));
        
        // Execute conversion parameters
        await ffmpeg.run('-i', 'input.webm', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', 'output.mp4');
        
        const data = ffmpeg.FS('readFile', 'output.mp4');
        
        if (state.latestMp4Url) URL.revokeObjectURL(state.latestMp4Url);
        
        state.latestMp4Url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        elements.latestRecording.src = state.latestMp4Url;
        
        elements.recordingsModal.style.display = 'flex';
        
        elements.downloadRecording.disabled = false;
        elements.downloadRecording.onclick = () => {
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = state.latestMp4Url;
            a.download = `transmission_${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

    } catch (error) {
        console.error(error);
        alert('Encoding failed. Verify FFmpeg configuration in console.');
    } finally {
        elements.recordBtn.disabled = false;
        elements.recordBtn.innerHTML = `Initiate Recording`;
    }
}

// Modal closing
elements.closeModal.addEventListener('click', () => {
    elements.recordingsModal.style.display = 'none';
    elements.latestRecording.pause();
});

// Initializer
updateScriptText();
