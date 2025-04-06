import { IPlayer, ITraffic } from "../../models"

export class GameKart {
    canvas = {
        width: 15,
        height: 10
    }

    players: IPlayer[] = [] // array of players
    traffic: ITraffic[] = [] // array of traffic objects {x, y, w, h}
    players_init_life = 3 // initial life of the players
    speed = 2 // speed of the game, in pixels per frame
    speed_timer = 1 // timer for speed increase seconds incrise 0.1 every 1 second
    speed_increase = 0.1 // increase speed every second
    speed_increase_timer = this.getTime() // timer for speed increase
    traffic_density = 0.8 // 10% chance to spawn traffic each frame
    last_move = this.getTime() // last time the game was updated
    roomId = '' // id of the room
    gameStarted = false // indicates if the game has started
    maxPlayers = 6 // maximum number of players per room
    
    constructor(roomId: string) {
        // Validate room ID format
        if (!this.isValidRoomId(roomId)) {
            throw new Error('Invalid room ID format');
        }
        
        this.roomId = roomId;
        setInterval(() => this.gameloop(), 1000 / 60); // 60 FPS
    }

    // Validate room ID to prevent injection attacks
    private isValidRoomId(roomId: string): boolean {
        return typeof roomId === 'string' && 
               roomId.length >= 3 && 
               roomId.length <= 20 && 
               /^[a-zA-Z0-9-_]+$/.test(roomId);
    }

    gameloop() {
        if (!this.gameStarted) return; // do not run the game loop if the game has not started
        
        // Move traffic down
        if ((this.getTime() - this.speed_increase_timer) > (1000 * this.speed_timer)) {
            this.speed += this.speed_increase;
            this.speed_increase_timer = this.getTime();
        }
        if ((this.getTime() - this.last_move) > (1000 / this.speed)) {
            this.last_move = this.getTime();

            // Using arrow function to preserve 'this' context
            const moveDown = (game: GameKart) => {
                for (const traffic of game.traffic) {
                    traffic.y += 1;
                    if (traffic.y > game.canvas.height) {
                        const index = game.traffic.findIndex(it => it.id == traffic.id);
                        // Safely remove traffic if it exists
                        if (index !== -1) {
                            game.traffic.splice(index, 1);
                            return moveDown(game);
                        }
                    }
                }
            };

            moveDown(this);

            // Draw the traffic randomly
            if (Math.random() < this.traffic_density) {
                // Generate a unique ID for traffic using crypto if available for added security
                let trafficId: number;
                if (typeof window !== 'undefined' && window.crypto) {
                    const array = new Uint32Array(1);
                    window.crypto.getRandomValues(array);
                    trafficId = array[0];
                } else {
                    trafficId = Math.floor(Math.random() * 1000000);
                }
                
                const traffic = {
                    id: trafficId,
                    x: Math.floor(Math.random() * (this.canvas.width)),
                    y: 0,
                    w: 1,
                    h: 1
                };
                
                // Try up to 5 times to place traffic without collision
                let attempts = 0;
                while (this.checkCollisionBetweenTraffic(traffic) && attempts < 5) {
                    traffic.x = Math.floor(Math.random() * (this.canvas.width));
                    attempts++;
                }
                
                // Only add if we found a non-colliding position or reached max attempts
                if (attempts < 5 || !this.checkCollisionBetweenTraffic(traffic)) {
                    this.traffic.push(traffic);
                }
            }

            this.players.forEach(player => {
                if (this.checkCollisionBetweenTraffic(player) && !player.invulnerable && player.life > 0) {
                    player.life = Math.max(0, player.life - 1); // Prevent negative life
                    player.invulnerable = true;
                    console.log('Collision with traffic detected!', player.life);
                    setTimeout(() => {
                        // Check if player still exists before updating
                        const playerIndex = this.players.findIndex(p => p.socketId === player.socketId);
                        if (playerIndex !== -1) {
                            player.invulnerable = false;
                        }
                    }, 3000);
                }
            });
        }
    }

    getTime() {
        //milliseconds
        return Date.now();
    }

    // check for collisions between players
    checkCollisionBetweenPlayers(player: IPlayer) {
        // Validate player input
        if (!this.isValidPlayer(player)) {
            return false;
        }
        
        for (const otherPlayer of this.players) {
            if (player !== otherPlayer && otherPlayer.life > 0) {
                if (this.checkCollision(player, otherPlayer)) {
                    // Collision detected
                    return true;
                }
            }
        }
        return false;
    }

    // check for collisions between traffic
    checkCollisionBetweenTraffic(player: IPlayer | ITraffic) {
        // Validate player/traffic object
        if (!this.isValidEntity(player)) {
            return false;
        }
        
        for (const otherPlayer of this.traffic) {
            if (this.checkCollision(player, otherPlayer)) {
                // Collision detected
                return true;
            }
        }
        return false;
    }
    
