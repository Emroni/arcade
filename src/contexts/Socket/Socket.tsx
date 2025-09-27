'use client';
import { Component, createContext, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { SocketProviderProps, SocketState } from './Socket.types';

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
    client: Socket | null = null;

    constructor(props: SocketProviderProps) {
        super(props);

        // Initial state
        this.state = {
            connected: false,
            connecting: true,
            id: null,
            totalPlayers: 0,
        };
    }

    componentDidMount() {
        // Check existing client
        if (this.client) {
            return;
        }

        // Create socket client
        this.client = io(`${window.location.hostname}:${process.env.NEXT_PUBLIC_SERVER_PORT}`);
        this.client.on('connect', this.handleConnect);
        this.client.on('disconnect', this.handleDisconnect);
        this.client.on('totalPlayers', this.handleTotalPlayers);
    }

    componentWillUnmount() {
        // Disconnect socket client
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }
    }

    handleConnect = () => {
        this.setState({
            connected: true,
            connecting: false,
            id: this.client?.id || null,
        });
    };

    handleDisconnect = () => {
        this.setState({
            connected: false,
            connecting: false,
            id: null,
        });
    };

    handleTotalPlayers = (totalPlayers: number) => {
        this.setState({
            totalPlayers,
        });
    };

    render() {
        return <SocketContext.Provider value={this.state}>{this.props.children}</SocketContext.Provider>;
    }
}
