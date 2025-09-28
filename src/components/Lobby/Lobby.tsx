'use client';
import { useSocket } from '@/contexts/Socket/Socket';

export function Lobby() {
    const socket = useSocket();

    return (
        <div className="p-4">
            <div>Players: {socket.players.length}</div>
            <ol className="list-decimal list-inside">
                {socket.players.map(player => (
                    <li key={player.id}>
                        {player.x.toFixed(3)}, {player.y.toFixed(3)}
                    </li>
                ))}
            </ol>
        </div>
    );
}
