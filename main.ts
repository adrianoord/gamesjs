import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Game } from './game';
import path from 'path';
import { KartService } from './games/kart/socket';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Fix path traversal vulnerability by using path.join
app.get('/kart', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'kart.html'));
});

app.get('/pingpong', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'pingpong.html'));
});

// Create a games services
const games = {
    kart: new KartService(),
};

// Create a namespace for the kart game
const kartNamespace = io.of('/kart');
kartNamespace.on('connection', (socket) => {
    games.kart.registerKartSocket(socket);
});

server.listen(3333, () => {
    console.log('Server is running on http://localhost:3333');
});
