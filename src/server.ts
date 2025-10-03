import dotenvFlow from 'dotenv-flow';
import { Server, Socket } from 'socket.io';
import { debugServer } from './debug';
import { GameTick } from './game/types';
import { Player, PlayerData } from './types';
import { ViewerSyncPayload } from './types/viewer';

// Configuration
dotenvFlow.config();

// Properties
let gameTick: GameTick | null = null;
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
    pickHost();
    syncViewers();

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

    // Players
    if (role === 'player') {
        socket.on('player.add', player => addPlayer(socket, player));
        socket.on('player.config', data => configPlayer(socket, data));
        socket.on('player.control', data => controlPlayer(socket, data));
    }

    // Viewers
    if (role === 'viewer') {
        socket.on('host.game.tick', updateGameTick);
    }
});

// Host
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
        newHostSocket.emit('host.set', gameTick);
        debugServer('viewer', `[${newHostId}] Set as new host`);
    }
}

function updateGameTick(data: GameTick) {
    gameTick = data;
    io.to('viewer').except('host').emit('viewer.game.tick', data);
}

// Players
function addPlayer(socket: Socket, player: Player) {
    players.set(socket.id, player);
    syncViewers();
}

function configPlayer(socket: Socket, data: PlayerData) {
    updatePlayer(socket, data);
    syncViewers();
}

function controlPlayer(socket: Socket, data: PlayerData) {
    updatePlayer(socket, data);
    io.to('host').emit('player.control', {
        id: socket.id,
        ...data,
    });
}

function updatePlayer(socket: Socket, data: PlayerData) {
    // Get player
    const player = players.get(socket.id);
    if (!player) {
        return;
    }

    // Update player
    players.set(socket.id, {
        ...player,
        ...data,
    });
}

// Viewers
function syncViewers() {
    const payload: ViewerSyncPayload = {
        players: Array.from(players.values()),
        viewers: io.sockets.adapter.rooms.get('viewer')?.size || 0,
    };
    io.to('viewer').emit('viewer.sync', payload);
}
