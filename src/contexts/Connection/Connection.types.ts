export type ConnectionListener = (payload: any, peerId?: string) => void;

export interface ConnectionProviderProps {
    children: React.ReactNode;
    pathname: string;
}

export interface ConnectionState {
    connected: boolean;
    connecting: boolean;
    host: boolean;
    id: string | null;
    players: string[];
    role: string;
    viewers: string[];
    notifyHost: (event: string, payload: any) => void;
    notifyPlayers: (event: string, payload: any) => void;
    notifyViewers: (event: string, payload: any) => void;
    off: (event: string, listener: ConnectionListener) => void;
    on: (event: string, listener: ConnectionListener) => void;
    trigger: (event: string, payload?: any, peerId?: string) => void;
}
