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
    // Get role
    const role = socket.handshake.query.role as string;
    if (role !== 'player' && role !== 'viewer') {
        debugServer('socket', `[${socket.id}] Invalid role '${role}'`);
        socket.disconnect(true);
        return;
    }

    // Add as viewer
    debugServer(role, `[${socket.id}] Connected`);
    if (role === 'viewer') {
        viewers.push(socket);
    }

    // Handle disconnect
    socket.on('disconnect', () => {
        debugServer(role, `[${socket.id}] Disconnected`);

        // Remove from viewers
        const viewerIndex = viewers.indexOf(socket);
        if (viewerIndex !== -1) {
            viewers.splice(viewerIndex, 1);
        }

        // Notify host
        if (host && host.id !== socket.id) {
            const event = role === 'player' ? 'removePlayer' : 'removeViewer';
            host.emit(event, socket.id);
        }

        // Check if host
        if (host?.id === socket.id) {
            debugServer(role, `[${socket.id}] Lost as host`);
            host = null;

            // Pick new host
            if (viewers.length > 0) {
                host = viewers[0];
                host.emit('setHost');
                debugServer(role, `[${host.id}] Set as new host`);
            }
        }
    });

    // Set up as host
    if (!host && role === 'viewer') {
        host = socket;
        debugServer(role, `[${socket.id}] Set as host`);
        socket.emit('setHost');
    }

    // Notify host
    if (host && host.id !== socket.id) {
        const event = role === 'player' ? 'addPlayer' : 'addViewer';
        host.emit(event, socket.id);
    }
});
