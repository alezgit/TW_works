let gallery = document.querySelector('.gallery');
let galleryItems = document.querySelectorAll('.gallery-item');
let leftArrow = document.getElementById('leftarrow');
let rightArrow = document.getElementById('rightarrow');
let captionDivs = document.querySelectorAll('#caption-box .caption');
let currentIndex = 0;

function showImage(index) {
    galleryItems.forEach((item, i) => {
        item.style.display = i === index ? 'block' : 'none';
    });
    captionDivs.forEach((caption, i) => {
        caption.classList.toggle('active', i === index);
    });
}

leftArrow.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    showImage(currentIndex);
});

rightArrow.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % galleryItems.length;
    showImage(currentIndex);
});

showImage(currentIndex);

let audioSource = null;
let isAudioReady = false;

async function loadAndVisualizeAudio(audioUrl) {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Can't load the file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
    visualize(audioBuffer, audioContext);

    isAudioReady = true;
    const button = document.getElementById('playButton');
    if (button) {
        button.disabled = false;
        button.textContent = 'Click here to listen (and visualize!) to my favourite song in the album, "Trance Dance"';
    }
  });
}

function visualize(audioBuffer, audioContext) {
  const canvas = document.getElementById("canvas")
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight

  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 256

  const frequencyBufferLength = analyser.frequencyBinCount
  const frequencyData = new Uint8Array(frequencyBufferLength)

  const source = audioContext.createBufferSource()
  source.buffer = audioBuffer
  source.connect(analyser)
  analyser.connect(audioContext.destination)
  
  audioSource = source; 

  const canvasContext = canvas.getContext("2d")
  const barWidth = (canvas.width + 550) / frequencyBufferLength

  function draw() {
    requestAnimationFrame(draw)
    canvasContext.fillStyle = "rgb(231, 222, 212)"
    canvasContext.fillRect(0, 0, canvas.width, canvas.height)

    analyser.getByteFrequencyData(frequencyData)
    window.currentFrequencyData = frequencyData;

    for (let i = 0; i < frequencyBufferLength; i++) {
      canvasContext.fillStyle = "rgb(" + (frequencyData[i]) + ",0, 0)";
      canvasContext.fillRect(
        i*barWidth,
        canvas.height - (0.8*frequencyData[i]),
        barWidth-1,
        frequencyData[i]
      )
    }
  }

  draw() 
}

function startAudio() {
    if (isAudioReady && audioSource) {
        if (audioSource.context.state === 'suspended') {
            audioSource.context.resume();
        }
        audioSource.start(0); 
        
        const button = document.getElementById('playButton');
        if (button) {
            button.disabled = true;
            button.textContent = 'Reproducing "Trance Dance", track number 8 of "Eye of the Beholder" by Chick Corea Elektric Band... Enjoy!';
        }
    }
}

const fileUrl = 'trancedance.mp3';
loadAndVisualizeAudio(fileUrl).catch(console.error);

let videoCanvas;
let videoCtx;
let isCustomFilterActive = false;
let videoProcessingInterval = null;

function initVideoCanvas() {
    const video = document.getElementById('video');
    
    if (!video) return;
    
    if (!videoCanvas) {
        videoCanvas = document.createElement('canvas');
        videoCtx = videoCanvas.getContext('2d', { willReadFrequently: true });
        
        videoCanvas.style.position = 'absolute';
        videoCanvas.style.top = video.offsetTop + 'px';
        videoCanvas.style.left = video.offsetLeft + 'px';
        videoCanvas.style.width = getComputedStyle(video).width;
        videoCanvas.style.height = getComputedStyle(video).height;
        videoCanvas.style.borderRadius = getComputedStyle(video).borderRadius;
        videoCanvas.style.boxShadow = getComputedStyle(video).boxShadow;
        videoCanvas.style.pointerEvents = 'none';
        videoCanvas.style.display = 'none';
        
        video.parentNode.insertBefore(videoCanvas, video.nextSibling);
    }
    
    const setCanvasSize = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            videoCanvas.width = video.videoWidth;
            videoCanvas.height = video.videoHeight;
        } else {
            videoCanvas.width = 640;
            videoCanvas.height = 480;
        }
        
        videoCanvas.style.top = video.offsetTop + 'px';
        videoCanvas.style.left = video.offsetLeft + 'px';
        videoCanvas.style.width = getComputedStyle(video).width;
        videoCanvas.style.height = getComputedStyle(video).height;
    };
    
    if (video.readyState >= 2) {
        setCanvasSize();
    }
    
    video.addEventListener('loadedmetadata', setCanvasSize);
    video.addEventListener('canplay', setCanvasSize);
}

