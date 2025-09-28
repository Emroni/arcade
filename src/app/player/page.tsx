'use client';
import { Loader } from '@/components';
import { Controller } from '@/components/Controller/Controller';
import { useSocket } from '@/contexts/Socket/Socket';

export default function Player() {
    const socket = useSocket();

    return <>{socket.id ? <Controller /> : <Loader />}</>;
}
