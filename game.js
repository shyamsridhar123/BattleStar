// Updated game.js with local audio files
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get UI elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const finalScoreElement = document.getElementById('final-score');
const audioNotification = document.getElementById('audio-notification');
const enableAudioButton = document.getElementById('enable-audio');
const toggleMusicButton = document.getElementById('toggle-music');

// Audio elements
const backgroundMusic = document.getElementById('background-music');
const laserSound = document.getElementById('laser-sound');
const explosionSound = document.getElementById('explosion-sound');
let musicEnabled = true;
let soundEnabled = true;
let audioInitialized = false;

// Game state variables
let keys = {};
let bullets = [];
let enemies = [];
let powerUps = [];
let activePowerUps = {
    rapidFire: {active: false, endTime: 0},
    shield: {active: false, endTime: 0, hits: 0},
    doubleDamage: {active: false, endTime: 0},
    speedBoost: {active: false, endTime: 0}
};
let score = 0;
let wave = 1;
let waveTimer = 0;
let enemiesInWave = 5;
let enemiesSpawned = 0;
let gameActive = false;
let animationFrameId;

// Audio initialization and control functions
function initAudio() {
    if (audioInitialized) return;
    
    // Set volumes
    backgroundMusic.volume = 0.5;
    if (laserSound) laserSound.volume = 0.3;
    if (explosionSound) explosionSound.volume = 0.4;
    
    // Force a user interaction to enable audio
    const allAudios = [backgroundMusic];
    if (laserSound) allAudios.push(laserSound);
    if (explosionSound) allAudios.push(explosionSound);
    
    // Try to play and immediately pause all audio elements
    // This helps initialize audio on mobile devices
    allAudios.forEach(audio => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                audio.pause();
                audio.currentTime = 0;
            }).catch(error => {
                console.log("Audio couldn't be initialized:", error);
                // Show audio notification if audio initialization fails
                audioNotification.style.display = 'block';
            });
        }
    });
    
    audioInitialized = true;
}

function setupAudio() {
    // Add click events for audio buttons
    toggleMusicButton.addEventListener('click', toggleMusic);
    enableAudioButton.addEventListener('click', forceSoundEnable);
    
    // Add visual feedback for audio buttons
    toggleMusicButton.addEventListener('click', function() {
        this.style.transform = 'scale(1.2)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 200);
    });
}

//Add a direct audio enablement function that responds to user clicks
function forceSoundEnable() {
    // This function is called when the user clicks the "Enable Audio" button
    initAudio();
    
    // Hide the notification
    audioNotification.style.display = 'none';
    
    // Direct play approach with user gesture
    try {
        console.log("Force playing audio file:", backgroundMusic.src);
        backgroundMusic.volume = 0.7; // Increase volume slightly for better audibility
        backgroundMusic.currentTime = 0;
        const directPlay = backgroundMusic.play();
        
        directPlay.then(() => {
            console.log("Audio playing successfully through direct play");
            toggleMusicButton.textContent = '🔊';
            musicEnabled = true;
        }).catch(e => {
            console.error("Still failed to play audio:", e);
            // Try an alternative method as last resort
            createFallbackAudio();
        });
    } catch(e) {
        console.error("Error in direct audio play:", e);
        createFallbackAudio();
    }
}

// Create a secondary audio element as fallback
function createFallbackAudio() {
    console.log("Creating fallback audio element");
    
    // Create a brand new audio element
    const newAudio = new Audio();
    newAudio.src = "audio/EPIC!!!.mp3";
    newAudio.volume = 0.7;
    newAudio.loop = true;
    
    // Try playing with this new element
    try {
        const fallbackPlay = newAudio.play();
        fallbackPlay.then(() => {
            console.log("Fallback audio playing successfully");
            // Replace the original audio element reference
            backgroundMusic = newAudio;
            toggleMusicButton.textContent = '🔊';
            musicEnabled = true;
        }).catch(e => {
            console.error("Even fallback audio failed:", e);
            alert("Your browser is blocking audio playback. Please check your browser settings or try another browser.");
        });
    } catch(e) {
        console.error("Error in fallback audio:", e);
    }
}

