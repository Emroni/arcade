import dotenvFlow from 'dotenv-flow';
import { Server, Socket } from 'socket.io';
import { debugServer } from './debug';

// Configuration
dotenvFlow.config();

// Properties
let host: Socket | null;
const viewers: Socket[] = [];

// Create server
const io = new Server(process.env.SERVER_PORT, {
    cors: {
        origin: '*',
    },
});
console.log(`Server ready on port ${process.env.SERVER_PORT}`);

// Handle connections
io.on('connection', socket => {
    const role = socket.handshake.query.role as string;
    if (role !== 'player' && role !== 'viewer') {
        debugServer('unknown', `[${socket.id}] Invalid role: ${role}`);
        socket.disconnect(true);
        return;
    }

    // Add as viewer
    debugServer(role, `[${socket.id}] connected`);
    if (role === 'viewer') {
        viewers.push(socket);
    }

    // Handle disconnect
    socket.on('disconnect', () => {
        debugServer(role, `[${socket.id}] disconnected`);

        // Remove from viewers
        const viewerIndex = viewers.indexOf(socket);
        if (viewerIndex !== -1) {
            viewers.splice(viewerIndex, 1);
        }

        // Check if host
        if (host?.id === socket.id) {
            debugServer(role, `[${socket.id}] lost as host`);
            host = null;

            // Pick new host
            if (viewers.length > 0) {
                host = viewers[0];
                host.emit('setHost');
                debugServer(role, `[${host.id}] set as new host`);
            }
        }
    });

    // Set up as host
    if (!host && role === 'viewer') {
        host = socket;
        debugServer(role, `[${socket.id}] set as host`);
        socket.emit('setHost');
    }
});
