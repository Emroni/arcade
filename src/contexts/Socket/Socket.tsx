'use client';
import { debugClient } from '@/debug';
import { Player } from '@/types';
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
            players: [],
            emit: this.emit,
        };
    }

    componentDidMount() {
        // Check existing client
        if (this.client) {
            return;
        }

        // Create socket client
        this.client = io(process.env.NEXT_PUBLIC_SERVER_PATH);
        this.client.on('connect', this.handleConnect);
        this.client.on('disconnect', this.handleDisconnect);
        this.client.on('initPlayers', this.handleInitPlayers);
        this.client.on('addPlayer', this.handleAddPlayer);
        this.client.on('updatePlayer', this.handleUpdatePlayer);
        this.client.on('removePlayer', this.handleRemovePlayer);
    }

    componentWillUnmount() {
        // Disconnect socket client
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }
    }

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

    handleInitPlayers = (players: Player[]) => {
        this.setState({
            players,
        });
    };

    handleAddPlayer = (player: Player) => {
        this.setState(prevState => ({
            players: [...prevState.players, player],
        }));
    };

    handleUpdatePlayer = (player: Player) => {
        this.setState(prevState => ({
            players: prevState.players.map(p => (p.id === player.id ? player : p)),
        }));
    };

    handleRemovePlayer = (playerId: string) => {
        this.setState(prevState => ({
            players: prevState.players.filter(p => p.id !== playerId),
        }));
    };

    emit = (event: string, data: any) => {
        this.client?.emit(event, data);
    };

    render() {
        return <SocketContext.Provider value={this.state}>{this.props.children}</SocketContext.Provider>;
    }
}
