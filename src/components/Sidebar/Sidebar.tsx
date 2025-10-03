'use client';
import { useConnection } from '@/contexts/Connection/Connection';
import { useState } from 'react';
import { JoinModal } from '../JoinModal/JoinModal';

export function Sidebar() {
    const [joinModal, setJoinModal] = useState(false);
    const connection = useConnection();

    return (
        <aside className="flex flex-col p-4 w-80">
            <div className="flex-1">
                <div>ID: {connection.id}</div>
                <div>Host: {connection.host ? 'true' : 'false'}</div>
                <div>Viewers: {connection.viewers}</div>
                <div>Players: {connection.players.length}</div>
                <ul className="mt-4">
                    {connection.players.map(player => (
                        <li key={player.id} style={{ color: player.color }}>
                            [{player.score}] {player.name}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Join */}
            <div>
                <button
                    className="bg-indigo-500 p-1 rounded uppercase w-full"
                    type="button"
                    onClick={() => setJoinModal(true)}
                >
                    Join
                </button>

                {joinModal && <JoinModal onClose={() => setJoinModal(false)} />}
            </div>
        </aside>
    );
}
