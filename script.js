
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const scoreEl = document.getElementById("score");
    const highScoreEl = document.getElementById("highScore");
    const statusText = document.getElementById("statusText");

    const btnStart = document.getElementById("btnStart");
    const btnPause = document.getElementById("btnPause");
    const btnRestart = document.getElementById("btnRestart");
    const touchControls = document.getElementById("touchControls");

    // Responsive canvas setup
    function resizeCanvas() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const size = Math.floor(rect.width);
      canvas.width = size;
      canvas.height = size;
    }
    window.addEventListener("resize", () => {
      resizeCanvas();
      // Redraw to keep grid nice after resize
      drawBoard();
      drawFood();
      drawSnake();
    });
    resizeCanvas();

    // Grid settings
    const tileCount = 21;
    const getTileSize = () => canvas.width / tileCount;

    // Snake and food
    let snake = [{ x: 10, y: 10 }];
    let direction = { x: 0, y: 0 };
    let nextDirection = { x: 0, y: 0 };
    let food = randomFoodPosition();
    let score = 0;
    let highScore = Number(localStorage.getItem("snakeHighScore_v2") || 0);

    // Game state
    let gameInterval = null;
    const speed = 120;
    let isRunning = false;
    let isPaused = false;
    let isGameOver = false;

    highScoreEl.textContent = highScore;

    function drawBoard() {
      const tileSize = getTileSize();
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#020617");
      gradient.addColorStop(1, "#0b1120");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid
      ctx.strokeStyle = "rgba(30,64,175,0.18)";
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
      ctx.fillStyle = "#fb923c";
      ctx.shadowColor = "#fb923c";
      ctx.shadowBlur = 11;
      ctx.beginPath();
      const radius = tileSize / 2.2;
      const cx = food.x * tileSize + tileSize / 2;
      const cy = food.y * tileSize + tileSize / 2;
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawSnake() {
      const tileSize = getTileSize();
      snake.forEach((segment, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? "#22c55e" : "#4ade80";
        ctx.strokeStyle = "#022c22";
        ctx.lineWidth = 1.5;

        const x = segment.x * tileSize;
        const y = segment.y * tileSize;
        const radius = Math.max(3, tileSize * 0.25);

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + tileSize - radius, y);
        ctx.quadraticCurveTo(x + tileSize, y, x + tileSize, y + radius);
        ctx.lineTo(x + tileSize, y + tileSize - radius);
        ctx.quadraticCurveTo(
          x + tileSize,
          y + tileSize,
          x + tileSize - radius,
          y + tileSize
        );
        ctx.lineTo(x + radius, y + tileSize);
        ctx.quadraticCurveTo(x, y + tileSize, x, y + tileSize - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
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
        food = randomFoodPosition();
      } else {
        snake.pop();
      }

      drawBoard();
      drawFood();
      drawSnake();
    }

    function startGame() {
      if (isRunning && !isPaused && !isGameOver) return;

      if (isGameOver) {
        resetGame();
      }

      if (!direction.x && !direction.y) {
        nextDirection = { x: 1, y: 0 };
      }

      isRunning = true;
      isPaused = false;
      statusText.innerHTML = 'Game <span>running</span>. Enjoy!';
      if (!gameInterval) {
        gameInterval = setInterval(gameLoop, speed);
      }
    }

    function pauseGame() {
      if (!isRunning || isGameOver) return;
      isPaused = !isPaused;
      statusText.innerHTML = isPaused
        ? 'Game <span>paused</span>. Press Pause again or Start to resume.'
        : 'Game <span>running</span>. Enjoy!';
    }

    function endGame() {
      isGameOver = true;
      isRunning = false;
      isPaused = false;
      statusText.innerHTML = 'Game <span>over</span>. Press Restart to play again.';
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore_v2", highScore);
        highScoreEl.textContent = highScore;
      }
    }

    function resetGame() {
      snake = [{ x: 10, y: 10 }];
      direction = { x: 0, y: 0 };
      nextDirection = { x: 0, y: 0 };
      food = randomFoodPosition();
      score = 0;
      updateScore();
      isGameOver = false;
      drawBoard();
      drawFood();
      drawSnake();
      statusText.innerHTML = 'Press <span>Start</span>, use Arrow keys or touch controls to begin.';
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
        // space to pause/resume
        e.preventDefault();
        pauseGame();
        return;
      }

      if (key === "arrowup" || key === "w") {
        handleDirectionChange("up");
      } else if (key === "arrowdown" || key === "s") {
        handleDirectionChange("down");
      } else if (key === "arrowleft" || key === "a") {
        handleDirectionChange("left");
      } else if (key === "arrowright" || key === "d") {
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
  
