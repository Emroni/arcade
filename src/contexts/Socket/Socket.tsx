'use client';
import { debugClient } from '@/debug';
import { withPathname } from '@/hooks';
import { compose } from '@/utils';
import { Component, createContext, useContext } from 'react';
import { Socket as Client, io } from 'socket.io-client';
import { SocketListener, SocketProviderProps, SocketState } from './Socket.types';

const SocketContext = createContext<SocketState>({} as SocketState);

export const useSocket = () => useContext(SocketContext);

export function withSocket(WrappedComponent: any) {
    return function SocketWrappedComponent(props: any) {
        return (
            <SocketContext.Consumer>{state => <WrappedComponent {...props} socket={state} />}</SocketContext.Consumer>
        );
    };
}

class Socket extends Component<SocketProviderProps, SocketState> {
    client: Client | null = null;

    constructor(props: SocketProviderProps) {
        super(props);

        // Initial state
        this.state = {
            connected: false,
            connecting: true,
            host: false,
            id: null,
            emit: this.emit,
            on: this.on,
            off: this.off,
        };
    }

    componentDidMount() {
        // Prevent server-side execution
        if (typeof window === 'undefined') {
            return;
        }

        // Create client
        this.client = io(process.env.NEXT_PUBLIC_SERVER_PATH, {
            query: {
                role: this.props.pathname.startsWith('/player') ? 'player' : 'viewer',
            },
        });

        // Add client listeners
        this.client.on('addPlayer', this.handleAddPlayer);
        this.client.on('addViewer', this.handleAddViewer);
        this.client.on('connect', this.handleConnect);
        this.client.on('disconnect', this.handleDisconnect);
        this.client.on('removePlayer', this.handleRemovePlayer);
        this.client.on('removeViewer', this.handleRemoveViewer);
        this.client.on('setHost', this.handleSetHost);
    }

    componentWillUnmount() {
        // Disconnect client
        this.client?.disconnect();
    }

    // Connection handlers
    handleConnect = () => {
        debugClient('socket', 'Connected');
        this.setState({
            connected: true,
            connecting: false,
            id: this.client?.id || null,
        });
    };

    handleDisconnect = () => {
        debugClient('socket', 'Disconnected');
        this.setState({
            connected: false,
            connecting: false,
            id: null,
        });
    };

    handleSetHost = () => {
        debugClient('socket', 'Set as host');
        this.setState({
            host: true,
        });
    };

    // Player handlers
    handleAddPlayer = (socketId: string) => {
        debugClient('socket', 'Add player', socketId);
    };

    handleRemovePlayer = (socketId: string) => {
        debugClient('socket', 'Remove player', socketId);
    };

    // Viewer handlers
    handleAddViewer = (socketId: string) => {
        debugClient('socket', 'Add viewer', socketId);
    };

    handleRemoveViewer = (socketId: string) => {
        debugClient('socket', 'Remove viewer', socketId);
    };

    // Socket methods
    emit = (event: string, data: any) => {
        this.client?.emit(event, data);
    };

    on = (event: string, listener: SocketListener) => {
        this.client?.on(event, listener);
    };

    off = (event: string, listener: SocketListener) => {
        this.client?.off(event, listener);
    };

    render() {
        return <SocketContext.Provider value={this.state}>{this.props.children}</SocketContext.Provider>;
    }
}

export const SocketProvider = compose(withPathname)(Socket);
