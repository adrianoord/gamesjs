import { Server, Socket } from "socket.io";
import { GameKart } from "./kart.rules";
import { isValidRoomId, isValidColor } from "../../shared/utils"; // Import the rate limit function
import { IPlayer } from "../../models";

export class KartService {
    path_socket: string;
    rooms: GameKart[];
    rateLimits: { [socketId: string]: { [event: string]: number[] } }; // Rate limit tracking

    constructor() {
        this.rooms = [];
        this.rateLimits = {}; // Initialize rate limits
    }

    registerKartSocket(socket: Socket) {
        const io = socket.nsp; // Get the namespace from the socket

        io.emit('rooms', this.rooms.map(room => room.roomId)); // Emit the list of rooms to the client

        socket.on('createRoom', (roomId, initLife) => {
            // Validate room ID
            if (!isValidRoomId(roomId)) {
                socket.emit('error', 'Invalid room ID. Use 3-20 alphanumeric characters, hyphens, or underscores.');
                return;
            }

            // Validate initial life (if provided)
            if (initLife !== undefined) {
                const parsedLife = parseInt(String(initLife));
                if (isNaN(parsedLife) || parsedLife <= 0 || parsedLife > 10) {
                    socket.emit('error', 'Initial life must be a number between 1 and 10.');
                    return;
                }
            }

            // Check if room already exists
            const roomExists = this.rooms.some(room => room.roomId === roomId);
            if (roomExists) {
                socket.emit('roomExists', roomId); // Notify the client that the room already exists
                return;
            }
            const room: GameKart = new GameKart(roomId);

            // Set initial life if provided
            if (initLife !== undefined) {
                room.players_init_life = parseInt(String(initLife));
            }

            this.rooms.push(room);
            socket.join(roomId);
            socket.emit('roomCreated', roomId);
            io.emit('rooms', this.rooms.map(room => room.roomId)); // Emit the list of rooms to the client
        });

        socket.on('joinRoom', (roomId, color) => {
            // Validate room ID
            if (!isValidRoomId(roomId)) {
                socket.emit('error', 'Invalid room ID format.');
                return;
            }

            // Validate color
            if (!isValidColor(color)) {
                socket.emit('error', 'Invalid color selection.');
                return;
            }

            const room = this.rooms.find(room => room.roomId === roomId);
            if (room) {
                // Check if the room is full
                const roomFull = room.players.length >= 4;
                if (roomFull) {
                    socket.emit('roomFull', roomId); // Notify the client that the room is full
                    return;
                }
                // Check if the color is already taken
                const colorTaken = room.players.some(player => player.color === color);
                if (colorTaken) {
                    socket.emit('colorTaken', color); // Notify the client that the color is taken
                    return;
                }
                // Check if the player is already in the room
                const playerExists = room.players.some(player => player.socketId === socket.id);
                if (playerExists) {
                    socket.emit('playerExists', socket.id); // Notify the client that the player already exists
                    return;
                }

                const player: IPlayer = {
                    socketId: socket.id,
                    life: room.players_init_life,
                    invulnerable: false,
                    in_cooldown: false,
                    x: Math.floor(Math.random() * (room.canvas.width - 1)),
                    y: 5,
                    w: 1,
                    h: 1,
                    color: color
                };
                while (room.checkCollisionWithBounds(player)) {
                    player.x = Math.floor(Math.random() * (room.canvas.width - 1));
                }
                room.players.push(player);
                socket.join(roomId);
                socket.emit('roomJoined', room, player);
            } else {
                socket.emit('roomNotFound', roomId); // Notify the client that the room was not found
            }
        });

        socket.on('getGameState', () => {
            const room = this.rooms.find(room => room.players.some(player => player.socketId === socket.id));
            if (room) {
                socket.compress(true).emit('gameState', {
                    players: room.players,
                    traffic: room.traffic,
                    gameStarted: room.gameStarted
                }); // Send the game state to the client
            } else {
                socket.emit('roomNotFound'); // Notify the client that the room was not found
            }
        });

        socket.on('action', (action) => {
            const room = this.rooms.find(room => room.players.some(player => player.socketId === socket.id));
            const socketPlayer = room?.players.find(player => player.socketId === socket.id);

            if (!socketPlayer) {
                socket.emit('playerNotFound'); // Notify the client that the player was not found
                return;
            }
            if (!room) {
                socket.emit('roomNotFound'); // Notify the client that the room was not found
                return;
            }

            if (socketPlayer.in_cooldown) {
                return;
            }

            let actionHasEffect = false;
            switch (action) {
                case 'push_up':
                    room.traffic.forEach(traffic => {
                        if (traffic.x == socketPlayer.x && traffic.y < socketPlayer.y && Math.abs(traffic.y - socketPlayer.y) == 1) {
                            traffic.y -= 1;
                            actionHasEffect = true;
                        }
                    });
                    room.players.forEach(player => {
                        if (
                            player.x == socketPlayer.x &&
                            player.y < socketPlayer.y &&
                            Math.abs(player.y - socketPlayer.y) == 1 &&
                            player.socketId !== socket.id
                        ) {
                            player.y -= 1;
                            actionHasEffect = true;
                        }
                    });
                    break;
                case 'push_down':
                    room.traffic.forEach(traffic => {
                        if (
                            traffic.x == socketPlayer.x &&
                            traffic.y > socketPlayer.y &&
                            Math.abs(traffic.y - socketPlayer.y) == 1
                        ) {
                            traffic.y += 1;
                            actionHasEffect = true;
                        }
                    });
                    room.players.forEach(player => {
                        if (player.x == socketPlayer.x && player.y > socketPlayer.y && Math.abs(player.y - socketPlayer.y) == 1 && player.socketId !== socket.id) {
                            player.y += 1;
                            actionHasEffect = true;
                        }
                    });
                    break;
                case 'push_left':
                    room.traffic.forEach(traffic => {
                        if (traffic.y == socketPlayer.y && traffic.x < socketPlayer.x && Math.abs(traffic.x - socketPlayer.x) == 1) {
                            traffic.x -= 1;
                            actionHasEffect = true;
                        }
                    });
                    room.players.forEach(player => {
                        if (player.y == socketPlayer.y && player.x < socketPlayer.x && Math.abs(player.x - socketPlayer.x) == 1 && player.socketId !== socket.id) {
                            player.x -= 1;
                            actionHasEffect = true;
                        }
                    });
                    break;
                case 'push_right':
                    room.traffic.forEach(traffic => {
                        if (traffic.y == socketPlayer.y && traffic.x > socketPlayer.x && Math.abs(traffic.x - socketPlayer.x) == 1) {
                            traffic.x += 1;
                            actionHasEffect = true;
                        }
                    });
                    room.players.forEach(player => {
                        if (player.y == socketPlayer.y && player.x > socketPlayer.x && Math.abs(player.x - socketPlayer.x) == 1 && player.socketId !== socket.id) {
                            player.x += 1;
                            actionHasEffect = true;
                        }
                    });
                    break;
            }

            if (actionHasEffect) {
                socketPlayer.in_cooldown = true;
                setTimeout(() => {
                    socketPlayer.in_cooldown = false;
                }, 5000); // Cooldown time of 5 seconds

                // Verifica se os player obdecem aos limites do canvas
                room.players.forEach(player => {
                    if (player.x > room.canvas.width) {
                        player.x = room.canvas.width;
                    }
                    if (player.x < 0) {
                        player.x = 0;
                    }
                    if (player.y > room.canvas.height) {
                        player.y = room.canvas.height;
                    }
                    if (player.y < 0) {
                        player.y = 0;
                    }
                });
            }
        });

        socket.on('move', (key) => {
            // Validate key
            const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (!validKeys.includes(key)) {
                return;
            }

            const room = this.rooms.find(room => room.players.some(player => player.socketId === socket.id));
            if (room) {
                const player = room.players.find(player => player.socketId === socket.id);
                if (player) {
                    room.movePlayer(key, player); // Move the player
                }
            }
        });

        // Handle disconnect event
        socket.on('disconnect', () => {
            // Clean up rate limit data for this socket
            delete this.rateLimits[socket.id];

            // Find the room that the player is in
            const roomIndex = this.rooms.findIndex(room => room.players.some(player => player.socketId === socket.id));
            if (roomIndex !== -1) {
                const room = this.rooms[roomIndex];
                // Remove the player from the room
                const playerIndex = room.players.findIndex(player => player.socketId === socket.id);
                if (playerIndex !== -1) {
                    room.players.splice(playerIndex, 1);
                    // If there are no more players, remove the room
                    if (room.players.length === 0) {
                        this.rooms.splice(roomIndex, 1);
                        io.emit('rooms', this.rooms.map(room => room.roomId)); // Update room list for all clients
                    }
                }
            }
        });

        socket.on('restartGame', () => {
            const room = this.rooms.find(room => room.players.some(player => player.socketId === socket.id));
            if (room) {
                // Reset player lives and positions
                room.players.forEach(player => {
                    player.life = room.players_init_life;
                    player.invulnerable = false;
                    player.x = Math.floor(Math.random() * (room.canvas.width - 1));
                    player.y = 5;
                    while (room.checkCollisionWithBounds(player)) {
                        player.x = Math.floor(Math.random() * (room.canvas.width - 1));
                    }
                });
                // Clear traffic
                room.traffic = [];
                // Reset game speed
                room.speed = 2;
                io.to(room.roomId).emit('gameRestarted');
            }
        });

        socket.on('startGame', () => {
            const room = this.rooms.find(room => room.players.some(player => player.socketId === socket.id));
            if (room) {
                io.to(room.roomId).emit('gameStarted');
            }
        });

        socket.on('changeGameState', (data: { gameStarted: boolean }) => {
            // Validate data
            if (typeof data !== 'object' || data === null || typeof data.gameStarted !== 'boolean') {
                socket.emit('error', 'Invalid game state data');
                return;
            }

            const room = this.rooms.find(room => room.players.some(player => player.socketId === socket.id));
            if (room) {
                room.gameStarted = data.gameStarted;
                io.to(room.roomId).emit('gameStateChanged', data); // Notify all players in the room
            }
        });

        socket.on('leaveRoom', () => {
            const roomIndex = this.rooms.findIndex(room => room.players.some(player => player.socketId === socket.id));
            if (roomIndex !== -1) {
                const room = this.rooms[roomIndex];
                // Remove the player from the room
                const playerIndex = room.players.findIndex(player => player.socketId === socket.id);
                if (playerIndex !== -1) {
                    socket.leave(room.roomId); // Leave the room
                    room.players.splice(playerIndex, 1);
                    // If there are no more players, remove the room
                    if (room.players.length === 0) {
                        this.rooms.splice(roomIndex, 1);
                        io.emit('rooms', this.rooms.map(room => room.roomId)); // Update room list for all clients
                    }
                }
            }
        });
    }
}