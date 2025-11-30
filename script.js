const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const statusText = document.getElementById("statusText");

const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnRestart = document.getElementById("btnRestart");
const touchControls = document.getElementById("touchControls");
const soundToggle = document.getElementById("soundToggle");
const leaderboardList = document.getElementById("leaderboardList");

// Difficulty buttons
const difficultyBtns = document.querySelectorAll(".difficulty-btn");
let currentDifficulty = "medium";
const difficultySettings = {
  easy: { speed: 150, color: "#10b981" },
  medium: { speed: 100, color: "#22c55e" },
  hard: { speed: 60, color: "#ef4444" }
};

// Sound effects
let soundEnabled = true;
const sounds = {
  eat: null,
  gameOver: null,
  move: null
};

// Initialize audio context on first user interaction
let audioContext = null;
let audioInitialized = false;

function initAudio() {
  if (audioInitialized) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioInitialized = true;
}

function playTone(frequency, duration, type = 'sine') {
  if (!soundEnabled || !audioInitialized) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playEatSound() {
  playTone(800, 0.1, 'square');
  setTimeout(() => playTone(1000, 0.1, 'square'), 50);
}

function playGameOverSound() {
  playTone(400, 0.2, 'sawtooth');
  setTimeout(() => playTone(300, 0.2, 'sawtooth'), 150);
  setTimeout(() => playTone(200, 0.4, 'sawtooth'), 300);
}

// Particles
const particles = [];

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.life = 1.0;
    this.color = `hsl(${Math.random() * 60 + 15}, 100%, 60%)`;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.02;
    this.vy += 0.3; // gravity
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead() {
    return this.life <= 0;
  }
}

function createParticles(x, y, count = 15) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y));
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(p => p.draw());
}

// Responsive canvas setup
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const size = Math.floor(rect.width);
  canvas.width = size;
  canvas.height = size;
}

window.addEventListener("resize", () => {
  resizeCanvas();
  drawBoard();
  drawFood();
  drawSnake();
  drawParticles();
});

resizeCanvas();

// Grid settings
const tileCount = 25;
const getTileSize = () => canvas.width / tileCount;

// Snake and food
let snake = [{ x: 12, y: 12 }];
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let food = randomFoodPosition();
let score = 0;
let highScore = Number(localStorage.getItem("snakeHighScore_v3") || 0);
let leaderboard = JSON.parse(localStorage.getItem("snakeLeaderboard_v3") || "[]");

// Game state
let gameInterval = null;
let speed = difficultySettings[currentDifficulty].speed;
let isRunning = false;
let isPaused = false;
let isGameOver = false;

highScoreEl.textContent = highScore;
updateLeaderboard();

// Difficulty selection
difficultyBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    if (isRunning && !isGameOver) return; // Can't change during game

    currentDifficulty = btn.dataset.difficulty;
    speed = difficultySettings[currentDifficulty].speed;

    difficultyBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Sound toggle
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "🔊 Sound On" : "🔇 Sound Off";
});

function drawBoard() {
  const tileSize = getTileSize();

  // Dark gradient background
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 1.5
  );
  gradient.addColorStop(0, "#0a0e1a");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle animated grid
  const time = Date.now() / 1000;
  ctx.strokeStyle = `rgba(102, 126, 234, ${0.15 + Math.sin(time) * 0.05})`;
  ctx.lineWidth = 1;

  for (let i = 0; i <= tileCount; i++) {
    ctx.beginPath();
    ctx.moveTo(i * tileSize, 0);
    ctx.lineTo(i * tileSize, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i * tileSize);
    ctx.lineTo(canvas.width, i * tileSize);
    ctx.stroke();
  }
}

