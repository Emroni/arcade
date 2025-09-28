import { debugServer } from '@/debug';
import { Player, Players, Point } from '@/types';
import { Server, Socket } from 'socket.io';

export const list: Players = {};

let io: Server;

export function init(server: Server) {
    io = server;
}

export function register(socket: Socket) {
    // Check existing
    if (list[socket.id]) {
        return;
    }
    debugServer('player', `${socket.id} registered`);

    // Create player
    const player = {
        id: socket.id,
        x: 0,
        y: 0,
    };

    // Add to room and list
    list[socket.id] = player;
    socket.join('players');

    // Add listeners
    socket.on('movePlayer', position => handleMove(player, position));

    // Notify viewers
    io.to('viewers').emit('addPlayers', {
        [socket.id]: player,
    });
}

export function unregister(socket: Socket) {
    // Check existing
    if (!list[socket.id]) {
    }
    debugServer('player', `${socket.id} unregistered`);

    // Remove from list
    delete list[socket.id];

    // Notify viewers
    io.to('viewers').emit('removePlayers', [socket.id]);
}

function handleMove(player: Player, position: Point) {
    // Update position
    player.x = position.x;
    player.y = position.y;

    // Notify viewers
    io.to('viewers').emit('updatePlayer', player);
}
