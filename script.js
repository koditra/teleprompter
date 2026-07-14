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
    animationFrameId: null,
    recordingStartTime: null,
    recordingIntervalId: null,
    latestMp4Url: null,
    canvasLines: []
};

// Virtual canvas to bake the text and webcam together
const canvas = document.createElement('canvas');
canvas.width = 1920;
canvas.height = 1080;
const ctx = canvas.getContext('2d', { alpha: false });

function updateScriptText() {
    elements.script.innerText = elements.input.value || "Your transmission script will appear here.";
    layoutCanvasText();
}

function layoutCanvasText() {
    state.canvasLines = [];
    const text = elements.input.value || "Your transmission script will appear here.";
    const fontSize = parseInt(elements.font.value, 10) || 48;
    
    ctx.font = `bold ${fontSize * 2}px sans-serif`;
    const maxWidth = 1920 * 0.9;
    
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
        if (para === '') {
            state.canvasLines.push('');
            continue;
        }
        const words = para.split(' ');
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(testLine).width > maxWidth) {
                state.canvasLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            state.canvasLines.push(currentLine);
        }
    }
}

elements.input.addEventListener('input', updateScriptText);
elements.font.addEventListener('input', () => {
    elements.script.style.fontSize = `${elements.font.value}px`;
    layoutCanvasText();
});
window.addEventListener('resize', layoutCanvasText);

elements.mirrorBtn.addEventListener('click', () => {
    state.isMirrored = !state.isMirrored;
    elements.script.style.transform = state.isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    elements.mirrorBtn.style.background = state.isMirrored ? '#2a2a4a' : '';
});

// Camera activation
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

// Modal UI Handlers
elements.closeModal.addEventListener('click', () => {
    elements.recordingsModal.style.display = 'none';
    elements.latestRecording.pause();
});

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

// Bake elements onto Virtual Canvas
function renderCanvas() {
    ctx.fillStyle = '#000000'; // Deep space black
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
    const canvasFontSize = fontSize * 2;
    ctx.fillStyle = '#e0e6ed';
    ctx.font = `bold ${canvasFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const startX = 1920 / 2;
    const lineHeight = canvasFontSize * 1.6;
    
    let totalHeight = state.canvasLines.length * lineHeight;
    let y = (1080 - totalHeight) / 2;
    if (y < 50) y = 50;

    for (const line of state.canvasLines) {
        if (y + lineHeight > 0 && y < 1080) {
            ctx.fillText(line, startX, y);
        }
        y += lineHeight;
    }
    ctx.restore();

    // Render Picture-in-Picture Optics over text
    if (state.cameraActive && elements.camera.readyState >= 2 && elements.cameraWindow.style.display !== 'none') {
        const camRect = elements.cameraWindow.getBoundingClientRect();
        const cx = (camRect.left - viewerRect.left) * scaleX;
        const cy = (camRect.top - viewerRect.top) * scaleY;
        const cw = camRect.width * scaleX;
        const ch = camRect.height * scaleY;

        ctx.save();
        ctx.drawImage(elements.camera, cx, cy, cw, ch);
        // Add a nice neon border in the final recording
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#75e3ff';
        ctx.strokeRect(cx, cy, cw, ch);
        ctx.restore();
    }

    state.animationFrameId = requestAnimationFrame(renderCanvas);
}

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
    elements.recordBtn.innerHTML = `Halt Recording (00:00)`;
    elements.recordBtn.style.backgroundColor = 'rgba(184, 40, 61, 0.9)'; // Turn button red to indicate live recording
}

function stopRecording() {
    state.isRecording = false;
    clearInterval(state.recordingIntervalId);
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
    }
    cancelAnimationFrame(state.animationFrameId);
    elements.recordBtn.style.backgroundColor = ''; 
}

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
        
        // Reveal modal
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

// Initializers
updateScriptText();
setTimeout(layoutCanvasText, 100);