function drawFood() {
  const tileSize = getTileSize();
  const time = Date.now() / 500;
  const pulse = 1 + Math.sin(time) * 0.1;

  ctx.save();
  ctx.shadowColor = "#fb923c";
  ctx.shadowBlur = 20;

  // Outer glow
  ctx.fillStyle = "rgba(251, 146, 60, 0.3)";
  ctx.beginPath();
  const outerRadius = (tileSize / 2) * pulse * 1.3;
  const cx = food.x * tileSize + tileSize / 2;
  const cy = food.y * tileSize + tileSize / 2;
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Main food
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, tileSize / 2);
  gradient.addColorStop(0, "#fbbf24");
  gradient.addColorStop(0.5, "#fb923c");
  gradient.addColorStop(1, "#f97316");
  ctx.fillStyle = gradient;

  ctx.beginPath();
  const radius = (tileSize / 2.2) * pulse;
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSnake() {
  const tileSize = getTileSize();
  const snakeColor = difficultySettings[currentDifficulty].color;

  snake.forEach((segment, index) => {
    const isHead = index === 0;
    const alpha = 1 - (index / snake.length) * 0.3;

    ctx.save();

    if (isHead) {
      // Head with gradient and glow
      ctx.shadowColor = snakeColor;
      ctx.shadowBlur = 15;

      const gradient = ctx.createRadialGradient(
        segment.x * tileSize + tileSize / 2,
        segment.y * tileSize + tileSize / 2,
        0,
        segment.x * tileSize + tileSize / 2,
        segment.y * tileSize + tileSize / 2,
        tileSize / 2
      );
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(0.3, snakeColor);
      gradient.addColorStop(1, "#0ea5e9");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = snakeColor;
      ctx.globalAlpha = alpha;
    }

    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 2;

    const x = segment.x * tileSize;
    const y = segment.y * tileSize;
    const radius = Math.max(4, tileSize * 0.3);

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + tileSize - radius, y);
    ctx.quadraticCurveTo(x + tileSize, y, x + tileSize, y + radius);
    ctx.lineTo(x + tileSize, y + tileSize - radius);
    ctx.quadraticCurveTo(x + tileSize, y + tileSize, x + tileSize - radius, y + tileSize);
    ctx.lineTo(x + radius, y + tileSize);
    ctx.quadraticCurveTo(x, y + tileSize, x, y + tileSize - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw eyes on head
    if (isHead) {
      ctx.fillStyle = "#000000";
      ctx.shadowBlur = 0;

      const eyeSize = tileSize * 0.12;
      let eye1X = x + tileSize * 0.35;
      let eye2X = x + tileSize * 0.65;
      let eyeY = y + tileSize * 0.35;

      // Adjust eye position based on direction
      if (direction.x === 1) { // right
        eye1X = x + tileSize * 0.6;
        eye2X = x + tileSize * 0.6;
        eyeY = y + tileSize * 0.3;
        const eye2Y = y + tileSize * 0.7;
        ctx.beginPath();
        ctx.arc(eye1X, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (direction.x === -1) { // left
        eye1X = x + tileSize * 0.4;
        eye2X = x + tileSize * 0.4;
        eyeY = y + tileSize * 0.3;
        const eye2Y = y + tileSize * 0.7;
        ctx.beginPath();
        ctx.arc(eye1X, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (direction.y === -1) { // up
        eyeY = y + tileSize * 0.4;
        ctx.beginPath();
        ctx.arc(eye1X, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2X, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      } else { // down or no direction
        eyeY = y + tileSize * 0.6;
        ctx.beginPath();
        ctx.arc(eye1X, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(eye2X, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  });
}

function gameLoop() {
  if (!isRunning || isPaused || isGameOver) return;

  direction = nextDirection;

  const head = { ...snake[0] };
  head.x += direction.x;
  head.y += direction.y;

  // Wrap around walls
  if (head.x < 0) head.x = tileCount - 1;
  if (head.x >= tileCount) head.x = 0;
  if (head.y < 0) head.y = tileCount - 1;
  if (head.y >= tileCount) head.y = 0;

  // Self collision
  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);

  // Food collision
  if (head.x === food.x && head.y === food.y) {
    score += 1;
    updateScore();

    // Create particles at food position
    const tileSize = getTileSize();
    const px = food.x * tileSize + tileSize / 2;
    const py = food.y * tileSize + tileSize / 2;
    createParticles(px, py, 20);

    playEatSound();
    food = randomFoodPosition();
  } else {
    snake.pop();
  }

  drawBoard();
  drawFood();
  drawSnake();
  updateParticles();
  drawParticles();
}

function startGame() {
  initAudio(); // Initialize audio on first interaction

  if (isRunning && !isPaused && !isGameOver) return;

  if (isGameOver) {
    resetGame();
  }

  if (!direction.x && !direction.y) {
    nextDirection = { x: 1, y: 0 };
  }

  isRunning = true;
  isPaused = false;
  statusText.innerHTML = '🎮 Game <span>running</span>. Good luck!';

  if (gameInterval) {
    clearInterval(gameInterval);
  }
  gameInterval = setInterval(gameLoop, speed);
}

function pauseGame() {
  if (!isRunning || isGameOver) return;
  isPaused = !isPaused;
  statusText.innerHTML = isPaused
    ? '⏸️ Game <span>paused</span>. Press Pause or Start to resume.'
    : '🎮 Game <span>running</span>. Good luck!';
}

function endGame() {
  isGameOver = true;
  isRunning = false;
  isPaused = false;

  playGameOverSound();

  statusText.innerHTML = '💀 Game <span>over</span>! Press Restart to play again.';

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("snakeHighScore_v3", highScore);
    highScoreEl.textContent = highScore;
  }

  // Update leaderboard
  updateLeaderboardScores();

  if (gameInterval) {
    clearInterval(gameInterval);
    gameInterval = null;
  }
}

function resetGame() {
  snake = [{ x: 12, y: 12 }];
  direction = { x: 0, y: 0 };
  nextDirection = { x: 0, y: 0 };
  food = randomFoodPosition();
  score = 0;
  updateScore();
  isGameOver = false;
  particles.length = 0;
  drawBoard();
  drawFood();
  drawSnake();
  statusText.innerHTML = '👆 Press <span>Start</span>, use Arrow keys or touch controls to begin.';
}

function updateScore() {
  scoreEl.textContent = score;
}

function randomFoodPosition() {
  let newPos;
  do {
    newPos = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
  } while (snake.some(seg => seg.x === newPos.x && seg.y === newPos.y));
  return newPos;
}

function updateLeaderboardScores() {
  if (score === 0) return;

  leaderboard.push({
    score: score,
    difficulty: currentDifficulty,
    date: new Date().toLocaleDateString()
  });

  // Sort by score descending
  leaderboard.sort((a, b) => b.score - a.score);

  // Keep only top 5
  leaderboard = leaderboard.slice(0, 5);

  localStorage.setItem("snakeLeaderboard_v3", JSON.stringify(leaderboard));
  updateLeaderboard();
}

function updateLeaderboard() {
  leaderboardList.innerHTML = '';

  if (leaderboard.length === 0) {
    leaderboardList.innerHTML = '<li class="leaderboard-item" style="justify-content: center; color: #6b7280;">No scores yet</li>';
    return;
  }

  leaderboard.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'leaderboard-item';

    const diffEmoji = entry.difficulty === 'easy' ? '🟢' : entry.difficulty === 'medium' ? '🟡' : '🔴';

    li.innerHTML = `
      <span class="leaderboard-rank">#${index + 1}</span>
      <span>${diffEmoji} ${entry.difficulty}</span>
      <span class="leaderboard-score">${entry.score}</span>
    `;

    leaderboardList.appendChild(li);
  });
}

function handleDirectionChange(dir) {
  let newDir = { ...direction };

  if (dir === "up") {
    if (direction.y === 1) return;
    newDir = { x: 0, y: -1 };
  } else if (dir === "down") {
    if (direction.y === -1) return;
    newDir = { x: 0, y: 1 };
  } else if (dir === "left") {
    if (direction.x === 1) return;
    newDir = { x: -1, y: 0 };
  } else if (dir === "right") {
    if (direction.x === -1) return;
    newDir = { x: 1, y: 0 };
  } else {
    return;
  }

  if (!isRunning && !isGameOver) {
    startGame();
  }
  nextDirection = newDir;
}

function handleKeydown(e) {
  const key = e.key.toLowerCase();

  if (key === " " || key === "spacebar") {
    e.preventDefault();
    pauseGame();
    return;
  }

  if (key === "arrowup" || key === "w") {
    e.preventDefault();
    handleDirectionChange("up");
  } else if (key === "arrowdown" || key === "s") {
    e.preventDefault();
    handleDirectionChange("down");
  } else if (key === "arrowleft" || key === "a") {
    e.preventDefault();
    handleDirectionChange("left");
  } else if (key === "arrowright" || key === "d") {
    e.preventDefault();
    handleDirectionChange("right");
  }
}

// Event listeners
window.addEventListener("keydown", handleKeydown);
btnStart.addEventListener("click", startGame);
btnPause.addEventListener("click", pauseGame);
btnRestart.addEventListener("click", () => {
  resetGame();
  startGame();
});

touchControls.addEventListener("click", (e) => {
  const btn = e.target.closest(".touch-btn");
  if (!btn || btn.classList.contains("empty")) return;
  const dir = btn.getAttribute("data-dir");
  handleDirectionChange(dir);
});

// Initial draw
drawBoard();
drawFood();
drawSnake();
