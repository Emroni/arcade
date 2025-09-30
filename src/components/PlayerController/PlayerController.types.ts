export interface PlayerControllerProps {
    onShowConfig: () => void;
}

export interface PlayerControllerButtons {
    a: boolean;
    b: boolean;
}

export interface PlayerControllerJoystick {
    amount: number;
    angle: number;
    x: number;
    y: number;
}
