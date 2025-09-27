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

io.on('connection', socket => {
    console.log(`[${socket.id}] connected`);

    socket.on('disconnect', () => {
        console.log(`[${socket.id}] disconnected`);
    });
});
