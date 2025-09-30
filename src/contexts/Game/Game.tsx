'use client';
import { debugClient } from '@/debug';
import { Ship } from '@/game';
import { Player } from '@/types';
import { compose } from '@/utils';
import * as PIXI from 'pixi.js';
import { Component, createContext, useContext } from 'react';
import { withConnection } from '../Connection/Connection';
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
        const { connection } = this.props;

        // Initialize app
        await this.app.init({
            antialias: true,
            height: 640,
            width: 640,
        });

        // Add socket listeners
        connection.on('addPlayers', this.handleAddPlayers);
        connection.on('removePlayers', this.handleRemovePlayers);
        connection.on('updatePlayer', this.handleUpdatePlayer);

        // Add canvas to state
        this.setState({
            canvas: this.app.canvas,
        });

        // Start game loop
        this.app.ticker.add(this.tick);
    };

    componentWillUnmount(): void {
        const { connection } = this.props;

        // Remove socket listeners
        connection.off('addPlayers', this.handleAddPlayers);
        connection.off('removePlayers', this.handleRemovePlayers);
        connection.off('updatePlayer', this.handleUpdatePlayer);
    }

    mountCanvas = (container: HTMLDivElement) => {
        container.appendChild(this.app.canvas);
        this.app.resizeTo = container;
    };

    handleAddPlayers = (players: Player[]) => {
        debugClient('game', 'Added players', players);

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
        debugClient('game', 'Removed players', playerIds);

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

export const GameProvider = compose(withConnection)(Game);
