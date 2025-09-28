'use client';
import { useSocket } from '@/contexts/Socket/Socket';
import QRCode from 'react-qr-code';

export function Lobby() {
    const socket = useSocket();

    const players = Object.values(socket.players);

    return (
        <div className="flex h-screen">
            {/* Playground */}
            <div className="flex-1 relative">
                <div className="absolute border inset-4">
                    {players.map(player => (
                        <div
                            className="border rounded-full absolute h-6 w-6"
                            key={player.id}
                            style={{
                                left: `calc(${player.x * 100}% - 12px)`,
                                top: `calc(${player.y * 100}% - 12px)`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Player list */}
            <aside className="flex flex-col p-4 w-50">
                <div className="flex-1">Players: {players.length}</div>
                <div>
                    Join now
                    <div className="bg-white w-16">
                        <QRCode size={128} value={`${window.location.origin}/player`} viewBox="0 0 128 128" />
                    </div>
                </div>
            </aside>
        </div>
    );
}