function toggleMusic() {
    if (musicEnabled) {
        backgroundMusic.pause();
        toggleMusicButton.textContent = '🔇';
        musicEnabled = false;
    } else {
        playMusic();
        toggleMusicButton.textContent = '🔊';
        musicEnabled = true;
    }
}

// Add an explicit error message when audio fails to play
function playMusic() {
    // Force initialization if not already done
    initAudio();
    
    // Reset the audio to the beginning if it's been playing
    if (backgroundMusic.currentTime > 0) {
        backgroundMusic.currentTime = 0;
    }
    
    // Check if the file exists and is properly loaded
    console.log("Audio file status:", backgroundMusic.networkState);
    
    // Try to play the music with better error handling
    if (musicEnabled) {
        console.log("Attempting to play music:", backgroundMusic.src);
        
        // Show a notification to users about the audio
        audioNotification.style.display = 'block';
        
        const playPromise = backgroundMusic.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Music playback started successfully");
                audioNotification.style.display = 'none';
            }).catch(error => {
                console.error("Audio autoplay was prevented:", error);
                // Update button to show music is not playing
                toggleMusicButton.textContent = '🔇';
                musicEnabled = false;
            });
        }
    }
}

function playSoundEffect(soundElement) {
    if (!soundEnabled || !soundElement) return;
    
    // Clone the sound element to allow overlapping sounds
    const soundClone = soundElement.cloneNode();
    soundClone.volume = soundElement.volume;
    
    // Play the sound
    const playPromise = soundClone.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Sound effect couldn't be played:", error);
        });
    }
    
    // Clean up the cloned element after it plays
    soundClone.addEventListener('ended', () => {
        soundClone.remove();
    });
}

// Player ship class
class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 60;
        this.speed = 5;
    }

    update() {
        if (keys['ArrowLeft'] && this.x > 0) this.x -= this.speed;
        if (keys['ArrowRight'] && this.x < canvas.width - this.width) this.x += this.speed;
        if (keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if (keys['ArrowDown'] && this.y < canvas.height - this.height) this.y += this.speed;
    }

    render() {
        createPlayerShip(ctx, this.x, this.y, this.width, this.height);
    }
}

// Bullet class
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 15;
        this.speed = 8;
    }

    update() {
        this.y -= this.speed;
    }

    render() {
        ctx.fillStyle = '#00FFFF'; // Cyan color for bullets
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

// Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 50;
        this.speed = 1 + Math.random() * (wave * 0.5); // Speed increases with wave
        this.type = Math.floor(Math.random() * 4); // 4 different enemy types
        this.points = (this.type + 1) * 10; // Different enemies have different point values
    }

    update() {
        this.y += this.speed;
        
        // Simple movement pattern variation
        if (wave > 2) {
            this.x += Math.sin(this.y / 30) * 2; // Wavy movement in later waves
        }
    }

    render() {
        switch (this.type) {
            case 0:
                createEnemyType1(ctx, this.x, this.y, this.width, this.height);
                break;
            case 1:
                createEnemyType2(ctx, this.x, this.y, this.width, this.height);
                break;
            case 2:
                createEnemyType3(ctx, this.x, this.y, this.width, this.height);
                break;
            case 3:
                createEnemyType4(ctx, this.x, this.y, this.width, this.height);
                break;
        }
    }
}

