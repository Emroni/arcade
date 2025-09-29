'use client';
import { useGame } from '@/contexts/Game/Game';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { GameContainer } from '../GameContainer/GameContainer';

export function Lobby() {
    const game = useGame();

    return (
        <div className="flex h-screen">
            <GameContainer />

            {/* Player list */}
            <aside className="flex flex-col p-4 w-50">
                <div className="flex-1">Players: {Object.values(game.players).length}</div>
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
