'use client';
import { useConnection } from '@/contexts/Connection/Connection';
import { Icon } from '../Icon/Icon';

export function Header() {
    const connection = useConnection();

    const { host, players, viewers } = connection;

    return (
        <header className="bg-stone-900 flex gap-4 justify-between p-2">
            {/* Title */}
            <h1>Arcade</h1>

            {/* Status */}
            <div className="flex gap-6 justify-end">
                <div
                    className="items-center flex gap-2"
                    title={`${players.length} player${players.length === 1 ? '' : 's'}`}
                >
                    <Icon type="player" />
                    {players.length}
                </div>
                <div className="items-center flex gap-2" title={`${viewers} viewer${viewers === 1 ? '' : 's'}`}>
                    <Icon type="viewer" />
                    {viewers}
                </div>
                {host && (
                    <div title="Host">
                        <Icon type="host" />
                    </div>
                )}
            </div>

            {/* Links */}
            <div>
                <a href="https://github.com/Emroni/arcade" rel="noreferrer" target="_blank" title="View on GitHub">
                    <Icon size={20} type="github" />
                </a>
            </div>
        </header>
    );
}
