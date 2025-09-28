import { Players } from '@/types';

export type SocketListener = (...args: any[]) => void;

export interface SocketProviderProps {
    children: React.ReactNode;
}

export interface SocketState {
    connected: boolean;
    connecting: boolean;
    id: string | null;
    players: Players;
    emit: (event: string, data?: any) => void;
}
