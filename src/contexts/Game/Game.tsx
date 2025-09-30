'use client';
import { debugClient } from '@/debug';
import { Ship } from '@/game';
import { compose } from '@/utils';
import * as PIXI from 'pixi.js';
import { Component, createContext, useContext } from 'react';
import { withConnection } from '../Connection/Connection';
import { GameProviderProps, GameState, GameTickPayload } from './Game.types';

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

        // Add connection listeners
        connection.on('addPlayers', this.handleAddPlayers);
        connection.on('removePlayers', this.handleRemovePlayers);
        connection.on('updatePlayer', this.handleUpdatePlayer);
        connection.on('gameTick', this.handleGameTick);

        // Add canvas to state
        this.setState({
            canvas: this.app.canvas,
        });

        // Start game loop
        if (this.props.connection.host) {
            this.app.ticker.add(this.tick);
        }
    };

    componentWillUnmount() {
        const { connection } = this.props;

        // Remove connection listeners
        connection.off('addPlayers', this.handleAddPlayers);
        connection.off('removePlayers', this.handleRemovePlayers);
        connection.off('updatePlayer', this.handleUpdatePlayer);
    }

    debug = (message: string, ...args: any[]) => {
        debugClient('game', message, ...args);
    };

    updateState = async (
        newState: Partial<GameState> | ((prevState: GameState) => Partial<GameState> | null) | null
    ) => {
        return new Promise<GameState>(resolve => {
            this.setState(newState as GameState, () => {
                resolve(this.state);
            });
        });
    };

    mountCanvas = (container: HTMLDivElement) => {
        container.appendChild(this.app.canvas);
        this.app.resizeTo = container;
    };

    handleAddPlayers = (playerIds: string[]) => {
        this.debug('Add players', playerIds);

        // Add ships to canvas
        playerIds.forEach(playerId => {
            const ship = new Ship(this.app, playerId);
            this.shipsContainer.addChild(ship);
        });
    };

    handleRemovePlayers = (playerIds: string[]) => {
        this.debug('Remove players', playerIds);

        // Remove ships from canvas
        playerIds.forEach(playerId => {
            const ship = this.shipsContainer.getChildByLabel(playerId);
            ship?.removeFromParent();
        });
    };

    handleUpdatePlayer = (payload: any, playerId?: string) => {
        // Update ship
        const ship = this.shipsContainer.children.find(s => s.playerId === playerId);
        ship?.update(payload);
    };

    handleGameTick = (payload: GameTickPayload) => {
        // Set ships
        this.shipsContainer.children.map(ship => {
            const shipData = payload.ships[ship.playerId];
            if (shipData) {
                ship.set(shipData);
            }
        });
    };

    tick = () => {
        // Tick ships
        for (const ship of this.shipsContainer.children) {
            ship.tick();
        }

        // Notify viewers
        if (this.props.connection.host) {
            const data: GameTickPayload = {
                ships: Object.fromEntries(this.shipsContainer.children.map(ship => [ship.playerId, ship.get()])),
            };
            this.props.connection.notifyViewers('gameTick', data);
        }
    };

    render() {
        return <GameContext.Provider value={this.state}>{this.props.children}</GameContext.Provider>;
    }
}

export const GameProvider = compose(withConnection)(Game);
