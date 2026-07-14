const script = document.getElementById("script");
const input = document.getElementById("input");
const speedSlider = document.getElementById("speed");
const fontSlider = document.getElementById("font");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const mirrorBtn = document.getElementById("mirrorBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const cameraBtn = document.getElementById("cameraBtn");
const closeCamera = document.getElementById("closeCamera");
const cameraWindow = document.getElementById("cameraWindow");
const camera = document.getElementById("camera");
const cameraHeader = document.getElementById("cameraHeader");
const resizeHandle = document.getElementById("resizeHandle");

const recordBtn = document.getElementById("recordBtn");

let recorder;
let recordedChunks = [];

let interval;
let position;
let mirrored = false;
let stream = null;

function startScrolling() {
    script.textContent = input.value;
    script.style.fontSize = fontSlider.value + "px";
    position = window.innerHeight;
    script.style.top = position + "px";
    clearInterval(interval);
    interval = setInterval(scrollText, 20);
}

function scrollText() {
    position -= speedSlider.value * 0.5;
    script.style.top = position + "px";
}

function pauseScrolling() {
    clearInterval(interval);
}

function resumeScrolling() {
    clearInterval(interval);
    interval = setInterval(scrollText, 20);
}

function toggleMirror() {
    mirrored = !mirrored;

    if (mirrored) {
        script.style.transform = "translateX(-50%) scaleX(-1)";
    } else {
        script.style.transform = "translateX(-50%)";
    }
}

function goFullscreen() {
    document.documentElement.requestFullscreen();
}

fontSlider.addEventListener("input", () => {
    script.style.fontSize = fontSlider.value + "px";
});

startBtn.addEventListener("click", startScrolling);
pauseBtn.addEventListener("click", pauseScrolling);
resumeBtn.addEventListener("click", resumeScrolling);
mirrorBtn.addEventListener("click", toggleMirror);
fullscreenBtn.addEventListener("click", goFullscreen);

async function startCamera() {
    if (stream) return;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        camera.srcObject = stream;
        cameraWindow.style.display = "block";
        cameraBtn.textContent = "Turn Camera Off";
    } catch {
        alert("Camera access was denied.");
    }
}

function stopCamera() {
    if (!stream) return;

    stream.getTracks().forEach(track => track.stop());

    stream = null;
    camera.srcObject = null;
    cameraWindow.style.display = "none";
    cameraBtn.textContent = "Turn Camera On";
}

cameraBtn.addEventListener("click", () => {
    if (stream) {
        stopCamera();
    } else {
        startCamera();
    }
});

closeCamera.addEventListener("click", stopCamera);

let dragging = false;
let offsetX = 0;
let offsetY = 0;

cameraHeader.addEventListener("mousedown", e => {
    dragging = true;

    offsetX = e.clientX - cameraWindow.offsetLeft;
    offsetY = e.clientY - cameraWindow.offsetTop;

    document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", e => {
    if (!dragging) return;

    cameraWindow.style.left = e.clientX - offsetX + "px";
    cameraWindow.style.top = e.clientY - offsetY + "px";
    cameraWindow.style.right = "auto";
});

document.addEventListener("mouseup", () => {
    dragging = false;
    document.body.style.userSelect = "";
});

let resizing = false;
let startWidth;
let startHeight;
let startX;
let startY;

resizeHandle.addEventListener("mousedown", e => {
    resizing = true;

    startWidth = cameraWindow.offsetWidth;
    startHeight = cameraWindow.offsetHeight;
    startX = e.clientX;
    startY = e.clientY;

    e.preventDefault();
});

document.addEventListener("mousemove", e => {
    if (!resizing) return;

    cameraWindow.style.width =
        Math.max(180, startWidth + e.clientX - startX) + "px";

    cameraWindow.style.height =
        Math.max(135, startHeight + e.clientY - startY) + "px";
});

document.addEventListener("mouseup", () => {
    resizing = false;
});

async function startRecording() {

    if (!stream) {
        alert("Turn on the camera first!");
        return;
    }

    recordedChunks = [];

    recorder = new MediaRecorder(stream, {
        mimeType: "video/webm"
    });

    recorder.ondataavailable = e => {
        if (e.data.size > 0) {
            recordedChunks.push(e.data);
        }
    };

    recorder.onstop = async () => {

        const webmBlob = new Blob(recordedChunks, {
            type: "video/webm"
        });

        const buffer = await webmBlob.arrayBuffer();

        const { FFmpeg } = FFmpegWASM;

        const ffmpeg = new FFmpeg();

        await ffmpeg.load();

        await ffmpeg.writeFile(
            "input.webm",
            new Uint8Array(buffer)
        );

        await ffmpeg.exec([
            "-i",
            "input.webm",
            "output.mp4"
        ]);

        const data = await ffmpeg.readFile("output.mp4");

        const mp4Blob = new Blob(
            [data.buffer],
            { type: "video/mp4" }
        );

        const url = URL.createObjectURL(mp4Blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "teleprompter-recording.mp4";
        a.click();

        URL.revokeObjectURL(url);
    };

    recorder.start();

    recordBtn.textContent = "Stop Recording";
}


function stopRecording() {

    if (recorder && recorder.state !== "inactive") {
        recorder.stop();
    }

    recordBtn.textContent = "Start Recording";
}


recordBtn.addEventListener("click", () => {

    if (recorder && recorder.state === "recording") {
        stopRecording();
    } else {
        startRecording();
    }

});
