'use client';
import { GameContainer, Header, Loader, Sidebar } from '@/components';
import { useConnection } from '@/contexts/Connection/Connection';

export default function Viewer() {
    const connection = useConnection();

    if (!connection.connected) {
        return <Loader />;
    }

    return (
        <>
            <Header />
            <div className="flex flex-1">
                <GameContainer />
                <Sidebar />
            </div>
        </>
    );
}
