'use client';
import { useSocket } from '@/contexts/Socket/Socket';

export default function Home() {
    const socket = useSocket();

    return (
        <div className="flex flex-col gap-4 p-4">
            <div>
                <div>Connecting: {socket.connecting ? 'True' : 'False'}</div>
                <div>Connected: {socket.connected ? 'True' : 'False'}</div>
                <div>ID: {socket.id}</div>
                <div>Players: {socket.totalPlayers}</div>
            </div>
            <div>
                <div>Room: {socket.room?.id}</div>
                <button onClick={socket.createRoom}>Create room</button>
            </div>
            <div>
                <div>Rooms: {socket.rooms.length}</div>
                {socket.rooms.map(room => (
                    <div key={room.id} className="flex gap-2">
                        <div>
                            {room.id} ({room.playerCount})
                        </div>
                        {socket.room?.id === room.id ? (
                            <button onClick={() => socket.leaveRoom(room.id)}>Leave</button>
                        ) : (
                            <button onClick={() => socket.joinRoom(room.id)}>Join</button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