// PowerUp class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.type = type;
        this.rotationAngle = 0;
        this.rotationSpeed = 0.05;
        this.pulseSize = 0;
        this.pulseDirection = 1;
    }

    update() {
        this.y += this.speed;
        
        // Add rotation animation
        this.rotationAngle += this.rotationSpeed;
        
        // Add pulse effect
        if (this.pulseDirection === 1) {
            this.pulseSize += 0.05;
            if (this.pulseSize >= 1.2) this.pulseDirection = -1;
        } else {
            this.pulseSize -= 0.05;
            if (this.pulseSize <= 0.8) this.pulseDirection = 1;
        }
    }

    render() {
        ctx.save();
        
        // Draw with rotation and pulse
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotationAngle);
        ctx.scale(1 + this.pulseSize * 0.2, 1 + this.pulseSize * 0.2);
        
        // Different colors and shapes based on power-up type
        switch(this.type) {
            case 'rapidFire':
                // Rapid fire (blue)
                ctx.fillStyle = '#00BBFF';
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(-this.width/4, -this.height/3, this.width/2, this.height/6);
                ctx.fillRect(-this.width/4, this.height/6, this.width/2, this.height/6);
                break;
                
            case 'shield':
                // Shield (green)
                ctx.fillStyle = '#00FF88';
                ctx.beginPath();
                ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, this.width/3, 0, Math.PI * 2);
                ctx.stroke();
                break;
                
            case 'doubleDamage':
                // Double damage (red)
                ctx.fillStyle = '#FF4040';
                ctx.beginPath();
                ctx.moveTo(0, -this.height/2);
                ctx.lineTo(this.width/2, this.height/2);
                ctx.lineTo(-this.width/2, this.height/2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(0, 0, this.width/6, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'speedBoost':
                // Speed boost (yellow)
                ctx.fillStyle = '#FFDD00';
                ctx.beginPath();
                ctx.moveTo(-this.width/2, -this.height/2);
                ctx.lineTo(this.width/2, 0);
                ctx.lineTo(-this.width/2, this.height/2);
                ctx.closePath();
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }
}

// Create ship and enemy sprites directly with canvas
function createPlayerShip(ctx, x, y, width, height) {
    // Draw player ship (blue triangular ship)
    ctx.fillStyle = '#4090FF';
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
    
    // Add details to the ship
    ctx.fillStyle = '#90C0FF';
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + 10);
    ctx.lineTo(x + 10, y + height - 10);
    ctx.lineTo(x + width - 10, y + height - 10);
    ctx.closePath();
    ctx.fill();
    
    // Add engine flames
    ctx.fillStyle = '#FF5020';
    ctx.beginPath();
    ctx.moveTo(x + width / 2 - 10, y + height);
    ctx.lineTo(x + width / 2, y + height + 10);
    ctx.lineTo(x + width / 2 + 10, y + height);
    ctx.closePath();
    ctx.fill();
}

function createEnemyType1(ctx, x, y, width, height) {
    // Draw enemy type 1 (red invader)
    ctx.fillStyle = '#FF4040';
    ctx.fillRect(x, y, width, height);
    
    // Add details
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 10, y + 10, 10, 10);
    ctx.fillRect(x + width - 20, y + 10, 10, 10);
    ctx.fillRect(x + 15, y + 30, width - 30, 10);
}

function createEnemyType2(ctx, x, y, width, height) {
    // Draw enemy type 2 (green alien)
    ctx.fillStyle = '#40FF40';
    ctx.beginPath();
    ctx.arc(x + width/2, y + height/2, width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Add details
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x + width/3, y + height/3, width/10, 0, Math.PI * 2);
    ctx.arc(x + 2*width/3, y + height/3, width/10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x + width/2, y + 2*height/3, width/5, 0, Math.PI);
    ctx.stroke();
}

// Clear cache and reload the game
function clearCacheAndReload() {
    console.log("Clearing cache and reloading game...");
    
    // Clear audio elements
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
    
    // Reset game state
    gameActive = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // Clear all arrays
    bullets = [];
    enemies = [];
    powerUps = [];
    explosions = [];
    
    // Reset power-ups
    activePowerUps = {
        rapidFire: {active: false, endTime: 0},
        shield: {active: false, endTime: 0, hits: 0},
        doubleDamage: {active: false, endTime: 0},
        speedBoost: {active: false, endTime: 0}
    };
    
    // Force audio to reinitialize
    audioInitialized = false;
    
    // Add a small delay before reloading to ensure cleanup
    setTimeout(() => {
        // Reload the page
        window.location.reload(true); // true forces a reload from server, not cache
    }, 100);
}

