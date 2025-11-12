// ===== WEBSOCKET CONNECTION =====
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${window.location.hostname}:3000`);

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
let controllerConnected = false;

socket.onopen = () => {
    console.log('✅ WebSocket connected');
    socket.send(JSON.stringify({ type: 'register', role: 'game' }));
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'sensorData') {
        if (!controllerConnected) {
            controllerConnected = true;
            statusDot.classList.add('connected');
            statusText.textContent = 'Controller connected!';
        }
        handleSensorData(data.payload);
    }
};

socket.onerror = (err) => {
    console.error('❌ WebSocket error:', err);
    statusText.textContent = 'Connection error';
};

socket.onclose = () => {
    console.log('🔌 WebSocket disconnected');
    controllerConnected = false;
    statusDot.classList.remove('connected');
    statusText.textContent = 'Disconnected';
};

// ===== QR CODE FUNCTIONALITY =====
let qrCodeGenerated = false;

function generateQRCode() {
    if (qrCodeGenerated) return;
    
    const baseURL = window.location.origin;
    const controllerURL = `${baseURL}/controller.html`;
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    
    new QRCode(qrContainer, {
        text: controllerURL,
        width: 200,
        height: 200,
        colorDark: "#C8102E",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    document.getElementById('qrUrl').textContent = controllerURL;
    document.getElementById('controllerUrl').textContent = controllerURL;
    qrCodeGenerated = true;
}

function showQR() {
    generateQRCode();
    document.getElementById('qrSection').classList.add('show');
}

function closeQR() {
    document.getElementById('qrSection').classList.remove('show');
}

// Generate QR code on page load
window.addEventListener('load', () => {
    generateQRCode();
});

// ===== GAME CODE =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas resolution
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game variables
let score = 0;
let gameRunning = false;
let animationId;
let obstacles = [];
let lastObstacleTime = 0;
let gameSpeed = 4.5; // Velocità iniziale aumentata
let obstacleSpawnRate = 1200; // Spawn MOLTO più frequente

// Player
const player = {
    x: 80,
    y: canvas.height / 2,
    width: 28, // Leggermente più piccolo per più sfida
    height: 28,
    velocityY: 0,
    targetY: canvas.height / 2,
    color: '#C8102E'
};

// Sensor data handler
function handleSensorData(data) {
    if (!gameRunning) return;
    
    // Y-axis controls vertical movement
    const tiltY = parseFloat(data.y) || 0;
    
    // Map tilt to canvas position (sensitivity: 22 - leggermente aumentata)
    const sensitivity = 22;
    player.targetY = canvas.height / 2 - (tiltY * sensitivity);
    
    // Keep player within bounds
    player.targetY = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.targetY));
}

// Start game button
document.getElementById('startBtn').addEventListener('click', () => {
    if (!controllerConnected) {
        alert('Please connect your phone controller first!');
        showQR();
        return;
    }
    startGame();
});

// Start game
function startGame() {
    score = 0;
    obstacles = [];
    lastObstacleTime = 0;
    gameSpeed = 4.5;
    obstacleSpawnRate = 1200;
    player.y = canvas.height / 2;
    player.targetY = canvas.height / 2;
    gameRunning = true;
    
    document.getElementById('scoreValue').textContent = '0';
    document.getElementById('startBtn').disabled = true;
    document.getElementById('gameOverScreen').classList.remove('show');
    
    gameLoop();
}

// Spawn obstacle - MOLTO PIÙ DIFFICILE
function spawnObstacle() {
    // COLONNE MOLTO PIÙ ALTE (minimo 180, max 280)
    const obstacleHeight = Math.random() * 100 + 180;
    
    // 50% chance di spawn top/bottom, 50% chance di spawn pair (più coppie!)
    const spawnType = Math.random();
    
    if (spawnType < 0.5) {
        // Single obstacle (top o bottom) - MOLTO ALTO
        const isTop = Math.random() > 0.5;
        
        obstacles.push({
            x: canvas.width,
            y: isTop ? 0 : canvas.height - obstacleHeight,
            width: 50, // Ancora più larghi
            height: obstacleHeight,
            passed: false
        });
    } else {
        // Pair of obstacles (top e bottom con gap STRETTO al centro)
        const gapSize = Math.random() * 40 + 80; // Gap STRETTO tra 80-120px (era 100-160)
        const topHeight = Math.random() * 120 + 150; // 150-270px - MOLTO ALTO
        const bottomHeight = canvas.height - topHeight - gapSize;
        
        obstacles.push({
            x: canvas.width,
            y: 0,
            width: 50,
            height: topHeight,
            passed: false
        });
        
        obstacles.push({
            x: canvas.width,
            y: canvas.height - bottomHeight,
            width: 50,
            height: bottomHeight,
            passed: false,
            isPair: true // Evita doppio conteggio score
        });
    }
}

// Update game state
function update(timestamp) {
    // Spawn obstacles - frequenza dinamica
    if (timestamp - lastObstacleTime > obstacleSpawnRate) {
        spawnObstacle();
        lastObstacleTime = timestamp;
    }
    
    // Update player position (smooth movement)
    player.velocityY = (player.targetY - player.y) * 0.15;
    player.y += player.velocityY;
    
    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        
        // Check if obstacle passed (solo se non è parte di una coppia già contata)
        if (!obstacles[i].passed && !obstacles[i].isPair && obstacles[i].x + obstacles[i].width < player.x) {
            obstacles[i].passed = true;
            score++;
            document.getElementById('scoreValue').textContent = score;
            
            // Aumenta difficoltà progressivamente
            if (score % 3 === 0 && score > 0) {
                gameSpeed += 0.4; // Aumento velocità più graduale
            }
            
            // Diminuisci spawn rate ogni 5 punti
            if (score % 5 === 0 && obstacleSpawnRate > 800) {
                obstacleSpawnRate -= 100; // Ostacoli più frequenti
            }
        }
        
        // Remove off-screen obstacles
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
    
    // Check collisions
    checkCollisions();
}

// Check collisions
function checkCollisions() {
    for (let obstacle of obstacles) {
        // AABB collision detection con margine leggermente più generoso
        const margin = 2; // Piccolo margine per rendere più fair
        
        if (player.x + margin < obstacle.x + obstacle.width &&
            player.x + player.width - margin > obstacle.x &&
            player.y + margin < obstacle.y + obstacle.height &&
            player.y + player.height - margin > obstacle.y) {
            gameOver();
            return;
        }
    }
    
    // Check if player hits top or bottom
    if (player.y - player.height / 2 < 0 || player.y + player.height / 2 > canvas.height) {
        gameOver();
    }
}

// Draw game
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground line
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 5);
    ctx.lineTo(canvas.width, canvas.height - 5);
    ctx.stroke();
    
    // Draw player (circle)
    ctx.fillStyle = player.color;
    ctx.shadowColor = 'rgba(200, 16, 46, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw player outline
    ctx.strokeStyle = '#FFB000';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw obstacles
    for (let obstacle of obstacles) {
        ctx.fillStyle = '#FFB000';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Obstacle outline
        ctx.strokeStyle = '#C8102E';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    
    // Draw speed indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = '14px Arial';
    ctx.fillText(`Speed: ${gameSpeed.toFixed(1)}x`, 10, canvas.height - 15);
}

// Game loop
function gameLoop(timestamp = 0) {
    if (!gameRunning) return;
    
    update(timestamp);
    draw();
    
    animationId = requestAnimationFrame(gameLoop);
}

// Game over
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').classList.add('show');
    document.getElementById('startBtn').disabled = false;
}

// Restart game
function restartGame() {
    startGame();
}

// Allow keyboard controls for testing on desktop
window.addEventListener('keydown', (e) => {
    if (!gameRunning) return;
    
    if (e.key === 'ArrowUp') {
        player.targetY = Math.max(player.height / 2, player.targetY - 30);
    } else if (e.key === 'ArrowDown') {
        player.targetY = Math.min(canvas.height - player.height / 2, player.targetY + 30);
    }
});