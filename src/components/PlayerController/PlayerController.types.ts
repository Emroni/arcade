export interface PlayerControllerProps {
    onShowConfig: () => void;
}

export interface PlayerControllerJoystick {
    amount: number;
    angle: number;
    x: number;
    y: number;
}
