const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup', (e) => { keys[e.key] = false; });

class Ship {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.speed = 5;
    }
    
    update() {
        if(keys['ArrowLeft'] && this.x > 0) this.x -= this.speed;
        if(keys['ArrowRight'] && this.x < canvas.width - this.width) this.x += this.speed;
        if(keys['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if(keys['ArrowDown'] && this.y < canvas.height - this.height) this.y += this.speed;
    }
    
    render() {
        // Simple triangle to represent the ship
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }
}

let playerShip = new Ship(canvas.width / 2 - 20, canvas.height - 80);

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    playerShip.update();
    playerShip.render();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

gameLoop();