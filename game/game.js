
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${window.location.hostname}:3000`);

const statusEl = document.getElementById('status');
let connected = false;

socket.onopen = () => {
    socket.send(JSON.stringify({ type: 'register', role: 'game' }));
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'sensorData') {
        if (!connected) {
            connected = true;
            statusEl.textContent = 'Connected';
            statusEl.style.backgroundColor = '#0f0';
        }
        handleSensor(data.payload);
    }
};

socket.onerror = () => {
    statusEl.textContent = 'Error';
    statusEl.style.backgroundColor = '#f00';
};

socket.onclose = () => {
    connected = false;
    statusEl.textContent = 'Disconnected';
    statusEl.style.backgroundColor = '#ccc';
};

// Canvas \\
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 600;
canvas.height = 400;

let gameRunning = true;

const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    size: 15,
    targetX: canvas.width / 2
};

let balls = [];
let frameCount = 0;

function handleSensor(data) {
    const tiltY = parseFloat(data.y) || 0;
    player.targetX = canvas.width / 2 - (tiltY * 20);
    player.targetX = Math.max(player.size, Math.min(canvas.width - player.size, player.targetX));
}

function spawnBall() {
    balls.push({
        x: Math.random() * (canvas.width - 20) + 10,
        y: -10,
        speed: 2 + Math.random()
    });
}

function update() {
    if (!gameRunning) return;

    player.x += (player.targetX - player.x) * 0.1;

    frameCount++;
    if (frameCount % 60 === 0) {
        spawnBall();
    }

    for (let i = balls.length - 1; i >= 0; i--) {
        balls[i].y += balls[i].speed;

        if (balls[i].y > canvas.height + 10) {
            balls.splice(i, 1);
        }
    }

    for (let ball of balls) {
        const dx = Math.abs(ball.x - player.x);
        const dy = Math.abs(ball.y - player.y);
        if (dx < 20 && dy < 20) {
            gameOver();
            return;
        }
    }
}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //[spaceship]\\
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(-player.size, -player.size, player.size * 2, player.size * 2);
    ctx.restore();

    //[asteroids]\\
    ctx.fillStyle = '#f00';
    for (let ball of balls) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }
}

function gameLoop() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    document.getElementById('gameOver').classList.add('show');
}

function restartGame() {
    balls = [];
    frameCount = 0;
    player.x = canvas.width / 2;
    player.targetX = canvas.width / 2;
    gameRunning = true;
    document.getElementById('gameOver').classList.remove('show');
    gameLoop();
}

gameLoop();