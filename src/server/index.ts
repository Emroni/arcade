import dotenvFlow from 'dotenv-flow';
import { Server } from 'socket.io';

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
    io.emit('totalPlayers', io.engine.clientsCount);

    socket.on('disconnect', () => {
        io.emit('totalPlayers', io.engine.clientsCount);
    });
});
