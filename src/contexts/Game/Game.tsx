'use client';
import { debugClient } from '@/debug';
import { Ship } from '@/game';
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
    shipsContainer: PIXI.Container<Ship>;

    constructor(props: GameProviderProps) {
        super(props);

        // Create app
        this.app = new PIXI.Application();

        // Add ships container
        this.shipsContainer = new PIXI.Container<Ship>();
        this.app.stage.addChild(this.shipsContainer);

        // Initialize state
        this.state = {
            canvas: null,
            players: {},
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

        // Add players to state
        this.setState(prevState => {
            const map = { ...prevState.players };
            players.forEach(player => {
                map[player.id] = player;
            });
            return {
                players: map,
            };
        });

        // Add ships to canvas
        players.forEach(player => {
            const ship = new Ship(this.app, player);
            this.shipsContainer.addChild(ship);
        });
    };

    handleRemovePlayers = (playerIds: string[]) => {
        debugClient('player', 'Removed', playerIds);

        // Remove players from state
        this.setState(prevState => {
            const players = { ...prevState.players };
            playerIds.forEach(playerId => {
                delete players[playerId];
            });
            return {
                players,
            };
        });

        // Remove ships from canvas
        playerIds.forEach(playerId => {
            const ship = this.shipsContainer.getChildByLabel(playerId);
            ship?.removeFromParent();
        });
    };

    handleUpdatePlayer = (data: Partial<Player> & { id: string }) => {
        // Update player in state
        this.setState(prevState => ({
            players: {
                ...prevState.players,
                [data.id]: {
                    ...prevState.players[data.id],
                    ...data,
                },
            },
        }));

        // Update ship
        const ship = this.shipsContainer.children.find(s => s.playerId === data.id);
        ship?.update(data);
    };

    tick = () => {
        // Tick ships
        for (const ship of this.shipsContainer.children) {
            ship.tick();
        }
    };

    render() {
        return <GameContext.Provider value={this.state}>{this.props.children}</GameContext.Provider>;
    }
}

export const GameProvider = compose(withSocket)(Game);
