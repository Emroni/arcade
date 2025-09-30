export type SocketListener = (...args: any[]) => void;

export interface SocketProviderProps {
    children: React.ReactNode;
    pathname: string;
}

export interface SocketState {
    connected: boolean;
    connecting: boolean;
    host: boolean;
    id: string | null;
    connectedPeers: string[];
    emit: (event: string, data: any) => void;
    on: (event: string, listener: SocketListener) => void;
    off: (event: string, listener: SocketListener) => void;
    sendToHost: (data: any) => void;
    sendToAllPeers: (data: any) => void;
    sendToPeer: (peerId: string, data: any) => void;
}
