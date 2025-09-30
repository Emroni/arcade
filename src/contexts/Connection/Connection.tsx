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
    client: Socket | null = null;
    dataChannels: Map<string, RTCDataChannel> = new Map();
    hostId: string | null = null;
    peerConnections: Map<string, RTCPeerConnection> = new Map();

    constructor(props: ConnectionProviderProps) {
        super(props);

        // Initial state
        this.state = {
            connected: false,
            connecting: true,
            host: false,
            id: null,
            connectedPeers: [],
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
        this.client = io(process.env.NEXT_PUBLIC_SERVER_PATH, {
            query: {
                role: this.props.pathname.startsWith('/player') ? 'player' : 'viewer',
            },
        });

        // Add client listeners
        this.client.on('addPeer', this.handleAddPeer);
        this.client.on('connect', this.handleConnect);
        this.client.on('disconnect', this.handleDisconnect);
        this.client.on('removePeer', this.handleRemovePeer);
        this.client.on('setHost', this.handleSetHost);

        // Add WebRTC signaling listeners
        this.client.on('webrtcOffer', this.handleWebRTCOffer);
        this.client.on('webrtcAnswer', this.handleWebRTCAnswer);
        this.client.on('iceCandidate', this.handleIceCandidate);
    }

    componentWillUnmount() {
        // Close all peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.dataChannels.clear();

        // Disconnect client
        this.client?.disconnect();
    }

    // Connection handlers
    handleConnect = () => {
        debugClient('connection', 'Connected');
        this.setState({
            connected: true,
            connecting: false,
            id: this.client?.id || null,
        });
    };

    handleDisconnect = () => {
        debugClient('connection', 'Disconnected');
        this.setState({
            connected: false,
            connecting: false,
            id: null,
        });
    };

    handleSetHost = () => {
        debugClient('connection', 'Set as host');
        this.setState({
            host: true,
        });

        // Initialize as host - ready to accept connections
        this.initializeAsHost();
    };

    initializeAsHost = () => {
        debugClient('connection', 'Initialized as host, ready to accept connections');
        // Host is now ready to create connections when peers are added
    };

    // Peer connection handlers
    handleAddPeer = (socketId: string) => {
        debugClient('connection', 'Add peer', socketId);

        // If we're the host, create connection to this new peer
        if (this.state.host) {
            this.createPeerConnection(socketId);
        }
    };

    handleRemovePeer = (socketId: string) => {
        debugClient('connection', 'Remove peer', socketId);

        // Close and remove peer connection
        const peerConnection = this.peerConnections.get(socketId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(socketId);
        }

        this.dataChannels.delete(socketId);

        // Update state
        this.setState(prev => ({
            connectedPeers: prev.connectedPeers.filter(id => id !== socketId),
        }));
    };

    // WebRTC Connection Management
    createPeerConnection = async (peerId: string) => {
        debugClient('connection', `Creating connection to peer: ${peerId}`);

        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // Create data channel (host creates the channel)
        const dataChannel = peerConnection.createDataChannel('game', {
            ordered: true,
        });

        debugClient('connection', `Data channel created for ${peerId}, initial state: ${dataChannel.readyState}`);

        dataChannel.onopen = () => {
            debugClient('connection', `Data channel open with ${peerId}`);
            this.setState(prev => ({
                connectedPeers: [...prev.connectedPeers, peerId],
            }));
        };

        dataChannel.onmessage = event => {
            debugClient('connection', `Message from ${peerId}:`, event.data);
            this.handlePeerMessage(peerId, event.data);
        };

        dataChannel.onclose = () => {
            debugClient('connection', `Data channel closed with ${peerId}`);
            this.setState(prev => ({
                connectedPeers: prev.connectedPeers.filter(id => id !== peerId),
            }));
        };

        dataChannel.onerror = error => {
            debugClient('connection', `Data channel error with ${peerId}:`, error);
        };

        // Add connection state change logging
        peerConnection.onconnectionstatechange = () => {
            debugClient('connection', `Peer connection state with ${peerId}: ${peerConnection.connectionState}`);
        };

        peerConnection.oniceconnectionstatechange = () => {
            debugClient('connection', `ICE connection state with ${peerId}: ${peerConnection.iceConnectionState}`);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                debugClient('connection', `Sending ICE candidate to ${peerId}`);
                this.client?.emit('iceCandidate', {
                    candidate: event.candidate,
                    target: peerId,
                });
            } else {
                debugClient('connection', `ICE gathering complete for ${peerId}`);
            }
        };

        // Store connections
        this.peerConnections.set(peerId, peerConnection);
        this.dataChannels.set(peerId, dataChannel);

        // Create and send offer
        try {
            debugClient('connection', `Creating offer for ${peerId}`);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            debugClient('connection', `Offer created and set for ${peerId}`);

            this.client?.emit('webrtcOffer', {
                offer: offer,
                target: peerId,
            });
            debugClient('connection', `Offer sent to ${peerId}`);
        } catch (error) {
            debugClient('connection', `Error creating offer for ${peerId}:`, error);
        }
    };

    // WebRTC Signaling Handlers
    handleWebRTCOffer = async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
        debugClient('connection', `Received offer from ${data.from}`);
        this.hostId = data.from;
        debugClient('connection', `Host ID set to: ${this.hostId}`);

        const peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // Add connection state logging
        peerConnection.onconnectionstatechange = () => {
            debugClient(
                'connection',
                `Peer connection state with host ${data.from}: ${peerConnection.connectionState}`
            );
        };

        peerConnection.oniceconnectionstatechange = () => {
            debugClient(
                'connection',
                `ICE connection state with host ${data.from}: ${peerConnection.iceConnectionState}`
            );
        };

        // Handle incoming data channel (non-host receives channel)
        peerConnection.ondatachannel = event => {
            debugClient('connection', `Received data channel from host ${data.from}`);
            const dataChannel = event.channel;

            debugClient('connection', `Data channel state: ${dataChannel.readyState}`);

            dataChannel.onopen = () => {
                debugClient('connection', `Connected to host ${data.from}`);
                this.setState(prev => ({
                    connectedPeers: [...prev.connectedPeers, data.from],
                }));
            };

            dataChannel.onmessage = event => {
                debugClient('connection', `Message from host ${data.from}:`, event.data);
                this.handlePeerMessage(data.from, event.data);
            };

            dataChannel.onclose = () => {
                debugClient('connection', `Disconnected from host ${data.from}`);
                this.setState(prev => ({
                    connectedPeers: prev.connectedPeers.filter(id => id !== data.from),
                }));
            };

            dataChannel.onerror = error => {
                debugClient('connection', `Data channel error with host ${data.from}:`, error);
            };

            this.dataChannels.set(data.from, dataChannel);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                debugClient('connection', 'Sending ICE candidate to host');
                this.client?.emit('iceCandidate', {
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

            this.client?.emit('webrtcAnswer', {
                answer: answer,
                target: data.from,
            });
        } catch (error) {
            debugClient('connection', `Error handling offer from ${data.from}:`, error);
        }
    };

    handleWebRTCAnswer = async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
        debugClient('connection', `Received answer from ${data.from}`);

        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
            try {
                await peerConnection.setRemoteDescription(data.answer);
            } catch (error) {
                debugClient('connection', `Error handling answer from ${data.from}:`, error);
            }
        }
    };

    handleIceCandidate = async (data: { candidate: RTCIceCandidate; from: string }) => {
        const peerConnection = this.peerConnections.get(data.from);
        if (peerConnection) {
            try {
                await peerConnection.addIceCandidate(data.candidate);
            } catch (error) {
                debugClient('connection', `Error adding ICE candidate from ${data.from}:`, error);
            }
        }
    };

    // Peer Message Handling
    handlePeerMessage = (peerId: string, data: string) => {
        try {
            const message = JSON.parse(data);
            debugClient('connection', `Message from ${peerId}:`, message);

            // Emit as custom event for components to listen to
            this.client?.emit('peer-message', { from: peerId, data: message });
        } catch (error) {
            debugClient('connection', `Error parsing message from ${peerId}:`, error);
        }
    };

    // WebRTC Methods
    sendToHost = (data: any) => {
        if (this.hostId) {
            this.sendToPeer(this.hostId, data);
        } else {
            debugClient('connection', 'No host to send to');
        }
    };

    sendToPeer = (peerId: string, data: any) => {
        const dataChannel = this.dataChannels.get(peerId);
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify(data));
        } else {
            debugClient('connection', `Cannot send to ${peerId}: channel not open`, { dataChannel });
        }
    };

    sendToAllPeers = (data: any) => {
        const message = JSON.stringify(data);
        this.dataChannels.forEach((dataChannel, peerId) => {
            if (dataChannel.readyState === 'open') {
                dataChannel.send(message);
            } else {
                debugClient('connection', `Cannot send to ${peerId}: channel not open`, { dataChannel });
            }
        });
    };

    // Socket methods
    emit = (event: string, data: any) => {
        this.client?.emit(event, data);
    };

    on = (event: string, listener: ConnectionListener) => {
        this.client?.on(event, listener);
    };

    off = (event: string, listener: ConnectionListener) => {
        this.client?.off(event, listener);
    };

    render() {
        return <ConnectionContext.Provider value={this.state}>{this.props.children}</ConnectionContext.Provider>;
    }
}

export const ConnectionProvider = compose(withPathname)(Connection);