function processVideo(frequencyData) {
    const video = document.getElementById('video');
    
    if (isCustomFilterActive && video && !video.paused && videoCanvas && videoCtx) {
        if (video.videoWidth > 0 && (videoCanvas.width !== video.videoWidth || videoCanvas.height !== video.videoHeight)) {
            videoCanvas.width = video.videoWidth;
            videoCanvas.height = video.videoHeight;
        }
        
        videoCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
        
        const imageData = videoCtx.getImageData(0, 0, videoCanvas.width, videoCanvas.height);
        const pixels = imageData.data;
        
        let avgFrequency = 0;
        for (let i = 0; i < frequencyData.length; i++) {
            avgFrequency += frequencyData[i];
        }
        avgFrequency = avgFrequency / frequencyData.length;
        
        const intensityFactor = 1 + (avgFrequency / 255) * 2.5;
        
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = Math.min(255, pixels[i] * intensityFactor);         // Red
            pixels[i + 1] = Math.min(255, pixels[i + 1] * intensityFactor); // Green
            pixels[i + 2] = Math.min(255, pixels[i + 2] * intensityFactor); // Blue
        }
        
        videoCtx.putImageData(imageData, 0, 0);
    }
}

function applyFilter(filterType) {
    const video = document.getElementById('video');
    
    if (!video || !videoCanvas) return;
    
    if (filterType === 'custom') {
        isCustomFilterActive = true;
        
        video.style.opacity = '0';
        videoCanvas.style.display = 'block';
        
        if (videoProcessingInterval) {
            clearInterval(videoProcessingInterval);
        }
        
        videoProcessingInterval = setInterval(() => {
            if (window.currentFrequencyData) {
                processVideo(window.currentFrequencyData);
            }
        }, 33);
        
    } else {
        isCustomFilterActive = false;
        video.style.opacity = '1';
        videoCanvas.style.display = 'none';
        
        if (videoProcessingInterval) {
            clearInterval(videoProcessingInterval);
            videoProcessingInterval = null;
        }
        
        switch(filterType) {
            case 'none':
                video.style.filter = 'none';
                break;
            case 'grayscale':
                video.style.filter = 'grayscale(100%)';
                break;
            case 'sepia':
                video.style.filter = 'sepia(100%)';
                break;
            default:
                video.style.filter = 'none';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initVideoCanvas();
    
    const defaultButton = document.querySelector('.filter-btn[data-filter="none"]');
    if (defaultButton) {
        defaultButton.classList.add('active');
    }
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            const filterType = this.getAttribute('data-filter');
            applyFilter(filterType);
        });
    });
});

window.currentFrequencyData = new Uint8Array(128);



const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const btnCall = document.getElementById('btn-call');

const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');

let streamLocal = null;
let pc1; 
let pc2; 
let dataChannel1; 
let dataChannel2; 

const stunConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

async function startMedia() {
    streamLocal = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = streamLocal;
}

function writeLog(message, type) {
    let p = document.createElement('p');
    p.className = type; 
    if (type === 'friend') {
        p.textContent = `Friend: ${message}`;
    } else if (type === 'me') {
        p.textContent = `Me: ${message}`;
    } else {
        p.textContent = `--- ${message} ---`;
    }
    chatLog.appendChild(p);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function configureDataChannelEvents(channel) {
    channel.onopen = () => {
        console.log('The data channel is open!');
        chatInput.disabled = false;
        btnSend.disabled = false;
        writeLog('Connection established!', 'system');
    };

    channel.onclose = () => {
        console.log('The data channel is closed.');
        chatInput.disabled = true;
        btnSend.disabled = true;
        writeLog('Connection lost.', 'system');
    };

    channel.onmessage = (event) => {
        console.log('Message received:', event.data);
        writeLog(event.data, 'friend');
    };
}

btnCall.addEventListener('click', async () => {
    console.log('Starting simulated call');
    
    await startMedia();
    
    pc1 = new RTCPeerConnection(stunConfig);
    pc2 = new RTCPeerConnection(stunConfig);

    pc1.onicecandidate = (event) => {
        if (event.candidate) {
            pc2.addIceCandidate(event.candidate);
        }
    };

    pc2.onicecandidate = (event) => {
        if (event.candidate) {
            pc1.addIceCandidate(event.candidate);
        }
    };

    pc1.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
        console.log('Remote track received');
    };

    pc2.ondatachannel = (event) => {
        dataChannel2 = event.channel;
        configureDataChannelEvents(dataChannel2);
    };

    streamLocal.getTracks().forEach(track => {
        pc1.addTrack(track, streamLocal);
        pc2.addTrack(track, streamLocal);
    });

    dataChannel1 = pc1.createDataChannel('chat');
    console.log('Creating Data Channel');
    configureDataChannelEvents(dataChannel1);

    // Create offer
    const offer = await pc1.createOffer();
    await pc1.setLocalDescription(offer);
    await pc2.setRemoteDescription(new RTCSessionDescription(offer));

    // Create answer
    const answer = await pc2.createAnswer();
    await pc2.setLocalDescription(answer);
    await pc1.setRemoteDescription(new RTCSessionDescription(answer));

    console.log('Connection established');
});

btnSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const message = chatInput.value;
    if (message.trim() === '') return;

    dataChannel1.send(message);
    writeLog(message, 'me');
    chatInput.value = '';
}