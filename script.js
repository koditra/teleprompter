const elements = {
    input: document.getElementById('input'),
    script: document.getElementById('script'),
    viewer: document.getElementById('viewer'),
    font: document.getElementById('font'),
    speed: document.getElementById('speed'),
    playScrollBtn: document.getElementById('playScrollBtn'),
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
    isScrolling: false,
    scrollSpeed: 1.5,
    scrollAnimationId: null,
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

function updateScriptText() {
    elements.script.innerText = elements.input.value || "Your script will appear here. Paste your text to begin.";
}

elements.input.addEventListener('input', updateScriptText);

elements.font.addEventListener('input', () => {
    elements.script.style.fontSize = `${elements.font.value}px`;
});

elements.mirrorBtn.addEventListener('click', () => {
    state.isMirrored = !state.isMirrored;
    elements.script.style.transform = state.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    elements.mirrorBtn.classList.toggle('active');
});

elements.speed.addEventListener('input', () => {
    state.scrollSpeed = parseFloat(elements.speed.value);
});

elements.playScrollBtn.addEventListener('click', () => {
    state.isScrolling = !state.isScrolling;
    if (state.isScrolling) {
        elements.playScrollBtn.innerText = "Pause Auto-Scroll";
        elements.playScrollBtn.classList.add('active');
        startScrolling();
    } else {
        elements.playScrollBtn.innerText = "Start Auto-Scroll";
        elements.playScrollBtn.classList.remove('active');
        stopScrolling();
    }
});

function startScrolling() {
    if (!state.isScrolling) return;
    elements.viewer.scrollTop += state.scrollSpeed;
    state.scrollAnimationId = requestAnimationFrame(startScrolling);
}

function stopScrolling() {
    cancelAnimationFrame(state.scrollAnimationId);
}

elements.viewer.addEventListener('wheel', () => {
    if (state.isScrolling) {
        stopScrolling();
        setTimeout(() => { if (state.isScrolling) startScrolling(); }, 1000);
    }
});

elements.cameraBtn.addEventListener('click', async () => {
    if (state.cameraActive) {
        closeCameraSystem();
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        state.cameraStream = new MediaStream(stream.getVideoTracks());
        state.audioStream = new MediaStream(stream.getAudioTracks());
        
        elements.camera.srcObject = stream; 
        elements.camera.play();
        elements.cameraWindow.style.display = 'flex';
        state.cameraActive = true;
        elements.cameraBtn.classList.add('active');
    } catch (err) {
        console.error(err);
        alert('Camera error: Could not access webcam/microphone. Ensure permissions are granted.');
    }
});

function closeCameraSystem() {
    if (state.cameraStream) state.cameraStream.getTracks().forEach(track => track.stop());
    if (state.audioStream) state.audioStream.getTracks().forEach(track => track.stop());
    elements.cameraWindow.style.display = 'none';
    state.cameraActive = false;
    elements.camera.srcObject = null;
    elements.cameraBtn.classList.remove('active');
}

elements.closeCamera.addEventListener('click', closeCameraSystem);

let isDragging = false, dragStartX, dragStartY, initialLeft, initialTop;
elements.cameraHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = elements.cameraWindow.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    elements.cameraWindow.style.left = `${initialLeft + (e.clientX - dragStartX)}px`;
    elements.cameraWindow.style.top = `${initialTop + (e.clientY - dragStartY)}px`;
    elements.cameraWindow.style.right = 'auto';
    elements.cameraWindow.style.bottom = 'auto';
});
document.addEventListener('mouseup', () => isDragging = false);

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

function updateRecordingTimer() {
    const now = Date.now();
    const diff = new Date(now - state.recordingStartTime);
    const m = String(diff.getUTCMinutes()).padStart(2, '0');
    const s = String(diff.getUTCSeconds()).padStart(2, '0');
    elements.recordBtn.innerHTML = `Stop Recording (${m}:${s})`;
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
    
    if (!state.cameraStream || state.cameraStream.getVideoTracks().length === 0) {
        alert("Please turn on 'Toggle Camera' before recording.");
        return;
    }

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
    elements.recordBtn.innerHTML = `Stop Recording (00:00)`;
    elements.recordBtn.style.backgroundColor = '#ff3344'; 
    elements.recordBtn.style.boxShadow = '0 0 15px rgba(255, 51, 68, 0.6)';
}

function stopRecording() {
    state.isRecording = false;
    clearInterval(state.recordingIntervalId);
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
    }
    elements.recordBtn.style.backgroundColor = ''; 
    elements.recordBtn.style.boxShadow = '';
}

async function processRecording() {
    elements.recordBtn.disabled = true;
    elements.recordBtn.innerHTML = `Processing Video... 0%`;

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
            elements.recordBtn.innerHTML = `Processing Video... ${percent}%`;
        });

        await ffmpeg.load();
        await ffmpeg.FS('writeFile', 'input.webm', await fetchFile(blob));
        
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
            a.download = `recording_${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

    } catch (error) {
        console.error(error);
        alert('Encoding failed. Ensure you are not in Incognito Mode and check console.');
    } finally {
        elements.recordBtn.disabled = false;
        elements.recordBtn.innerHTML = `Start Recording`;
    }
}

elements.closeModal.addEventListener('click', () => {
    elements.recordingsModal.style.display = 'none';
    elements.latestRecording.pause();
});

updateScriptText();
