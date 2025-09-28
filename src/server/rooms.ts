import { Room } from '@/types';
import _ from 'lodash';
import { Socket } from 'socket.io';

const roomIdCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude I, O, 0, 1 for clarity

export const rooms: Room[] = [];

export function createRoom() {
    // Generate unique ID
    let id = '';
    do {
        id = _.sampleSize(roomIdCharacters, 6).join('');
    } while (rooms.find(r => r.id === id));

    // Create room
    const room: Room = {
        id,
        playerCount: 0,
    };
    console.log(`Room [${room.id}] created`);
    rooms.push(room);
    return room;
}

export function removeRoom(roomId: string) {
    // Find room
    const index = rooms.findIndex(r => r.id === roomId);
    if (index === -1) {
        console.error(`Room [${roomId}] not found`);
        return;
    }

    // TODO: Remove players from room

    // Remove room
    rooms.splice(index, 1);
    console.log(`Room [${roomId}] removed`);
}

export function joinRoom(socket: Socket, roomId: string) {
    // Find room
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        console.error(`Room [${roomId}] not found`);
        return;
    }

    // Leave current room
    Array.from(socket.rooms)
        .filter(rId => rId !== socket.id)
        .forEach(rId => leaveRoom(socket, rId));

    // Add player to room
    room.playerCount++;
    socket.join(room.id);
    socket.emit('joinedRoom', room);
    console.log(`Player [${socket.id}] joined room [${room.id}]`);
}

export function leaveRoom(socket: Socket, roomId: string) {
    // Find room
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
        console.error(`Room [${roomId}] not found`);
        return;
    }

    // Remove player from room
    room.playerCount--;
    socket.leave(room.id);
    socket.emit('leftRoom', room);
    console.log(`Player [${socket.id}] left room [${room.id}]`);
}
