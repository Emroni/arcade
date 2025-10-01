'use client';
import { debugClient } from '@/debug';
import { withPathname } from '@/hooks';
import { Player, PlayerData } from '@/types';
import { compose } from '@/utils';
import _ from 'lodash';
import { Component, createContext, useContext } from 'react';
import { Socket, io } from 'socket.io-client';
import { ConnectionListener, ConnectionPeer, ConnectionProviderProps, ConnectionState } from './Connection.types';

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
    dataChannels: Map<string, RTCDataChannel> = new Map();
    hostId: string | null = null;
    listeners: Record<string, ConnectionListener[]> = {};
    peerConnections: Map<string, RTCPeerConnection> = new Map();
    socket: Socket | null = null;

    rtcConfiguration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

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
            viewerIds: [],
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

        // Create client
        this.socket = io(process.env.NEXT_PUBLIC_SERVER_PATH, {
            query: {
                role: this.state.role,
            },
        });

        // Add connection listeners
        this.on('addPlayer', this.addPlayer);
        this.on('removePlayer', this.removePlayer);

        // Add socket listeners
        this.socket.on('addPeer', this.handleAddPeer);
        this.socket.on('connect', this.handleConnect);
        this.socket.on('disconnect', this.handleDisconnect);
        this.socket.on('iceCandidate', this.handleIceCandidate);
        this.socket.on('removePeer', this.handleRemovePeer);
        this.socket.on('setHost', this.handleSetHost);
        this.socket.on('webrtcAnswer', this.handleWebRTCAnswer);
        this.socket.on('webrtcOffer', this.handleWebRTCOffer);
    }

    componentWillUnmount() {
        // Close all peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.dataChannels.clear();

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
    handleConnect = () => {
        this.debug('Connected');
        this.setState({
            connected: true,
            connecting: false,
            id: this.socket?.id || null,
        });
    };

    handleDisconnect = () => {
        this.debug('Disconnected');
        this.setState({
            connected: false,
            connecting: false,
            id: null,
        });
    };

    handleSetHost = () => {
        this.debug('Set as host');
        this.setState({
            host: true,
        });
    };

    // Peer connection handlers
    handleAddPeer = (peer: ConnectionPeer) => {
        this.debug('Add peer', peer);

        // If we're the host, create connection to this new peer
        if (this.state.host) {
            this.createPeerConnection(peer);
        }
    };

    handleRemovePeer = (peer: ConnectionPeer) => {
        this.debug('Remove peer', peer);

        // Close and remove peer connection
        const peerConnection = this.peerConnections.get(peer.id);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(peer.id);
        }

        this.dataChannels.delete(peer.id);

        // Remove player
        if (peer.role === 'player') {
            this.removePlayer(peer.id);
        }
    };

    // WebRTC Connection Management
    createPeerConnection = async (peer: ConnectionPeer) => {
        this.debug(`Creating connection to peer: ${peer.id}`, peer);

        const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

        // Create data channel (host creates the channel)
        const dataChannel = peerConnection.createDataChannel('game', {
            ordered: true,
        });

        this.debug(`Data channel created for ${peer.id}, initial state: ${dataChannel.readyState}`);

        dataChannel.onopen = () => {
            this.debug(`Data channel open with ${peer.id}`);

            // Add viewer
            if (peer.role === 'viewer') {
                this.addViewer(peer.id);
            }
        };

        dataChannel.onmessage = event => {
            this.handlePeerMessage(peer.id, event.data);
        };

        dataChannel.onclose = () => {
            this.debug(`Data channel closed with ${peer.id}`);

            // Remove viewer
            if (peer.role === 'viewer') {
                this.setState(prevState => ({
                    viewerIds: prevState.viewerIds.filter(id => id !== peer.id),
                }));
            }
        };

        dataChannel.onerror = error => {
            this.debug(`Data channel error with ${peer.id}:`, error);
        };

        // Add connection state change logging
        peerConnection.onconnectionstatechange = () => {
            this.debug(`Peer connection state with ${peer.id}: ${peerConnection.connectionState}`);
        };

        peerConnection.oniceconnectionstatechange = () => {
            this.debug(`ICE connection state with ${peer.id}: ${peerConnection.iceConnectionState}`);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.debug(`Sending ICE candidate to ${peer.id}`);
                this.socket?.emit('iceCandidate', {
                    candidate: event.candidate,
                    target: peer.id,
                });
            } else {
                this.debug(`ICE gathering complete for ${peer.id}`);
            }
        };

        // Store connections
        this.peerConnections.set(peer.id, peerConnection);
        this.dataChannels.set(peer.id, dataChannel);

        // Create and send offer
        try {
            this.debug(`Creating offer for ${peer.id}`);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            this.debug(`Offer created and set for ${peer.id}`);

            this.socket?.emit('webrtcOffer', {
                offer: offer,
                target: peer.id,
            });
            this.debug(`Offer sent to ${peer.id}`);
        } catch (error) {
            this.debug(`Error creating offer for ${peer.id}:`, error);
        }
    };

    // WebRTC Signaling Handlers
    handleWebRTCOffer = async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
        this.debug(`Received offer from host ${data.from}`);
        this.hostId = data.from;

        const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

        // Add connection state logging
        peerConnection.onconnectionstatechange = () => {
            this.debug(`Peer connection state with host: ${peerConnection.connectionState}`);
        };

        peerConnection.oniceconnectionstatechange = () => {
            this.debug(`ICE connection state with host: ${peerConnection.iceConnectionState}`);
        };

        // Handle incoming data channel (non-host receives channel)
        peerConnection.ondatachannel = event => {
            this.debug(`Received data channel from host`);
            const dataChannel = event.channel;

            this.debug(`Data channel state: ${dataChannel.readyState}`);

            dataChannel.onopen = () => {
                this.debug(`Connected to host`);
                if (this.state.role === 'player') {
                    this.createPlayer();
                }
            };

            dataChannel.onmessage = event => {
                this.handlePeerMessage(data.from, event.data);
            };

            dataChannel.onclose = () => {
                this.debug(`Disconnected from host`);
                window.location.reload();
            };

            dataChannel.onerror = error => {
                this.debug(`Data channel error with host:`, error);
            };

            this.dataChannels.set(data.from, dataChannel);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.debug('Sending ICE candidate to host');
                this.socket?.emit('iceCandidate', {
                    candidate: event.candidate,
                    target: data.from,
                });
            }
        };

        this.peerConnections.set(data.from, peerConnection);

        try {
            await peerConnection.setRemoteDescription(data.offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            this.socket?.emit('webrtcAnswer', {
                answer: answer,
                target: data.from,
            });
        } catch (error) {
            this.debug(`Error handling offer from ${data.from}:`, error);
        }
    };

    handleWebRTCAnswer = async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
        this.debug(`Received answer from ${data.from}`);

        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(data.answer);
            } catch (error) {
                this.debug(`Error handling answer from ${data.from}:`, error);
            }
        }
    };

    handleIceCandidate = async (data: { candidate: RTCIceCandidate; from: string }) => {
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(data.candidate);
            } catch (error) {
                this.debug(`Error adding ICE candidate from ${data.from}:`, error);
            }
        }
    };

    handlePeerMessage = async (peerId: string, message: string) => {
        // Parse message
        const data = JSON.parse(message);

        // Update state if non-host viewer
        // TODO: Convert into listeners
        // if (!this.state.host) {
        //     if (data.event === 'updatePlayers') {
        //         await this.updateState({ players: data.payload.players });
        //     } else if (data.event === 'updateViewers') {
        //         await this.updateState({ viewers: data.payload.viewers });
        //     }
        // }

        // Trigger listeners
        this.trigger(data.event, data.payload, peerId);
    };

    sendToPeer = (peerId: string, data: any) => {
        const dataChannel = this.dataChannels.get(peerId);
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify(data));
        } else {
            this.debug(`Cannot send to ${peerId}: channel not open`, { dataChannel });
        }
    };

    // WebRTC methods
    notifyHost = (event: string, payload: any) => {
        if (this.hostId) {
            this.sendToPeer(this.hostId, {
                event,
                payload,
            });
        } else {
            this.debug('Cannot notify host: no host ID');
        }
    };

    notifyPlayers = (event: string, payload: any) => {
        this.state.players.forEach(player => {
            this.sendToPeer(player.id, {
                event,
                payload,
            });
        });
    };

    notifyViewers = (event: string, payload: any) => {
        this.state.viewerIds.forEach(viewerId => {
            this.sendToPeer(viewerId, {
                event,
                payload,
            });
        });
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
        this.debug('Creating player for this client', this.state.id);

        // Create player
        const player: Player = {
            buttons: [false, false],
            color: `#${Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, '0')}`,
            id: this.state.id || '',
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

        // Notify host
        this.notifyHost('addPlayer', player);
    };

    addPlayer = async (player: Player) => {
        this.debug('Add player', player);

        // Update state
        await this.updateState(prevState => ({
            players: [...prevState.players, player],
        }));

        // Notify viewers and trigger event
        this.notifyViewers('addPlayers', [player]);
        this.trigger('addPlayers', [player]);
    };

    removePlayer = async (playerId: string) => {
        this.debug('Remove player', playerId);

        // Update state
        await this.updateState(prevState => ({
            players: prevState.players.filter(p => p.id !== playerId),
        }));

        // Notify viewers and trigger event
        this.notifyViewers('removePlayers', [playerId]);
        this.trigger('removePlayers', [playerId]);
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
            localStorage.setItem('connection.player', JSON.stringify(newState.player));
        }

        // Notify host
        this.notifyHost('updatePlayer', data);
    };

    // Viewers
    addViewer = async (viewerId: string) => {
        this.debug('Add viewer', viewerId);

        // Update state
        await this.updateState(prevState => ({
            viewerIds: [...prevState.viewerIds, viewerId],
        }));

        // Notify viewer
        this.sendToPeer(viewerId, {
            event: 'addPlayers',
            payload: this.state.players,
        });
    };

    render() {
        return <ConnectionContext.Provider value={this.state}>{this.props.children}</ConnectionContext.Provider>;
    }
}

export const ConnectionProvider = compose(withPathname)(Connection);
