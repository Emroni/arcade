'use client';
import { debugClient } from '@/debug';
import { Player } from '@/types';
import { compose } from '@/utils';
import * as PIXI from 'pixi.js';
import { Component, createContext, useContext } from 'react';
import { withSocket } from '../Socket/Socket';
import { GameProviderProps, GameState } from './Game.types';

export const GameContext = createContext<GameState>({} as GameState);

export const useGame = () => useContext(GameContext);

export function withGame(WrappedComponent: any) {
    return function GameWrappedComponent(props: any) {
        return <GameContext.Consumer>{state => <WrappedComponent {...props} game={state} />}</GameContext.Consumer>;
    };
}

class Game extends Component<GameProviderProps, GameState> {
    app: PIXI.Application;

    constructor(props: GameProviderProps) {
        super(props);

        // Create app
        this.app = new PIXI.Application();

        // Initialize state
        this.state = {
            canvas: null,
            players: [],
            mountCanvas: this.mountCanvas,
        };
    }

    componentDidMount = async () => {
        const { socket } = this.props;

        // Initialize app
        await this.app.init({
            antialias: true,
            height: 640,
            width: 640,
        });

        // Add socket listeners
        socket.on('addPlayers', this.handleAddPlayers);
        socket.on('removePlayers', this.handleRemovePlayers);
        socket.on('updatePlayer', this.handleUpdatePlayer);

        // Add canvas to state
        this.setState({
            canvas: this.app.canvas,
        });

        // Start game loop
        this.app.ticker.add(this.tick);
    };

    componentWillUnmount(): void {
        const { socket } = this.props;

        // Remove socket listeners
        socket.off('addPlayers', this.handleAddPlayers);
        socket.off('removePlayers', this.handleRemovePlayers);
        socket.off('updatePlayer', this.handleUpdatePlayer);
    }

    mountCanvas = (container: HTMLDivElement) => {
        container.appendChild(this.app.canvas);
        this.app.resizeTo = container;
    };

    handleAddPlayers = (players: Player[]) => {
        debugClient('player', 'Added', players);
        this.setState(prevState => ({
            players: [...prevState.players, ...players],
        }));
    };

    handleRemovePlayers = (playerIds: string[]) => {
        debugClient('player', 'Removed', playerIds);
        this.setState(prevState => ({
            players: prevState.players.filter(player => !playerIds.includes(player.id)),
        }));
    };

    handleUpdatePlayer = (player: Player) => {
        this.setState(prevState => ({
            players: prevState.players.map(p => {
                if (p.id === player.id) {
                    return {
                        ...p,
                        ...player,
                    };
                }
                return p;
            }),
        }));
    };

    tick = () => {};

    render() {
        return <GameContext.Provider value={this.state}>{this.props.children}</GameContext.Provider>;
    }
}

export const GameProvider = compose(withSocket)(Game);