function createEnemyType3(ctx, x, y, width, height) {
    // Draw enemy type 3 (purple diamond)
    ctx.fillStyle = '#A040FF';
    ctx.beginPath();
    ctx.moveTo(x + width/2, y);
    ctx.lineTo(x + width, y + height/2);
    ctx.lineTo(x + width/2, y + height);
    ctx.lineTo(x, y + height/2);
    ctx.closePath();
    ctx.fill();
    
    // Add details
    ctx.fillStyle = '#D090FF';
    ctx.beginPath();
    ctx.arc(x + width/2, y + height/2, width/4, 0, Math.PI * 2);
    ctx.fill();
}

function createEnemyType4(ctx, x, y, width, height) {
    // Draw enemy type 4 (yellow boss)
    ctx.fillStyle = '#FFFF40';
    ctx.fillRect(x, y, width, height);
    
    // Add details
    ctx.fillStyle = '#FF8000';
    ctx.fillRect(x + 5, y + 10, width - 10, height/3);
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 10, y + height/2, 10, 10);
    ctx.fillRect(x + width - 20, y + height/2, 10, 10);
}

// Initialize player
let playerShip = new Ship(canvas.width / 2 - 25, canvas.height - 100);

// Event listeners for key presses
window.addEventListener('keydown', (e) => { 
    if (gameActive) {
        keys[e.key] = true; 
    }
});
window.addEventListener('keyup', (e) => { 
    keys[e.key] = false; 
});

// Shoot bullets with sound
window.addEventListener('keydown', (e) => {
    if (e.key === ' ' && gameActive) {
        // Normal bullet
        bullets.push(new Bullet(playerShip.x + playerShip.width / 2 - 2.5, playerShip.y));
        
        // Add extra bullets if rapid fire is active
        if (activePowerUps.rapidFire.active) {
            // Add two more bullets spread apart
            bullets.push(new Bullet(playerShip.x + playerShip.width / 4 - 2.5, playerShip.y + 5));
            bullets.push(new Bullet(playerShip.x + playerShip.width * 3/4 - 2.5, playerShip.y + 5));
        }
        
        // Play laser sound effect
        playSoundEffect(laserSound);
    }
});

