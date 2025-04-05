const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Board constants
const SQUARE_SIZE = 40;
const PIECE_RADIUS = 15;
const BOARD_PADDING = 50;

// Ludo board mapping
const ludoBoard = [
    // ...existing code with the board array...
];

const colorZones = {
    // ...existing code with the colorZones object...
};

const entryPoints = {
    // ...existing code with the entryPoints object...
};

// Convert board position to canvas coordinates
function getBoardCoordinates(position) {
    const row = Math.floor(position / 8);
    const col = position % 8;
    
    return {
        x: BOARD_PADDING + (col * SQUARE_SIZE),
        y: BOARD_PADDING + (row * SQUARE_SIZE)
    };
}

const gameState = {
    currentRoom: null,
    currentTurn: 0,
    myColor: null,
    pieces: {
        red: [0, 1, 2, 3].map(pos => ({ position: pos, isHome: true })),
        blue: [12, 13, 14, 15].map(pos => ({ position: pos, isHome: true })),
        yellow: [8, 9, 10, 11].map(pos => ({ position: pos, isHome: true })),
        green: [4, 5, 6, 7].map(pos => ({ position: pos, isHome: true }))
    },
    message: '', // Add this new property
    messageTimeout: null // Add this new property
};

// Add function to show temporary messages
function showMessage(text, duration = 3000) {
    gameState.message = text;
    clearTimeout(gameState.messageTimeout);
    gameState.messageTimeout = setTimeout(() => {
        gameState.message = '';
        drawBoard();
    }, duration);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw board squares
    for (let i = 0; i < ludoBoard.length; i++) {
        const { x, y } = getBoardCoordinates(i);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x, y, SQUARE_SIZE, SQUARE_SIZE);

        // Color special squares
        if (i < 16) { // Home squares
            const colors = ['red', 'green', 'yellow', 'blue'];
            ctx.fillStyle = colors[Math.floor(i / 4)];
            ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE);
        }
    }

    // Draw pieces
    Object.entries(gameState.pieces).forEach(([color, pieces]) => {
        pieces.forEach(piece => {
            const { x, y } = getBoardCoordinates(piece.position);
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(x + SQUARE_SIZE/2, y + SQUARE_SIZE/2, PIECE_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    });

    // Draw message if exists
    if (gameState.message) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(100, canvas.height/2 - 30, canvas.width - 200, 60);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.message, canvas.width/2, canvas.height/2 + 10);
    }
}

function movePiece(color, pieceIndex, steps) {
    const piece = gameState.pieces[color][pieceIndex];
    
    if (piece.isHome && steps === 6) {
        piece.position = entryPoints[color];
        piece.isHome = false;
    } else if (!piece.isHome) {
        const newPosition = piece.position + steps;
        
        // Check if piece can enter final zone
        if (colorZones[color].final.includes(newPosition)) {
            piece.position = newPosition;
        } else if (newPosition < 52) { // Regular movement on main track
            piece.position = newPosition;
        }
    }
    
    drawBoard();
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    if (gameState.myColor) {
        gameState.pieces[gameState.myColor].forEach((piece, index) => {
            const { x, y } = getBoardCoordinates(piece.position);
            if (Math.hypot(clickX - (x + SQUARE_SIZE/2), clickY - (y + SQUARE_SIZE/2)) < PIECE_RADIUS) {
                socket.emit('move', {
                    roomId: gameState.currentRoom,
                    piece: index,
                    color: gameState.myColor
                });
            }
        });
    }
});

document.getElementById('create-room').addEventListener('click', () => {
    const roomId = Math.random().toString(36).substring(7);
    socket.emit('createRoom', roomId);
    gameState.currentRoom = roomId;
    gameState.myColor = 'red';
    showMessage(`Room created! ID: ${roomId}`);
});

document.getElementById('join-room').addEventListener('click', () => {
    const roomId = document.getElementById('room-id').value;
    socket.emit('joinRoom', roomId);
    gameState.currentRoom = roomId;
});

document.getElementById('roll-dice').addEventListener('click', () => {
    const steps = Math.floor(Math.random() * 6) + 1;
    showMessage(`You rolled a ${steps}`);
    // Implement piece movement logic here
});

socket.on('gameStart', (roomData) => {
    const player = roomData.players.find(p => p.id === socket.id);
    gameState.myColor = player.color;
    showMessage('Game started!');
});

socket.on('pieceMove', (data) => {
    const { piece, steps, color } = data;
    movePiece(color, piece, steps);
});

socket.on('nextTurn', (turnIndex) => {
    gameState.currentTurn = turnIndex;
    // Update UI to show whose turn it is
});

// Initial board render
drawBoard();
