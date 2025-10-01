'use client';
import { useConnection } from '@/contexts/Connection/Connection';
import Link from 'next/link';
import QRCode from 'react-qr-code';

export function Sidebar() {
    const connection = useConnection();

    return (
        <aside className="flex flex-col p-4 w-80">
            <div className="flex-1">
                <div>ID: {connection.id}</div>
                <div>Host: {connection.host ? 'true' : 'false'}</div>
                <div>Viewers: {connection.viewerIds.length}</div>
                <ul className="list-disc list-inside">
                    {connection.viewerIds.map(viewerId => (
                        <li key={viewerId}>{viewerId}</li>
                    ))}
                </ul>
                <div>Players: {connection.players.length}</div>
                <ul className="list-disc list-inside">
                    {connection.players.map(player => (
                        <li key={player.id}>
                            {player.name} ({player.id})
                        </li>
                    ))}
                </ul>
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
