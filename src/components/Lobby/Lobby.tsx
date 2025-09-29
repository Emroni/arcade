'use client';
import { useSocket } from '@/contexts/Socket/Socket';
import Link from 'next/link';
import QRCode from 'react-qr-code';

export function Lobby() {
    const socket = useSocket();

    return (
        <div className="flex h-screen">
            {/* Playground */}
            <div className="flex-1 relative">
                <div className="absolute border inset-4">
                    {socket.players.map(player => {
                        const [amount, angle] = player.joystick;
                        return (
                            <div
                                className="border absolute h-4 left-[50%] top-[50%] w-6"
                                key={player.id}
                                style={{
                                    left: `calc(50% + ${amount * 40 * Math.sin(-angle + Math.PI / 2)}% - 12px)`,
                                    top: `calc(50% + ${amount * 40 * Math.cos(angle - Math.PI / 2)}% - 12px)`,
                                    transform: `rotate(${angle}rad)`,
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Player list */}
            <aside className="flex flex-col p-4 w-50">
                <div className="flex-1">Players: {socket.players.length}</div>
                <div>
                    <Link className="underline" href="/player">
                        Join now
                    </Link>
                    <div className="bg-white w-16">
                        <QRCode size={128} value={`${window.location.origin}/player`} viewBox="0 0 128 128" />
                    </div>
                </div>
            </aside>
        </div>
    );
}
