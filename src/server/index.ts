import { debugServer } from '@/debug';
import { Player } from '@/types';
import dotenvFlow from 'dotenv-flow';
import { Server } from 'socket.io';

dotenvFlow.config();
const players: Player[] = [];

// Create server
const io = new Server(process.env.SERVER_PORT, {
    cors: {
        origin: '*',
    },
});
console.log(`Server ready on port ${process.env.SERVER_PORT}`);

// Handle connections
io.on('connection', socket => {
    debugServer('player', `${socket.id} connected`);
    socket.emit('initPlayers', players);

    // Create player
    const player: Player = {
        id: socket.id,
        x: 0,
        y: 0,
    };
    players.push(player);
    io.emit('addPlayer', player);

    // Connection
    socket.on('disconnect', () => {
        debugServer('player', `${socket.id} disconnected`);
        io.emit('removePlayer', socket.id);
        const index = players.findIndex(p => p.id === socket.id);
        if (index !== -1) {
            players.splice(index, 1);
        }
    });

    // Movement
    socket.on('move', (data: any) => {
        player.x = data.x;
        player.y = data.y;
        io.emit('updatePlayer', player);
    });
});