    // Generic collision detection between two entities
    private checkCollision(entity1: IPlayer | ITraffic, entity2: IPlayer | ITraffic): boolean {
        return entity1.x < entity2.x + entity2.w &&
               entity1.x + entity1.w > entity2.x &&
               entity1.y < entity2.y + entity2.h &&
               entity1.y + entity1.h > entity2.y;
    }

    // check for collision with the canvas bounds
    checkCollisionWithBounds(player: IPlayer | ITraffic) {
        // Validate player input
        if (!this.isValidEntity(player)) {
            return false;
        }
        
        if (player.x < 0 || player.x + player.w > this.canvas.width ||
            player.y < 0 || player.y + player.h > this.canvas.height) {
            // Collision detected
            return true;
        }
        return false;
    }
    
    // Validate player object to prevent injection attacks
    private isValidPlayer(player: any): player is IPlayer {
        return player && 
               typeof player === 'object' &&
               typeof player.socketId === 'string' &&
               typeof player.life === 'number' &&
               typeof player.x === 'number' &&
               typeof player.y === 'number' &&
               typeof player.w === 'number' &&
               typeof player.h === 'number' &&
               typeof player.color === 'string' &&
               typeof player.invulnerable === 'boolean';
    }
    
    // Validate player or traffic entity
    private isValidEntity(entity: any): entity is (IPlayer | ITraffic) {
        return entity && 
               typeof entity === 'object' &&
               typeof entity.x === 'number' &&
               typeof entity.y === 'number' &&
               typeof entity.w === 'number' &&
               typeof entity.h === 'number';
    }

    movePlayer(
        direction: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
        player: IPlayer
    ) {
        // Validate inputs
        if (!this.isValidPlayer(player) || !this.gameStarted || player.life <= 0) {
            return;
        }
        
        // Validate direction
        const validDirections = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        if (!validDirections.includes(direction)) {
            return;
        }
    
        const step = 1;
        const originalX = player.x;
        const originalY = player.y;
        
        switch (direction) {
            case 'ArrowUp':
                player.y -= step;
                break;
            case 'ArrowDown':
                player.y += step;
                break;
            case 'ArrowLeft':
                player.x -= step;
                break;
            case 'ArrowRight':
                player.x += step;
                break;
        }

        if (this.checkCollisionWithBounds(player) || this.checkCollisionBetweenPlayers(player)) {
            // Reset position if collision detected
            player.x = originalX;
            player.y = originalY;
        }

        if (this.checkCollisionBetweenTraffic(player) && !player.invulnerable && player.life > 0) {
            player.life = Math.max(0, player.life - 1); // Prevent negative life
            player.invulnerable = true;
            setTimeout(() => {
                // Check if player still exists in the game
                const playerIndex = this.players.findIndex(p => p.socketId === player.socketId);
                if (playerIndex !== -1) {
                    player.invulnerable = false;
                }
            }, 3000);
        }
    }
    
    // Add player to the game with validation
    addPlayer(player: IPlayer): boolean {
        // Validate player object
        if (!this.isValidPlayer(player)) {
            return false;
        }
        
        // Check if room is full
        if (this.players.length >= this.maxPlayers) {
            return false;
        }
        
        // Check if player already exists
        if (this.players.some(p => p.socketId === player.socketId)) {
            return false;
        }
        
        // Validate color
        const validColors = ['red', 'blue', 'green', 'yellow'];
        if (!validColors.includes(player.color)) {
            return false;
        }
        
        // Check if color is taken
        if (this.players.some(p => p.color === player.color)) {
            return false;
        }
        
        this.players.push(player);
        return true;
    }
    
    // Remove player from game
    removePlayer(socketId: string): boolean {
        const index = this.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            this.players.splice(index, 1);
            return true;
        }
        return false;
    }
    
    // Restart game with validation
    restartGame(): void {
        this.traffic = [];
        this.speed = 2;
        this.speed_increase_timer = this.getTime();
        this.last_move = this.getTime();
        
        // Reset player positions safely
        this.players.forEach(player => {
            player.life = this.players_init_life;
            player.invulnerable = false;
            player.x = Math.floor(Math.random() * (this.canvas.width - 1));
            player.y = 5;
            
            // Ensure player is within bounds
            if (player.x < 0) player.x = 0;
            if (player.x + player.w > this.canvas.width) player.x = this.canvas.width - player.w;
            if (player.y < 0) player.y = 0;
            if (player.y + player.h > this.canvas.height) player.y = this.canvas.height - player.h;
        });
    }
}