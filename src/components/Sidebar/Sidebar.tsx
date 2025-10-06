'use client';
import { useState } from 'react';
import { JoinModal } from '../JoinModal/JoinModal';
import { Leaderboard } from '../Leaderboard/Leaderboard';

export function Sidebar() {
    const [joinModal, setJoinModal] = useState(false);

    return (
        <aside className="bg-stone-950 flex flex-col p-4 md:w-80">
            <div className="flex-1">
                <Leaderboard />
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
