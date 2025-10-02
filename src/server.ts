import dotenvFlow from 'dotenv-flow';
import { Server } from 'socket.io';
import { debugServer } from './debug';
import { Player } from './types';
import { ViewerSyncPayload } from './types/viewer';

// Configuration
dotenvFlow.config();

// Properties
const players: Map<string, Player> = new Map();

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

    // Join role room
    debugServer(role, `[${socket.id}] Connected`);
    socket.join(role);
    syncViewers();

    // Handle role
    if (role === 'player') {
        socket.on('player.add', player => {
            players.set(socket.id, player);
            syncViewers();
        });
    } else if (role === 'viewer') {
        pickHost();
    }

    // Handle disconnect
    socket.on('disconnect', () => {
        debugServer(role, `[${socket.id}] Disconnected`);

        // Handle role
        if (role === 'player') {
            players.delete(socket.id);
        } else if (role === 'viewer') {
            pickHost();
        }

        // Sync viewers
        syncViewers();
    });
});

function pickHost() {
    // Check current host
    const hostRoom = io.sockets.adapter.rooms.get('host');
    if (hostRoom?.size) {
        return;
    }

    // Pick new host from viewers
    const viewerRoom = io.sockets.adapter.rooms.get('viewer');
    const viewerIds = viewerRoom ? Array.from(viewerRoom) : [];
    const newHostId = viewerIds?.[0];
    const newHostSocket = io.sockets.sockets.get(newHostId);
    if (newHostSocket) {
        newHostSocket.join('host');
        newHostSocket.emit('host.set');
        debugServer('viewer', `[${newHostId}] Set as new host`);
    }
}

function syncViewers() {
    const payload: ViewerSyncPayload = {
        players: Array.from(players.values()),
        viewers: io.sockets.adapter.rooms.get('viewer')?.size || 0,
    };
    io.to('viewer').emit('viewer.sync', payload);
}
