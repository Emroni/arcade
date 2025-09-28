import { debugServer } from '@/debug';
import { Players } from '@/types';
import { Server, Socket } from 'socket.io';

export const list: string[] = [];

let io: Server;

export function init(server: Server) {
    io = server;
}

export function register(socket: Socket, players: Players) {
    // Check existing
    if (list.includes(socket.id)) {
        return;
    }
    debugServer('viewer', `${socket.id} registered`);

    // Add to room and list
    list.push(socket.id);
    socket.join('viewers');

    // Send current list of players
    socket.emit('addPlayers', players);
}

export function unregister(socket: Socket) {
    // Check existing
    const index = list.indexOf(socket.id);
    if (index === -1) {
        return;
    }
    debugServer('viewer', `${socket.id} unregistered`);

    // Remove from list
    list.splice(index, 1);
}
