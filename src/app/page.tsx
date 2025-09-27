'use client';
import { useSocket } from '@/contexts/Socket/Socket';

export default function Home() {
    const socket = useSocket();

    return (
        <div>
            <div>Connecting: {socket.connecting ? 'True' : 'False'}</div>
            <div>Connected: {socket.connected ? 'True' : 'False'}</div>
            <div>ID: {socket.id}</div>
            <div>Players: {socket.totalPlayers}</div>
        </div>
    );
}
