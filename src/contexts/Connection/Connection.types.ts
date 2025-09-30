export type ConnectionListener = (...args: any[]) => void;

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
    viewers: string[];
    emit: (event: string, data: any) => void;
    on: (event: string, listener: ConnectionListener) => void;
    off: (event: string, listener: ConnectionListener) => void;
    sendToHost: (data: any) => void;
    sendToAllPeers: (data: any) => void;
    sendToPeer: (peerId: string, data: any) => void;
}
