import { debugServer } from '@/debug';
import { Server, Socket } from 'socket.io';

export const viewers: string[] = [];

let io: Server;

export function init(server: Server) {
    io = server;
}

export function register(socket: Socket) {
    // Check existing
    if (viewers.includes(socket.id)) {
        return;
    }
    debugServer('viewer', `${socket.id} registered`);

    // Add to room and list
    viewers.push(socket.id);
    socket.join('viewers');

    // Notify viewer
    const playerIds = Array.from(io.sockets.adapter.rooms.get('players')?.values() || []);
    socket.emit('addPlayers', playerIds);
}

export function unregister(socket: Socket) {
    // Check existing
    const index = viewers.indexOf(socket.id);
    if (index === -1) {
        return;
    }
    debugServer('viewer', `${socket.id} unregistered`);

    // Remove from list
    viewers.splice(index, 1);
}
