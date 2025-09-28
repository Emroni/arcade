'use client';
import { Loader, Lobby } from '@/components';
import { useSocket } from '@/contexts/Socket/Socket';

export default function Home() {
    const socket = useSocket();

    return <>{socket.id ? <Lobby /> : <Loader />}</>;
}
