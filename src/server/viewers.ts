import { debugServer } from '@/debug';
import { Player } from '@/types';
import { Server, Socket } from 'socket.io';

let io: Server;

export const list: string[] = [];

export function init(server: Server) {
    io = server;
}

export function register(socket: Socket, players: Player[]) {
    // Check existing
    if (list.includes(socket.id)) {
        return;
    }
    debugServer('viewer', `${socket.id} registered`);

    // Add to list and room
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
