import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Game } from './game';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/public/kart.html');
});

const rooms: Game[] = [];

io.on('connection', (socket) => {
    socket.emit('rooms', rooms.map(room => room.roomId)); // Send the list of rooms to the client
    socket.on('createRoom', (roomId) => {
        // Check if room already exists
        const roomExists = rooms.some(room => room.roomId === roomId);
        if (roomExists) {
            socket.emit('roomExists', roomId); // Notify the client that the room already exists
            return;
        }
        const room: Game = new Game(roomId);
        rooms.push(room);
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('joinRoom', (roomId, color) => {
        const room = rooms.find(room => room.roomId === roomId);
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

            const player = {
                socketId: socket.id,
                life: room.players_init_life,
                invulnerable: false,
                blink: false,
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
            socket.emit('roomJoined', roomId, player);
        } else {
            socket.emit('roomNotFound', roomId); // Notify the client that the room was not found
        }
    });

    socket.on('getGameState', () => {
        const room = rooms.find(room => room.players.some(player => player.socketId === socket.id));
        if (room) {
            socket.emit('gameState', {
                players: room.players,
                traffic: room.traffic,
                gameStarted: room.gameStarted
            }); // Send the game state to the client
        } else {
            socket.emit('roomNotFound'); // Notify the client that the room was not found
        }
    });

    socket.on('move', (key) => {
        const room = rooms.find(room => room.players.some(player => player.socketId === socket.id));
        if (room) {
            const player = room.players.find(player => player.socketId === socket.id);
            if (player) {
                room.movePlayer(key, player); // Move the player
            }
        }
    });

    socket.on('disconnect', () => {
        // Find the room that the player is in
        const roomIndex = rooms.findIndex(room => room.players.some(player => player.socketId === socket.id));
        if (roomIndex !== -1) {
            const room = rooms[roomIndex];
            // Remove the player from the room
            const playerIndex = room.players.findIndex(player => player.socketId === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                // If there are no more players, remove the room
                if (room.players.length === 0) {
                    rooms.splice(roomIndex, 1);
                    io.emit('rooms', rooms.map(room => room.roomId)); // Update room list for all clients
                }
            }
        }
    });

    socket.on('restartGame', () => {
        const room = rooms.find(room => room.players.some(player => player.socketId === socket.id));
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
        const room = rooms.find(room => room.players.some(player => player.socketId === socket.id));
        if (room) {
            io.to(room.roomId).emit('gameStarted');
        }
    });

    socket.on('changeGameState', (data: {gameStarted:boolean}) => {
        const room = rooms.find(room => room.players.some(player => player.socketId === socket.id));
        if (room) {
            room.gameStarted = data.gameStarted;
            io.to(room.roomId).emit('gameStateChanged', data); // Notify all players in the room
        }
    });

    socket.on('leaveRoom', () => {
        const roomIndex = rooms.findIndex(room => room.players.some(player => player.socketId === socket.id));
        if (roomIndex !== -1) {
            const room = rooms[roomIndex];
            // Remove the player from the room
            const playerIndex = room.players.findIndex(player => player.socketId === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                // If there are no more players, remove the room
                if (room.players.length === 0) {
                    rooms.splice(roomIndex, 1);
                    io.emit('rooms', rooms.map(room => room.roomId)); // Update room list for all clients
                }
            }
        }
    });
})

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
