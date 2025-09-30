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
    notifyViewers: (event: string, payload: any) => void;
    off: (event: string, listener: ConnectionListener) => void;
    on: (event: string, listener: ConnectionListener) => void;
    sendToAllPeers: (data: any) => void;
    sendToHost: (data: any) => void;
    sendToPeer: (peerId: string, data: any) => void;
}