// Handle enemy destroyed with sound and power-up spawning
function handleEnemyDestroyed(enemy) {
    // Increase score based on enemy type
    score += enemy.points;
    
    // Chance to spawn power-up (15% chance)
    if (Math.random() < 0.15) {
        spawnPowerUp(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
    }
    
    // Play explosion sound
    playSoundEffect(explosionSound);
    
    // Add explosion effect
    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
}

// Spawn a random power-up
function spawnPowerUp(x, y) {
    const types = ['rapidFire', 'shield', 'doubleDamage', 'speedBoost'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    powerUps.push(new PowerUp(x - 15, y - 15, randomType)); // Center the power-up
}

// Apply power-up effect
function applyPowerUp(type) {
    const duration = 10000; // 10 seconds
    const currentTime = Date.now();
    
    switch(type) {
        case 'rapidFire':
            activePowerUps.rapidFire.active = true;
            activePowerUps.rapidFire.endTime = currentTime + duration;
            break;
            
        case 'shield':
            activePowerUps.shield.active = true;
            activePowerUps.shield.endTime = currentTime + duration;
            activePowerUps.shield.hits = 3; // Shield can take 3 hits
            break;
            
        case 'doubleDamage':
            activePowerUps.doubleDamage.active = true;
            activePowerUps.doubleDamage.endTime = currentTime + duration;
            break;
            
        case 'speedBoost':
            activePowerUps.speedBoost.active = true;
            activePowerUps.speedBoost.endTime = currentTime + duration;
            playerShip.speed = 8; // Increase player speed
            break;
    }
}

// Update active power-ups and handle expiration
function updatePowerUps() {
    const currentTime = Date.now();
    
    // Rapid fire power-up
    if (activePowerUps.rapidFire.active && currentTime > activePowerUps.rapidFire.endTime) {
        activePowerUps.rapidFire.active = false;
    }
    
    // Shield power-up
    if (activePowerUps.shield.active) {
        if (currentTime > activePowerUps.shield.endTime || activePowerUps.shield.hits <= 0) {
            activePowerUps.shield.active = false;
        }
    }
    
    // Double damage power-up
    if (activePowerUps.doubleDamage.active && currentTime > activePowerUps.doubleDamage.endTime) {
        activePowerUps.doubleDamage.active = false;
    }
    
    // Speed boost power-up
    if (activePowerUps.speedBoost.active && currentTime > activePowerUps.speedBoost.endTime) {
        activePowerUps.speedBoost.active = false;
        playerShip.speed = 5; // Reset player speed
    }
}

// Display active power-ups on screen
function displayActivePowerUps() {
    const padding = 10;
    let yPos = 60; // Starting position below score and wave display
    
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    
    if (activePowerUps.rapidFire.active) {
        ctx.fillStyle = '#00BBFF';
        ctx.fillText("Rapid Fire", padding, yPos);
        yPos += 25;
    }
    
    if (activePowerUps.shield.active) {
        ctx.fillStyle = '#00FF88';
        ctx.fillText(`Shield (${activePowerUps.shield.hits} hits)`, padding, yPos);
        yPos += 25;
    }
    
    if (activePowerUps.doubleDamage.active) {
        ctx.fillStyle = '#FF4040';
        ctx.fillText("Double Damage", padding, yPos);
        yPos += 25;
    }
    
    if (activePowerUps.speedBoost.active) {
        ctx.fillStyle = '#FFDD00';
        ctx.fillText("Speed Boost", padding, yPos);
    }
}

// Draw shield around player if shield power-up is active
function renderPlayerShield() {
    if (activePowerUps.shield.active) {
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const shieldRadius = Math.max(playerShip.width, playerShip.height) * 0.75;
        ctx.arc(playerShip.x + playerShip.width/2, playerShip.y + playerShip.height/2, 
                shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add glow effect
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(playerShip.x + playerShip.width/2, playerShip.y + playerShip.height/2, 
                shieldRadius + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Start game function
function startGame() {
    // Reset game state
    score = 0;
    wave = 1;
    waveTimer = 0;
    enemiesInWave = 5;
    enemiesSpawned = 0;
    bullets = [];
    enemies = [];
    powerUps = [];
    
    // Reset player position
    playerShip = new Ship(canvas.width / 2 - 25, canvas.height - 100);
    
    // Hide screens
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    
    // Initialize audio if not already done
    if (!audioInitialized) {
        initAudio();
    }
    
    // Start background music
    playMusic();
    
    // Set game as active
    gameActive = true;
    
    // Start game loop
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    gameLoop();
}

// Game over function
function gameOver() {
    gameActive = false;
    finalScoreElement.textContent = `Score: ${score}`;
    gameOverScreen.style.display = 'flex';
    
    // Play explosion sound effect on game over
    playSoundEffect(explosionSound);
}

// Manage enemy waves
function manageWaves() {
    // Check if we need to spawn more enemies in current wave
    if (enemiesSpawned < enemiesInWave && Math.random() < 0.03) {
        enemies.push(new Enemy(Math.random() * (canvas.width - 50), -50));
        enemiesSpawned++;
    }
    
    // Check if current wave is complete
    if (enemiesSpawned >= enemiesInWave && enemies.length === 0) {
        // Start next wave
        wave++;
        enemiesInWave = 5 + (wave * 2); // More enemies each wave
        enemiesSpawned = 0;
        
        // Display wave notification
        waveTimer = 120; // Show message for 120 frames (2 seconds at 60fps)
    }
    
    // Display wave notification
    if (waveTimer > 0) {
        ctx.fillStyle = 'yellow';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`WAVE ${wave}`, canvas.width / 2, canvas.height / 2);
        waveTimer--;
    }
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw starfield background
    drawStarfield();
    
    if (gameActive) {
        // Update and render player
        playerShip.update();
        playerShip.render();
        renderPlayerShield();

        // Update and render bullets
        bullets.forEach((bullet, bulletIndex) => {
            bullet.update();
            bullet.render();

            // Remove bullets that go off-screen
            if (bullet.y < 0) {
                bullets.splice(bulletIndex, 1);
                return;
            }

            // Check for collision with enemies
            enemies.forEach((enemy, enemyIndex) => {
                if (
                    bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y
                ) {
                    // Remove bullet and enemy
                    bullets.splice(bulletIndex, 1);
                    enemies.splice(enemyIndex, 1);
                    
                    // Handle enemy destroyed with sound effects
                    handleEnemyDestroyed(enemy);
                    
                    return;
                }
            });
        });

        // Update and render enemies
        enemies.forEach((enemy, index) => {
            enemy.update();
            enemy.render();

            // Check for collision with player
            if (
                playerShip.x < enemy.x + enemy.width &&
                playerShip.x + playerShip.width > enemy.x &&
                playerShip.y < enemy.y + enemy.height &&
                playerShip.y + playerShip.height > enemy.y
            ) {
                if (activePowerUps.shield.active) {
                    activePowerUps.shield.hits--;
                    enemies.splice(index, 1);
                } else {
                    // Game over
                    createExplosion(playerShip.x + playerShip.width/2, playerShip.y + playerShip.height/2);
                    gameOver();
                    enemies.splice(index, 1);
                }
            }

            // Remove enemies that go off-screen
            if (enemy.y > canvas.height) {
                enemies.splice(index, 1);
            }
        });
        
        // Update and render power-ups
        powerUps.forEach((powerUp, index) => {
            powerUp.update();
            powerUp.render();

            // Check for collision with player
            if (
                playerShip.x < powerUp.x + powerUp.width &&
                playerShip.x + playerShip.width > powerUp.x &&
                playerShip.y < powerUp.y + powerUp.height &&
                playerShip.y + playerShip.height > powerUp.y
            ) {
                applyPowerUp(powerUp.type);
                powerUps.splice(index, 1);
            }

            // Remove power-ups that go off-screen
            if (powerUp.y > canvas.height) {
                powerUps.splice(index, 1);
            }
        });

        // Manage enemy waves
        manageWaves();
        updatePowerUps();
    }
    
    // Update and render explosions
    updateExplosions();

    // Display score and wave on the screen
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`Wave: ${wave}`, canvas.width - 20, 30);

    // Display active power-ups
    displayActivePowerUps();

    // Request next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Starfield background
const stars = Array(100).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 3 + 1
}));

function drawStarfield() {
    ctx.fillStyle = 'white';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Move star down to create scrolling effect
        star.y += star.speed;
        
        // Reset star position if it goes off-screen
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

// Explosion effects
const explosions = [];

function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        radius: 5,
        maxRadius: 30,
        growthRate: 1.5,
        particles: Array(8).fill().map(() => ({
            x: x,
            y: y,
            dx: Math.random() * 6 - 3,
            dy: Math.random() * 6 - 3,
            size: Math.random() * 3 + 2,
            color: `hsl(${Math.floor(Math.random() * 60)}, 100%, 50%)` // Orange/yellow colors
        }))
    });
}

function updateExplosions() {
    explosions.forEach((explosion, index) => {
        // Expand explosion radius
        explosion.radius += explosion.growthRate;
        
        // Draw explosion circle
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 165, 0, ${1 - explosion.radius/explosion.maxRadius})`;
        ctx.fill();
        
        // Update and draw particles
        explosion.particles.forEach(particle => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
        });
        
        // Remove explosion when it reaches maximum size
        if (explosion.radius > explosion.maxRadius) {
            explosions.splice(index, 1);
        }
    });
}

// Add event listeners for start and restart buttons
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Add event listener for clear cache button
document.getElementById('clear-cache').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the cache and reload the game?")) {
        clearCacheAndReload();
    }
});
