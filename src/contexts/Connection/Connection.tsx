'use client';
import { debugClient } from '@/debug';
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
    listeners: Record<string, ConnectionListener[]> = {};
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
            notifyHost: this.notifyHost,
            notifyPlayers: this.notifyPlayers,
            notifyViewers: this.notifyViewers,
            off: this.off,
            on: this.on,
            trigger: this.trigger,
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
        this.socket.on('connect', this.handleConnect);
        this.socket.on('disconnect', this.handleDisconnect);
        this.socket.on('host.set', this.handleHostSet);
        this.socket.on('viewer.sync', this.handleViewerSync);
        // this.socket.on('player.add', this.handleHostPlayerAdd);
        // this.socket.on('player.remove', this.handleHostPlayerRemove);
    }

    componentWillUnmount() {
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
            id: null,
            host: false,
        });
    };

    handleHostSet = () => {
        this.debug('Set as host');
        this.setState({
            host: true,
        });
    };

    handleViewerSync = (payload: ViewerSyncPayload) => {
        this.setState({
            players: payload.players,
            viewers: payload.viewers,
        });
    };

    // WebRTC methods
    notifyHost = (event: string, payload: any) => {
        // if (this.hostId) {
        //     this.sendToPeer(this.hostId, {
        //         event,
        //         payload,
        //     });
        // } else {
        //     this.debug('Cannot notify host: no host ID');
        // }
    };

    notifyPlayers = (event: string, payload: any) => {
        // this.state.players.forEach(player => {
        //     this.sendToPeer(player.id, {
        //         event,
        //         payload,
        //     });
        // });
    };

    notifyViewers = (event: string, payload: any) => {
        // this.state.viewerIds.forEach(viewerId => {
        //     this.sendToPeer(viewerId, {
        //         event,
        //         payload,
        //     });
        // });
    };

    // Listeners
    on = (event: string, listener: ConnectionListener) => {
        // Add event if it doesn't exist
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }

        // Add listener
        this.listeners[event].push(listener);
    };

    off = (event: string, listener: ConnectionListener) => {
        // Check if event exists
        if (!this.listeners[event]) {
            return;
        }

        // Remove listener
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);

        // Remove event if no listeners left
        if (this.listeners[event].length === 0) {
            delete this.listeners[event];
        }
    };

    trigger = (event: string, payload?: any, peerId?: string) => {
        // Call event listeners
        this.listeners[event]?.forEach(listener => {
            listener(payload, peerId);
        });
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

        // Emit to server
        this.socket?.emit('player.add', player);
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

        // Emit to server
        this.socket?.emit('player.update', data);
    };

    // handleHostPlayerAdd = async (player: Player) => {
    //     this.debug('Add player', player);

    //     // Update state
    //     await this.updateState(prevState => ({
    //         players: [...prevState.players, player],
    //     }));

    //     // Notify viewers and trigger event
    //     this.notifyViewers('viewers.players.add', [player]);
    //     this.trigger('viewers.players.add', [player]);
    // };

    // handleHostPlayerRemove = async (playerId: string) => {
    //     this.debug('Remove player', playerId);

    //     // Update state
    //     await this.updateState(prevState => ({
    //         players: prevState.players.filter(p => p.id !== playerId),
    //     }));

    //     // Notify viewers and trigger event
    //     this.notifyViewers('viewers.players.remove', [playerId]);
    //     this.trigger('viewers.players.remove', [playerId]);
    // };

    // // Viewers
    // addViewer = async (viewerId: string) => {
    //     this.debug('Add viewer', viewerId);

    //     // Update state
    //     await this.updateState(prevState => ({
    //         viewerIds: [...prevState.viewerIds, viewerId],
    //     }));

    //     // Notify viewer
    //     this.sendToPeer(viewerId, {
    //         event: 'viewers.players.add',
    //         payload: this.state.players,
    //     });
    // };

    render() {
        return <ConnectionContext.Provider value={this.state}>{this.props.children}</ConnectionContext.Provider>;
    }
}

export const ConnectionProvider = compose(withPathname)(Connection);
