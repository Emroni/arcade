'use client';
import { useSocket } from '@/contexts/Socket/Socket';

export function Lobby() {
    const socket = useSocket();

    const players = Object.values(socket.players);

    return (
        <div className="p-4">
            <div>Players: {players.length}</div>
            <ol className="list-decimal list-inside">
                {players.map(player => (
                    <li key={player.id}>
                        {player.x.toFixed(3)}, {player.y.toFixed(3)}
                    </li>
                ))}
            </ol>
        </div>
    );
}
