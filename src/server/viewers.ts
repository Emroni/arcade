import { debugServer } from '@/debug';
import { Player, Viewer, ViewerMap } from '@/types';
import { Server, Socket } from 'socket.io';

let io: Server;

export const list: Viewer[] = [];
export const map: ViewerMap = {};

export function init(server: Server) {
    io = server;
}

export function register(socket: Socket, players: Player[]) {
    // Check existing
    if (map[socket.id]) {
        return;
    }
    debugServer('viewer', `${socket.id} registered`);

    // Create viewer
    const viewer: Viewer = {
        host: !list.length,
        id: socket.id,
    };
    map[socket.id] = viewer;

    // Add to list, map and room
    list.push(viewer);
    map[socket.id] = viewer;
    socket.join('viewers');

    // Send current list of players
    socket.emit('addPlayers', players);

    // Notify if host
    if (viewer.host) {
        debugServer('viewer', `${socket.id} set as host`);
        socket.emit('setHost');
        io.to('players').emit('connectHost', viewer.id);
    }
}

export function unregister(socket: Socket) {
    // Check existing
    const index = list.findIndex(v => v.id === socket.id);
    if (index === -1) {
        return;
    }
    debugServer('viewer', `${socket.id} unregistered`);

    // Remove from list and map
    list.splice(index, 1);
    delete map[socket.id];

    // Pick new host
    if (list.length && !list.find(v => v.host)) {
        const viewer = list[0];
        viewer.host = true;
        debugServer('viewer', `${viewer.id} set as new host`);
        io.to(viewer.id).emit('setHost');
        io.to('players').emit('connectHost', viewer.id);
    }
}
