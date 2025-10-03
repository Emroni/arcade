import dotenvFlow from 'dotenv-flow';
import { Server, Socket } from 'socket.io';
import { debugServer } from './debug';
import { GameTick } from './game/types';
import { Player, PlayerButton, PlayerButtonPayload, PlayerControlPayload, PlayerData } from './types';
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
debugServer('socket', `Ready on port ${process.env.SERVER_PORT}`);

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

    // Player
    if (role === 'player') {
        socket.on('player.server.add', player => handlePlayerAdd(socket, player));
        socket.on('player.server.button', button => handlePlayerButton(socket, button));
        socket.on('player.server.config', data => handlePlayerConfig(socket, data));
        socket.on('player.server.control', data => handlePlayerControl(socket, data));
    }

    // Viewer and host
    if (role === 'viewer') {
        socket.on('host.server.game.tick', handleHostGameTick);
        socket.on('host.server.player.dead', handleHostPlayerDead);
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
        newHostSocket.emit('server.host.set', gameTick);
        debugServer('viewer', `[${newHostId}] Set as new host`);
    }
}

// Host
function handleHostGameTick(data: GameTick) {
    gameTick = data;
    io.to('viewer').except('host').emit('server.viewer.game.tick', data);
}

function handleHostPlayerDead(id: string) {
    // TODO: Handle player dead
    console.log('handleHostPlayerDead', id);
}

// Players
function handlePlayerAdd(socket: Socket, player: Player) {
    players.set(socket.id, player);
    syncViewers();
}

function handlePlayerButton(socket: Socket, button: PlayerButton) {
    const payload: PlayerButtonPayload = {
        button,
        id: socket.id,
    };
    io.to('host').emit('server.host.player.button', payload);
}

function handlePlayerConfig(socket: Socket, data: PlayerData) {
    updatePlayer(socket, data);
    syncViewers();
}

function handlePlayerControl(socket: Socket, data: PlayerControlPayload) {
    io.to('host').emit('server.host.player.control', {
        ...data,
        id: socket.id,
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
    io.to('viewer').emit('server.viewer.sync', payload);
}
