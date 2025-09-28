'use client';
import { debugClient } from '@/debug';
import { Player, Players } from '@/types';
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
            players: {},
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
        this.client.on('addPlayers', this.handleAddPlayers);
        this.client.on('removePlayers', this.handleRemovePlayers);
        this.client.on('updatePlayer', this.handleUpdatePlayer);
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

    handleAddPlayers = (players: Players) => {
        debugClient('player', 'Added', players);
        this.setState(prevState => ({
            players: {
                ...prevState.players,
                ...players,
            },
        }));
    };

    handleRemovePlayers = (playerIds: string[]) => {
        debugClient('player', 'Removed', playerIds);
        this.setState(prevState => {
            // Remove players
            const players = { ...prevState.players };
            for (const id of playerIds) {
                delete players[id];
            }

            // Update state
            return {
                players,
            };
        });
    };

    handleUpdatePlayer = (player: Player) => {
        this.setState(prevState => ({
            players: {
                ...prevState.players,
                [player.id]: player,
            },
        }));
    };

    emit = (event: string, data: any) => {
        this.client?.emit(event, data);
    };

    render() {
        return <SocketContext.Provider value={this.state}>{this.props.children}</SocketContext.Provider>;
    }
}
