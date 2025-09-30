'use client';
import { debugClient } from '@/debug';
import { Component, createContext, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
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

export class SocketProvider extends Component<SocketProviderProps, SocketState> {
    client: Socket;

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

        // Create client
        this.client = io(process.env.NEXT_PUBLIC_SERVER_PATH);
    }

    componentDidMount() {
        // Add client listeners
        this.client.on('connect', this.handleConnect);
        this.client.on('disconnect', this.handleDisconnect);
        this.client.on('setHost', this.handleSetHost);
    }

    componentWillUnmount() {
        // Disconnect client
        this.client.disconnect();
    }

    handleConnect = () => {
        debugClient('socket', 'Connected');
        this.setState({
            connected: true,
            connecting: false,
            id: this.client.id || null,
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

    emit = (event: string, data: any) => {
        this.client.emit(event, data);
    };

    on = (event: string, listener: SocketListener) => {
        this.client.on(event, listener);
    };

    off = (event: string, listener: SocketListener) => {
        this.client.off(event, listener);
    };

    render() {
        return <SocketContext.Provider value={this.state}>{this.props.children}</SocketContext.Provider>;
    }
}
