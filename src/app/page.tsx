'use client';
import { GameContainer, Loader, Sidebar } from '@/components';
import { useSocket } from '@/contexts/Socket/Socket';

export default function Viewer() {
    const socket = useSocket();

    if (!socket.connected) {
        return <Loader />;
    }

    return (
        <div className="flex h-screen">
            <GameContainer />
            <Sidebar />
        </div>
    );
}
