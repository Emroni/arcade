'use client';
import { debugClient } from '@/debug';
import { Ship } from '@/game';
import { Player } from '@/types';
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
    background?: PIXI.TilingSprite;
    container: PIXI.Container;
    shipsContainer: PIXI.Container<Ship>;

    constructor(props: GameProviderProps) {
        super(props);

        // Create app
        this.app = new PIXI.Application();

        // Add container
        this.container = new PIXI.Container<Ship>();
        this.app.stage.addChild(this.container);

        // Add ships container
        this.shipsContainer = new PIXI.Container<Ship>();
        this.container.addChild(this.shipsContainer);

        // Initialize state
        this.state = {
            canvas: null,
            mountCanvas: this.mountCanvas,
        };
    }

    componentDidMount = async () => {
        const { connection } = this.props;

        // Initialize app
        await this.app.init();

        // Add background
        this.background = new PIXI.TilingSprite({
            texture: await PIXI.Assets.load('/space.png'),
        });
        this.app.stage.addChildAt(this.background, 0);
        this.background.anchor.set(0.5);

        // Add listeners
        connection.on('host.player.update', this.handleHostPlayerUpdate);
        connection.on('viewers.game.tick', this.handleViewersGameTick);
        connection.on('viewers.players.add', this.handleViewersPlayersAdd);
        connection.on('viewers.players.remove', this.handleViewersPlayersRemove);
        window.addEventListener('resize', this.handleResize);

        // Update state
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

        // Remove listeners
        connection.off('host.player.update', this.handleHostPlayerUpdate);
        connection.off('viewers.game.tick', this.handleViewersGameTick);
        connection.off('viewers.players.add', this.handleViewersPlayersAdd);
        connection.off('viewers.players.remove', this.handleViewersPlayersRemove);
        window.removeEventListener('resize', this.handleResize);
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
        this.handleResize();
    };

    handleResize = () => {
        // Get size and position based on smallest side
        const size = Math.min(this.app.canvas.width, this.app.canvas.height);
        const scale = size / 1000;
        const centerX = this.app.canvas.width / 2;
        const centerY = this.app.canvas.height / 2;

        // Resize background
        this.background!.position.set(centerX, centerY);
        this.background!.height = size;
        this.background!.width = size;

        // Resize container
        this.container.scale.set(scale);
        this.container.position.set(centerX - size / 2, centerY - size / 2);
    };

    handleHostPlayerUpdate = (payload: any, playerId?: string) => {
        // Update ship
        const ship = this.shipsContainer.children.find(s => s.playerId === playerId);
        ship?.update(payload);
    };

    handleViewersPlayersAdd = (players: Player[]) => {
        this.debug('Add players', players);

        // Add ships to canvas
        players.forEach(player => {
            const ship = new Ship(this.app, player);
            this.shipsContainer.addChild(ship);
        });
    };

    handleViewersPlayersRemove = (playerIds: string[]) => {
        this.debug('Remove players', playerIds);

        // Remove ships from canvas
        playerIds.forEach(playerId => {
            const ship = this.shipsContainer.getChildByLabel(playerId);
            ship?.removeFromParent();
        });
    };

    handleViewersGameTick = (payload: GameTickPayload) => {
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
            this.props.connection.notifyViewers('viewers.game.tick', data);
        }
    };

    render() {
        return <GameContext.Provider value={this.state}>{this.props.children}</GameContext.Provider>;
    }
}

export const GameProvider = compose(withConnection)(Game);
