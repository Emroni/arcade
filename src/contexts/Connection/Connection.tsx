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
            viewers: [],
            emit: this.emit,
            on: this.on,
            off: this.off,
            sendToHost: this.sendToHost,
            sendToPeer: this.sendToPeer,
            sendToAllPeers: this.sendToAllPeers,
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
                role: this.props.pathname.startsWith('/player') ? 'player' : 'viewer',
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

    debug = (message: string, ...args: any[]) => {
        debugClient('connection', message, ...args);
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
        this.setState(prev => ({
            players: prev.players.filter(id => id !== data.id),
            viewers: prev.viewers.filter(id => id !== data.id),
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

        dataChannel.onopen = () => {
            this.debug(`Data channel open with ${peerId}`);
            this.setState(prev => ({
                players: role === 'player' ? [...prev.players, peerId] : prev.players,
                viewers: role === 'viewer' ? [...prev.viewers, peerId] : prev.viewers,
            }));
        };

        dataChannel.onmessage = event => {
            this.debug(`Message from ${peerId}:`, event.data);
            this.handlePeerMessage(peerId, event.data);
        };

        dataChannel.onclose = () => {
            this.debug(`Data channel closed with ${peerId}`);
            this.setState(prev => ({
                viewers: prev.viewers.filter(id => id !== peerId),
            }));
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
                // this.setState(prev => ({
                //     viewers: [...prev.viewers, data.from],
                // }));
            };

            dataChannel.onmessage = event => {
                this.debug(`Message from host:`, event.data);
                this.handlePeerMessage(data.from, event.data);
            };

            dataChannel.onclose = () => {
                this.debug(`Disconnected from host`);
                // TODO: Is this needed?
                // this.setState(prev => ({
                //     viewers: prev.viewers.filter(id => id !== data.from),
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

    // Peer Message Handling
    handlePeerMessage = (peerId: string, data: string) => {
        try {
            const message = JSON.parse(data);
            this.debug(`Message from ${peerId}:`, message);

            // Emit as custom event for components to listen to
            this.socket?.emit('peer-message', { from: peerId, data: message });
        } catch (error) {
            this.debug(`Error parsing message from ${peerId}:`, error);
        }
    };

    // WebRTC Methods
    sendToHost = (data: any) => {
        if (this.hostId) {
            this.sendToPeer(this.hostId, data);
        } else {
            this.debug('No host to send to');
        }
    };

    sendToPeer = (peerId: string, data: any) => {
        const dataChannel = this.dataChannels.get(peerId);
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify(data));
        } else {
            this.debug(`Cannot send to ${peerId}: channel not open`, { dataChannel });
        }
    };

    sendToAllPeers = (data: any) => {
        const message = JSON.stringify(data);
        this.dataChannels.forEach((dataChannel, peerId) => {
            if (dataChannel.readyState === 'open') {
                dataChannel.send(message);
            } else {
                this.debug(`Cannot send to ${peerId}: channel not open`, { dataChannel });
            }
        });
    };

    // Socket methods
    emit = (event: string, data: any) => {
        this.socket?.emit(event, data);
    };

    on = (event: string, listener: ConnectionListener) => {
        this.socket?.on(event, listener);
    };

    off = (event: string, listener: ConnectionListener) => {
        this.socket?.off(event, listener);
    };

    render() {
        return <ConnectionContext.Provider value={this.state}>{this.props.children}</ConnectionContext.Provider>;
    }
}

export const ConnectionProvider = compose(withPathname)(Connection);
