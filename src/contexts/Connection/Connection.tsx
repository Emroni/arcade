'use client';
import { debugClient } from '@/debug';
import { withPathname } from '@/hooks';
import { compose } from '@/utils';
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
            players: [],
            role: this.props.pathname.startsWith('/player') ? 'player' : 'viewer',
            viewers: [],
            notifyHost: this.notifyHost,
            notifyPlayers: this.notifyPlayers,
            notifyViewers: this.notifyViewers,
            off: this.off,
            on: this.on,
            trigger: this.trigger,
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

        // Add client listeners
        this.socket.on('addPeer', this.handleAddPeer);
        this.socket.on('connect', this.handleConnect);
        this.socket.on('disconnect', this.handleDisconnect);
        this.socket.on('removePeer', this.handleRemovePeer);
        this.socket.on('setHost', this.handleSetHost);

        // Add WebRTC signaling listeners
        this.socket.on('webrtcOffer', this.handleWebRTCOffer);
        this.socket.on('webrtcAnswer', this.handleWebRTCAnswer);
        this.socket.on('iceCandidate', this.handleIceCandidate);
    }

    componentWillUnmount() {
        // Close all peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.dataChannels.clear();

        // Disconnect client
        this.socket?.disconnect();
    }

    componentDidUpdate(_prevProps: Readonly<ConnectionProviderProps>, prevState: Readonly<ConnectionState>) {
        const { players, role } = this.state;

        if (role === 'viewer') {
            // Check players
            if (players.join() !== prevState.players.join()) {
                // Check for added players
                const addedPlayers = players.filter(id => !prevState.players.includes(id));
                if (addedPlayers.length) {
                    this.trigger('addPlayers', addedPlayers);
                }

                // Check for removed players
                const removedPlayers = prevState.players.filter(id => !players.includes(id));
                if (removedPlayers.length) {
                    this.trigger('removePlayers', removedPlayers);
                }
            }
        }
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
    handleAddPeer = (data: { id: string; role: string }) => {
        this.debug('Add peer', data);

        // If we're the host, create connection to this new peer
        if (this.state.host) {
            this.createPeerConnection(data.id, data.role);
        }
    };

    handleRemovePeer = (data: { id: string; role: string }) => {
        this.debug('Remove peer', data);

        // Close and remove peer connection
        const peerConnection = this.peerConnections.get(data.id);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(data.id);
        }

        this.dataChannels.delete(data.id);

        // Update state
        this.setState(prevState => ({
            players: prevState.players.filter(id => id !== data.id),
            viewers: prevState.viewers.filter(id => id !== data.id),
        }));
    };

    // WebRTC Connection Management
    createPeerConnection = async (peerId: string, role: string) => {
        this.debug(`Creating connection to ${role} peer: ${peerId}`);

        const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

        // Create data channel (host creates the channel)
        const dataChannel = peerConnection.createDataChannel('game', {
            ordered: true,
        });

        this.debug(`Data channel created for ${peerId}, initial state: ${dataChannel.readyState}`);

        dataChannel.onopen = async () => {
            this.debug(`Data channel open with ${peerId}`);
            await this.updateState(prevState => ({
                players: role === 'player' ? [...prevState.players, peerId] : prevState.players,
                viewers: role === 'viewer' ? [...prevState.viewers, peerId] : prevState.viewers,
            }));
            this.notifyViewers('updatePlayers', {
                players: this.state.players,
            });
            this.notifyViewers('updateViewers', {
                viewers: this.state.viewers,
            });
        };

        dataChannel.onmessage = event => {
            this.handlePeerMessage(peerId, event.data);
        };

        dataChannel.onclose = async () => {
            this.debug(`Data channel closed with ${peerId}`);
            await this.updateState(prevState => ({
                viewers: prevState.viewers.filter(id => id !== peerId),
            }));
            this.notifyViewers('updateViewers', {
                viewers: this.state.viewers,
            });
        };

        dataChannel.onerror = error => {
            this.debug(`Data channel error with ${peerId}:`, error);
        };

        // Add connection state change logging
        peerConnection.onconnectionstatechange = () => {
            this.debug(`Peer connection state with ${peerId}: ${peerConnection.connectionState}`);
        };

        peerConnection.oniceconnectionstatechange = () => {
            this.debug(`ICE connection state with ${peerId}: ${peerConnection.iceConnectionState}`);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.debug(`Sending ICE candidate to ${peerId}`);
                this.socket?.emit('iceCandidate', {
                    candidate: event.candidate,
                    target: peerId,
                });
            } else {
                this.debug(`ICE gathering complete for ${peerId}`);
            }
        };

        // Store connections
        this.peerConnections.set(peerId, peerConnection);
        this.dataChannels.set(peerId, dataChannel);

        // Create and send offer
        try {
            this.debug(`Creating offer for ${peerId}`);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            this.debug(`Offer created and set for ${peerId}`);

            this.socket?.emit('webrtcOffer', {
                offer: offer,
                target: peerId,
            });
            this.debug(`Offer sent to ${peerId}`);
        } catch (error) {
            this.debug(`Error creating offer for ${peerId}:`, error);
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
                // TODO: Is this needed?
                // this.setState(prevState => ({
                //     viewers: [...prevState.viewers, data.from],
                // }));
            };

            dataChannel.onmessage = event => {
                this.handlePeerMessage(data.from, event.data);
            };

            dataChannel.onclose = () => {
                this.debug(`Disconnected from host`);
                // TODO: Is this needed?
                // this.setState(prevState => ({
                //     viewers: prevState.viewers.filter(id => id !== data.from),
                // }));
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
        if (!this.state.host) {
            if (data.event === 'updatePlayers') {
                await this.updateState({ players: data.payload.players });
            } else if (data.event === 'updateViewers') {
                await this.updateState({ viewers: data.payload.viewers });
            }
        }

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
        this.state.players.forEach(id => {
            this.sendToPeer(id, {
                event,
                payload,
            });
        });
    };

    notifyViewers = (event: string, payload: any) => {
        this.state.viewers.forEach(id => {
            this.sendToPeer(id, {
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

    trigger = (event: string, payload: any, peerId?: string) => {
        // Call event listeners
        this.listeners[event]?.forEach(listener => {
            listener(payload, peerId);
        });
    };

    render() {
        return <ConnectionContext.Provider value={this.state}>{this.props.children}</ConnectionContext.Provider>;
    }
}

export const ConnectionProvider = compose(withPathname)(Connection);
