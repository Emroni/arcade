'use client';
import { debugClient } from '@/debug';
import { GameTick } from '@/game/types';
import { withPathname } from '@/hooks';
import { Player, PlayerData } from '@/types';
import { ViewerSyncPayload } from '@/types/viewer';
import { compose } from '@/utils';
import _ from 'lodash';
import { Component, createContext, useContext } from 'react';
import { Socket, io } from 'socket.io-client';
import { ConnectionListener, ConnectionProviderProps, ConnectionState } from './Connection.types';

const ConnectionContext = createContext<ConnectionState>({} as ConnectionState);

export const useConnection = () => useContext(ConnectionContext);

export function withConnection(WrappedComponent: any) {
    return function ConnectionWrappedComponent(props: any) {
        return (
            <ConnectionContext.Consumer>
                {state => <WrappedComponent {...props} connection={state} />}
            </ConnectionContext.Consumer>
        );
    };
}

class Connection extends Component<ConnectionProviderProps, ConnectionState> {
    socket: Socket | null = null;

    constructor(props: ConnectionProviderProps) {
        super(props);

        // Initial state
        this.state = {
            connected: false,
            connecting: true,
            host: false,
            id: null,
            player: null,
            players: [],
            role: this.props.pathname.startsWith('/player') ? 'player' : 'viewer',
            viewers: 0,
            emit: this.emit,
            off: this.off,
            on: this.on,
            updatePlayer: this.updatePlayer,
        };
    }

    componentDidMount() {
        // Prevent server-side execution
        if (typeof window === 'undefined') {
            return;
        }

        // Connect to socket
        this.socket = io(process.env.NEXT_PUBLIC_SERVER_PATH, {
            query: {
                role: this.state.role,
            },
        });

        // Add listeners
        this.on('connect', this.handleConnect);
        this.on('disconnect', this.handleDisconnect);
        this.on('server.host.set', this.handleHostSet);
        this.on('server.host.player.control', this.handleHostPlayerControl);
        this.on('server.viewer.sync', this.handleViewerSync);
    }

    componentWillUnmount() {
        // Remove listeners
        this.off('connect', this.handleConnect);
        this.off('disconnect', this.handleDisconnect);
        this.off('server.host.set', this.handleHostSet);
        this.off('server.host.player.control', this.handleHostPlayerControl);
        this.off('server.viewer.sync', this.handleViewerSync);

        // Disconnect client
        this.socket?.disconnect();
    }

    debug = (message: string, ...args: any[]) => {
        debugClient('connection', message, ...args);
    };

    updateState = async (
        newState: Partial<ConnectionState> | ((prevState: ConnectionState) => Partial<ConnectionState> | null) | null
    ) => {
        return new Promise<ConnectionState>(resolve => {
            this.setState(newState as ConnectionState, () => {
                resolve(this.state);
            });
        });
    };

    // Connection handlers
    handleConnect = async () => {
        this.debug('Connected');

        // Update state
        await this.updateState({
            connected: true,
            connecting: false,
            id: this.socket?.id || null,
            host: false,
        });

        // Handle role
        if (this.state.role === 'player') {
            this.createPlayer();
        }
    };

    handleDisconnect = () => {
        this.debug('Disconnected');
        this.setState({
            connected: false,
            connecting: false,
            host: false,
            id: null,
            player: null,
            players: [],
            viewers: 0,
        });
    };

    handleHostSet = async (gameTick: GameTick) => {
        this.debug('Set as host');
        await this.updateState({
            host: true,
        });
        this.socket?.listeners('viewer.game.tick').forEach(l => l(gameTick));
    };

    handleHostPlayerControl = (data: PlayerData) => {
        this.setState(prevState => ({
            players: prevState.players.map(player => {
                if (player.id === data.id) {
                    return {
                        ...player,
                        ...data,
                    };
                }
                return player;
            }),
        }));
    };

    handleViewerSync = (payload: ViewerSyncPayload) => {
        this.setState({
            players: payload.players,
            viewers: payload.viewers,
        });
    };

    // Socket methods
    emit = (event: string, payload: any) => {
        this.socket?.emit(event, payload);
    };

    on = (event: string, listener: ConnectionListener) => {
        this.socket?.on(event, listener);
    };

    off = (event: string, listener: ConnectionListener) => {
        this.socket?.off(event, listener);
    };

    // Players
    createPlayer = async () => {
        this.debug('Creating player');

        // Check id
        const { id } = this.state;
        if (!id || !this.socket) {
            this.debug('Cannot create player: no id or socket');
            return;
        }

        // Create player
        const player: Player = {
            buttons: [false, false],
            color: `#${Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, '0')}`,
            id,
            joystick: [0, 0],
            name: `Player ${_.random(1000, 9999)}`,
        };

        // Apply locally stored data
        try {
            const stored = localStorage.getItem('connection.player');
            if (stored) {
                const data = JSON.parse(stored);
                Object.assign(player, data);
            }
        } catch {}

        // Update state
        await this.updateState({
            player,
        });

        // Emit event
        this.emit('player.server.add', player);
    };

    updatePlayer = async (data: PlayerData) => {
        // Update state
        const newState = await this.updateState(prevState => ({
            player: {
                ...prevState.player,
                ...data,
            } as Player,
        }));

        // Store config data in local storage
        if (data.color || data.name) {
            localStorage.setItem(
                'connection.player',
                JSON.stringify({
                    color: newState.player?.color,
                    name: newState.player?.name,
                })
            );
        }

        // Emit event
        this.emit('player.server.config', data);
    };

    render() {
        return <ConnectionContext.Provider value={this.state}>{this.props.children}</ConnectionContext.Provider>;
    }
}

export const ConnectionProvider = compose(withPathname)(Connection);
