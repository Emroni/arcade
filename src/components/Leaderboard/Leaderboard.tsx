'use client';
import { useConnection } from '@/contexts/Connection/Connection';

export function Leaderboard() {
    const connection = useConnection();

    return (
        <table className="w-full">
            <tbody>
                {connection.players.map((player, index) => (
                    <tr key={player.id} style={{ color: player.color }}>
                        <td className="text-right">{index + 1}.</td>
                        <td className="px-2">{player.name}</td>
                        <td className="text-right">{player.score}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
