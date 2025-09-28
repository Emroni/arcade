import { debugServer } from '@/debug';
import dotenvFlow from 'dotenv-flow';
import { Server } from 'socket.io';
import { createRoom, joinRoom, leaveRoom, removeRoom, rooms } from './rooms';

dotenvFlow.config();

// Create server
const io = new Server(process.env.SERVER_PORT, {
    cors: {
        origin: process.env.SERVER_CORS_ORIGINS.split(','),
    },
});
console.log(`Server ready on port ${process.env.SERVER_PORT}`);

// Handle connections
io.on('connection', socket => {
    // Connection
    debugServer('player', `${socket.id} connected`);
    io.emit('updatedPlayers', io.engine.clientsCount);
    io.emit('updatedRooms', rooms);

    socket.on('disconnect', () => {
        debugServer('player', `${socket.id} connected`);
        io.emit('updatedPlayers', io.engine.clientsCount);
    });

    // Room management
    socket.on('createRoom', () => {
        const room = createRoom();
        joinRoom(socket, room.id);
        io.emit('updatedRooms', rooms);
    });

    socket.on('joinRoom', (roomId: string) => {
        joinRoom(socket, roomId);
        io.emit('updatedRooms', rooms);
    });

    socket.on('leaveRoom', (roomId: string) => {
        leaveRoom(socket, roomId);
        io.emit('updatedRooms', rooms);
    });
});

// Remove empty rooms when last player leaves
io.of('/').adapter.on('leave-room', roomId => {
    const room = rooms.find(r => r.id === roomId);
    if (room && room.playerCount <= 0) {
        removeRoom(roomId);
        io.emit('updatedRooms', rooms);
    }
});
