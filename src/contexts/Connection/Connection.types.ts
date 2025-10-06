import { Player, PlayerData } from '@/types';

export type ConnectionListener = (payload: any) => void;

export interface ConnectionProviderProps {
    children: React.ReactNode;
    pathname: string;
}

export interface ConnectionState {
    connected: boolean;
    connecting: boolean;
    host: boolean;
    id: string | null;
    player: Player | null;
    players: Player[];
    role: string;
    viewers: number;
    emit: (event: string, payload?: any) => void;
    off: (event: string, listener: ConnectionListener) => void;
    on: (event: string, listener: ConnectionListener) => void;
    updatePlayer: (data: PlayerData) => void;
    updatePlayerScore: (playerId: string) => void;
}
