'use client';
import { debugClient } from '@/debug';
import { Room } from '@/types';
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
            room: null,
            rooms: [],
            totalPlayers: 0,
            createRoom: this.createRoom,
            joinRoom: this.joinRoom,
            leaveRoom: this.leaveRoom,
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
        this.client.on('joinedRoom', this.handleJoinedRoom);
        this.client.on('leftRoom', this.handleLeftRoom);
        this.client.on('updatedPlayers', this.handleUpdatedPlayers);
        this.client.on('updatedRooms', this.handleUpdatedRooms);
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

    handleJoinedRoom = (room: Room) => {
        debugClient('socket', 'Joined room', room);
        this.setState({
            room,
        });
    };

    handleLeftRoom = (room: Room) => {
        debugClient('socket', 'Left room', room);
        this.setState({
            room: null,
        });
    };

    handleUpdatedPlayers = (totalPlayers: number) => {
        this.setState({
            totalPlayers,
        });
    };

    handleUpdatedRooms = (rooms: Room[]) => {
        this.setState({
            rooms,
        });
    };

    createRoom = () => {
        this.client?.emit('createRoom');
    };

    joinRoom = (roomId: string) => {
        this.client?.emit('joinRoom', roomId);
    };

    leaveRoom = (roomId: string) => {
        this.client?.emit('leaveRoom', roomId);
    };

    render() {
        return <SocketContext.Provider value={this.state}>{this.props.children}</SocketContext.Provider>;
    }
}
