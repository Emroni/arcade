import { debugServer } from '@/debug';
import dotenvFlow from 'dotenv-flow';
import { Server } from 'socket.io';
import { createRoom, joinRoom, leaveRoom, rooms } from './rooms';

dotenvFlow.config();

// Create server
const io = new Server(process.env.NEXT_PUBLIC_SERVER_PORT, {
    cors: {
        origin: process.env.NEXT_PUBLIC_SERVER_CORS_ORIGINS.split(','),
    },
});
console.log(`Server ready on port ${process.env.NEXT_PUBLIC_SERVER_PORT}`);

// Handle connections
io.on('connection', socket => {
    debugServer('player', `${socket.id} connected`);
    io.emit('updatedPlayers', io.engine.clientsCount);
    io.emit('updatedRooms', rooms);

    socket.on('disconnect', () => {
        debugServer('player', `${socket.id} connected`);
        io.emit('updatedPlayers', io.engine.clientsCount);
    });

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
