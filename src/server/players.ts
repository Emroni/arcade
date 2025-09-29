import { debugServer } from '@/debug';
import { Player, PlayerMap, PlayerMove } from '@/types';
import { Server, Socket } from 'socket.io';

let io: Server;

export const map: PlayerMap = {};

export function init(server: Server) {
    io = server;
}

export function register(socket: Socket) {
    // Check existing
    if (map[socket.id]) {
        return;
    }
    debugServer('player', `${socket.id} registered`);

    // Create player
    const player: Player = {
        buttons: [false, false],
        id: socket.id,
        joystick: [0, 0],
    };

    // Add to map and room
    map[socket.id] = player;
    socket.join('players');

    // Add listeners
    socket.on('movePlayer', move => handleMove(player, move));

    // Notify viewers
    io.to('viewers').emit('addPlayers', [player]);
}

export function unregister(socket: Socket) {
    // Check existing
    if (!map[socket.id]) {
        return;
    }
    debugServer('player', `${socket.id} unregistered`);

    // Remove from list
    delete map[socket.id];

    // Notify viewers
    io.to('viewers').emit('removePlayers', [socket.id]);
}

function handleMove(player: Player, move: PlayerMove) {
    // Update player
    player.buttons = move.buttons;
    player.joystick = move.joystick;

    // Notify viewers
    io.to('viewers').emit('updatePlayer', player);
}
