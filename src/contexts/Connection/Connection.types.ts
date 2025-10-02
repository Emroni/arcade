import { Player, PlayerData } from '@/types';

export type ConnectionListener = (payload: any, peerId?: string) => void;
export type ConnectionPeerRole = 'player' | 'viewer';

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
    notifyHost: (event: string, payload: any) => void;
    notifyPlayers: (event: string, payload: any) => void;
    notifyViewers: (event: string, payload: any) => void;
    off: (event: string, listener: ConnectionListener) => void;
    on: (event: string, listener: ConnectionListener) => void;
    trigger: (event: string, payload?: any, peerId?: string) => void;
    updatePlayer: (data: PlayerData) => void;
}

export interface ConnectionPeer {
    id: string;
    role: ConnectionPeerRole;
}
