import { ConnectionState } from '../Connection/Connection.types';

export interface GameProviderProps {
    children: React.ReactNode;
    connection: ConnectionState;
}

export interface GameState {
    canvas: HTMLCanvasElement | null;
    mountCanvas: (container: HTMLDivElement) => void;
}
