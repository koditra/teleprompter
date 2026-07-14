const elements = {
    input: document.getElementById('input'),
    script: document.getElementById('script'),
    viewer: document.getElementById('viewer'),
    speed: document.getElementById('speed'),
    font: document.getElementById('font'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    mirrorBtn: document.getElementById('mirrorBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    cameraBtn: document.getElementById('cameraBtn'),
    closeCamera: document.getElementById('closeCamera'),
    cameraWindow: document.getElementById('cameraWindow'),
    cameraHeader: document.getElementById('cameraHeader'),
    camera: document.getElementById('camera'),
    resizeHandle: document.getElementById('resizeHandle'),
    recordBtn: document.getElementById('recordBtn'),
    latestRecording: document.getElementById('latestRecording'),
    downloadRecording: document.getElementById('downloadRecording'),
    recordings: document.getElementById('recordings')
};

const state = {
    isScrolling: false,
    isMirrored: false,
    cameraActive: false,
    isRecording: false,
    cameraStream: null,
    audioStream: null,
    mediaRecorder: null,
    recordedChunks: [],
    animationFrameId: null,
    scrollFrameId: null,
    recordingStartTime: null,
    recordingIntervalId: null,
    lastScrollTime: null,
    latestMp4Url: null
};

const canvas = document.createElement('canvas');
canvas.width = 1920;
canvas.height = 1080;
const ctx = canvas.getContext('2d', { alpha: false });

function updateScriptText() {
    elements.script.innerText = elements.input.value || "Your script will appear here. Press Start to begin.";
}

elements.input.addEventListener('input', updateScriptText);
elements.font.addEventListener('input', () => {
    elements.script.style.fontSize = `${elements.font.value}px`;
});

function scrollLoop(timestamp) {
    if (!state.isScrolling) return;
    if (!state.lastScrollTime) state.lastScrollTime = timestamp;
    const delta = timestamp - state.lastScrollTime;
    state.lastScrollTime = timestamp;

    const speed = parseFloat(elements.speed.value);
    elements.viewer.scrollTop += speed * (delta / 16.666);

    state.scrollFrameId = requestAnimationFrame(scrollLoop);
}

elements.startBtn.addEventListener('click', () => {
    elements.viewer.scrollTop = 0;
    state.isScrolling = true;
    state.lastScrollTime = null;
    cancelAnimationFrame(state.scrollFrameId);
    state.scrollFrameId = requestAnimationFrame(scrollLoop);
});

elements.pauseBtn.addEventListener('click', () => {
    state.isScrolling = false;
    cancelAnimationFrame(state.scrollFrameId);
});

elements.resumeBtn.addEventListener('click', () => {
    state.isScrolling = true;
    state.lastScrollTime = null;
    cancelAnimationFrame(state.scrollFrameId);
    state.scrollFrameId = requestAnimationFrame(scrollLoop);
});

elements.mirrorBtn.addEventListener('click', () => {
    state.isMirrored = !state.isMirrored;
    elements.script.style.transform = state.isMirrored ? 'scaleX(-1)' : 'none';
});

elements.fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        elements.viewer.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
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
        
        elements.camera.srcObject = state.cameraStream;
        elements.camera.play();
        elements.cameraWindow.style.display = 'flex';
        state.cameraActive = true;
    } catch (err) {
        console.error(err);
        alert('Could not access webcam and microphone. Ensure permissions are allowed.');
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

function renderCanvas() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1920, 1080);

    const viewerRect = elements.viewer.getBoundingClientRect();
    if (viewerRect.width === 0 || viewerRect.height === 0) {
        state.animationFrameId = requestAnimationFrame(renderCanvas);
        return;
    }

    const scaleX = 1920 / viewerRect.width;
    const scaleY = 1080 / viewerRect.height;

    ctx.save();
    if (state.isMirrored) {
        ctx.translate(1920, 0);
        ctx.scale(-1, 1);
    }

    const fontSize = parseInt(elements.font.value, 10) || 48;
    const canvasFontSize = fontSize * scaleY;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${canvasFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const text = elements.input.value || "Your script will appear here. Press Start to begin.";
    const maxWidth = 1920 * 0.9;
    const startX = 1920 / 2;
    const lineHeight = canvasFontSize * 1.6;
    
    const paddingTop = (viewerRect.height * 0.4) * scaleY;
    let y = paddingTop - (elements.viewer.scrollTop * scaleY);

    const paragraphs = text.split('\n');
    for (const p of paragraphs) {
        const words = p.split(' ');
        let line = '';
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && i > 0) {
                if (y > -lineHeight && y < 1080 + lineHeight) ctx.fillText(line, startX, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        if (y > -lineHeight && y < 1080 + lineHeight) ctx.fillText(line, startX, y);
        y += lineHeight;
    }
    ctx.restore();

    if (state.cameraActive && elements.camera.readyState >= 2 && elements.cameraWindow.style.display !== 'none') {
        const camRect = elements.cameraWindow.getBoundingClientRect();
        const cx = (camRect.left - viewerRect.left) * scaleX;
        const cy = (camRect.top - viewerRect.top) * scaleY;
        const cw = camRect.width * scaleX;
        const ch = camRect.height * scaleY;

        ctx.save();
        ctx.drawImage(elements.camera, cx, cy, cw, ch);
        ctx.restore();
    }

    state.animationFrameId = requestAnimationFrame(renderCanvas);
}

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
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = requestAnimationFrame(renderCanvas);

    const canvasStream = canvas.captureStream(60);
    const tracks = [...canvasStream.getVideoTracks()];

    if (state.audioStream && state.audioStream.getAudioTracks().length > 0) {
        tracks.push(state.audioStream.getAudioTracks()[0]);
    }

    const combinedStream = new MediaStream(tracks);
    const options = { mimeType: 'video/webm; codecs=vp8,opus' };
    
    try {
        state.mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch (e) {
        state.mediaRecorder = new MediaRecorder(combinedStream);
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
}

function stopRecording() {
    state.isRecording = false;
    clearInterval(state.recordingIntervalId);
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
    }
    cancelAnimationFrame(state.animationFrameId);
}

async function processRecording() {
    elements.recordBtn.disabled = true;
    elements.recordBtn.innerHTML = `Converting... 0%`;

    const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
    state.recordedChunks = [];

    try {
        const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
        const { fetchFile } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
        
        const ffmpeg = new FFmpeg();
        
        ffmpeg.on('progress', ({ progress }) => {
            const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
            elements.recordBtn.innerHTML = `Converting... ${percent}%`;
        });

        await ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
            wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm'
        });

        await ffmpeg.writeFile('input.webm', await fetchFile(blob));
        
        await ffmpeg.exec([
            '-i', 'input.webm', 
            '-c:v', 'libx264', 
            '-preset', 'ultrafast', 
            '-c:a', 'aac', 
            'output.mp4'
        ]);
        
        const data = await ffmpeg.readFile('output.mp4');
        
        if (state.latestMp4Url) URL.revokeObjectURL(state.latestMp4Url);
        
        state.latestMp4Url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        elements.latestRecording.src = state.latestMp4Url;
        elements.latestRecording.style.display = 'block';
        
        elements.downloadRecording.disabled = false;
        elements.downloadRecording.onclick = () => {
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = state.latestMp4Url;
            a.download = `teleprompter_${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        
        elements.recordings.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error(error);
        alert('An origin execution error occurred. Please ensure this app is run through a local web server (Live Server, serve, etc.) instead of directly launching the HTML file.');
    } finally {
        elements.recordBtn.disabled = false;
        elements.recordBtn.innerHTML = `Start Recording`;
    }
}

updateScriptText();
