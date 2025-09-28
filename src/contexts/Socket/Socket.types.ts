import { Room } from '@/types';

export type SocketListener = (...args: any[]) => void;

export interface SocketProviderProps {
    children: React.ReactNode;
}

export interface SocketState {
    connected: boolean;
    connecting: boolean;
    id: string | null;
    room: Room | null;
    rooms: Room[];
    totalPlayers: number;
    createRoom: () => void;
    joinRoom: (roomId: string) => void;
    leaveRoom: (roomId: string) => void;
}
