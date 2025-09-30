'use client';
import { useGame } from '@/contexts/Game/Game';
import { useConnection } from '@/contexts/Connection/Connection';
import Link from 'next/link';
import QRCode from 'react-qr-code';

export function Sidebar() {
    const connection = useConnection();
    const game = useGame();

    return (
        <aside className="flex flex-col p-4 w-50">
            <div className="flex-1">
                <div>Host: {connection.host ? 'true' : 'false'}</div>
                <div>Players: {Object.values(game.players).length}</div>
            </div>
            <div>
                <Link className="underline" href="/player">
                    Join now
                </Link>
                <div className="bg-white w-16">
                    <QRCode size={128} value={`${window.location.origin}/player`} viewBox="0 0 128 128" />
                </div>
            </div>
        </aside>
    );
}
