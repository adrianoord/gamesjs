import { IPlayer, ITraffic } from "./models"

export class Game {
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
    traffic_density = 0.5 // 10% chance to spawn traffic each frame
    last_move = this.getTime() // last time the game was updated
    roomId = '' // id of the room
    gameStarted = false // indicates if the game has started
    
    constructor(roomId: string) {
        this.roomId = roomId;
        setInterval(() => this.gameloop(), 1000 / 60); // 30 FPS
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
            const moveDown = (game: Game) => {
                for (const traffic of game.traffic) {
                    traffic.y += 1;
                    if (traffic.y > game.canvas.height) {
                        game.traffic.splice(game.traffic.findIndex(it => it.id == traffic.id), 1);
                        return moveDown(game);
                    }
                }
            };

            moveDown(this);

            // Draw the traffic randomly
            if (Math.random() < this.traffic_density) {
                const traffic = {
                    id: Math.floor(Math.random() * 1000000),
                    x: Math.floor(Math.random() * (this.canvas.width - 1)),
                    y: 0,
                    w: 1,
                    h: 1
                };
                while (this.checkCollisionBetweenTraffic(traffic)) {
                    traffic.x = Math.floor(Math.random() * (this.canvas.width - 1));
                }
                this.traffic.push(traffic);
            }

            this.players.forEach(player => {
                if (this.checkCollisionBetweenTraffic(player) && !player.invulnerable && player.life > 0) {
                    player.life -= 1;
                    player.invulnerable = true;
                    console.log('Collision with traffic detected!', player.life);
                    setTimeout(() => {
                        player.invulnerable = false;
                    }, 3000);
                }
            });
        }
    }

    getTime() {
        //milliseconds
        return (new Date()).getTime();
    }

    // check for collisions between players
    checkCollisionBetweenPlayers(player: IPlayer) {
        for (const otherPlayer of this.players) {
            if (player !== otherPlayer && otherPlayer.life > 0) {
                if (player.x < otherPlayer.x + otherPlayer.w &&
                    player.x + player.w > otherPlayer.x &&
                    player.y < otherPlayer.y + otherPlayer.h &&
                    player.y + player.h > otherPlayer.y) {
                    // Collision detected
                    return true;
                }
            }
        }
        return false;
    }

    // check for collisions between traffic
    checkCollisionBetweenTraffic(player: IPlayer | ITraffic) {
        for (const otherPlayer of this.traffic) {
            if (player.x < otherPlayer.x + otherPlayer.w &&
                player.x + player.w > otherPlayer.x &&
                player.y < otherPlayer.y + otherPlayer.h &&
                player.y + player.h > otherPlayer.y) {
                // Collision detected
                return true;
            }
        }
        return false;
    }

    // check for collision with the canvas bounds
    checkCollisionWithBounds(player: IPlayer) {
        if (player.x < 0 || player.x + player.w > this.canvas.width ||
            player.y < 0 || player.y + player.h > this.canvas.height) {
            // Collision detected
            return true;
        }
        return false;
    }

    movePlayer(
        direction: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
        player: IPlayer
    ) {
        const step = 1;
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
            switch (direction) {
                case 'ArrowUp':
                    player.y += step;
                    break;
                case 'ArrowDown':
                    player.y -= step;
                    break;
                case 'ArrowLeft':
                    player.x += step;
                    break;
                case 'ArrowRight':
                    player.x -= step;
                    break;
            }
        }

        if (this.checkCollisionBetweenTraffic(player) && !player.invulnerable && player.life > 0) {
            player.life -= 1;
            player.invulnerable = true;
            setTimeout(() => {
                player.invulnerable = false;
            }, 3000);
        }
    }
}