export type SocketListener = (...args: any[]) => void;

export interface SocketProviderProps {
    children: React.ReactNode;
}

export interface SocketState {
    connected: boolean;
    connecting: boolean;
    host: boolean;
    id: string | null;
    emit: (event: string, data?: any) => void;
    on: (event: string, listener: SocketListener) => void;
    off: (event: string, listener: SocketListener) => void;
}
