'use client';
import { useConnection } from '@/contexts/Connection/Connection';
import { Cog8ToothIcon } from '@heroicons/react/24/solid';
import _ from 'lodash';
import { TouchEvent, useMemo, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { PlayerControllerButtons, PlayerControllerJoystick, PlayerControllerProps } from './PlayerController.types';

const joystickReset = {
    amount: 0,
    x: 100,
    y: 100,
};

export function PlayerController({ onShowConfig }: PlayerControllerProps) {
    const [buttons, setButtons] = useState<PlayerControllerButtons>({ a: false, b: false });
    const [joystick, setJoystick] = useState<PlayerControllerJoystick>({ ...joystickReset, angle: 0 });
    const connection = useConnection();
    const containerObserver = useResizeObserver();
    const joystickRef = useRef<SVGGElement>(null);

    const joystickRect = useMemo(() => {
        // Get joystick rect
        return (containerObserver.width && joystickRef.current?.getBoundingClientRect()) || new DOMRect();
    }, [containerObserver.width]);

    function handleButton(button: 'a' | 'b', pressed: boolean) {
        // Update buttons state
        const newButtons = {
            ...buttons,
            [button]: pressed,
        };
        setButtons(newButtons);

        // Notify host
        connection.notifyHost('updatePlayer', {
            buttons: [newButtons.a, newButtons.b],
        });
    }

    function handleTouchMove(e: TouchEvent) {
        // Get angle and radius
        const touch = e.touches[0];
        const dX = touch.clientX - joystickRect.x - joystickRect.width / 2;
        const dY = touch.clientY - joystickRect.y - joystickRect.height / 2;
        const angle = Math.atan2(dY, dX);
        const radius = Math.min((Math.sqrt(dX * dX + dY * dY) / (joystickRect.width / 2)) * 100, 60);

        // Get new joystick
        const newJoystick = {
            angle: _.round(angle, 3),
            amount: _.round(Math.max(0, (radius / 60 - 0.3) / 0.7), 3),
            x: radius * Math.sin(-angle + Math.PI / 2) + 100,
            y: radius * Math.cos(angle - Math.PI / 2) + 100,
        };
        setJoystick(newJoystick);

        // Notify host
        connection.notifyHost('updatePlayer', {
            joystick: [newJoystick.amount, newJoystick.angle],
        });
    }

    function handleTouchEnd() {
        // Reset joystick while keeping angle
        const newJoystick = {
            ...joystickReset,
            angle: joystick.angle,
        };
        setJoystick(newJoystick);

        // Notify host
        connection.notifyHost('updatePlayer', {
            joystick: [newJoystick.amount, newJoystick.angle],
        });
    }

    if (!connection.player) {
        return null;
    }

    return (
        <div className="h-screen p-8 relative select-none touch-none" ref={containerObserver.ref}>
            <button className="absolute h-8 left-2 top-2 w-8" onClick={onShowConfig}>
                <Cog8ToothIcon />
            </button>

            <svg height="100%" viewBox="0 0 400 200" width="100%">
                {/* Joystick */}
                <g
                    ref={joystickRef}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchMove}
                    onTouchStart={handleTouchMove}
                >
                    <circle
                        cx={100}
                        cy={100}
                        fill={connection.player.color}
                        fillOpacity={0.2}
                        r={99}
                        stroke={connection.player.color}
                        strokeWidth={1}
                    />
                    <circle cx={100} cy={100} fill="#000000" fillOpacity={0.2} r={60} />
                    <circle cx={joystick.x} cy={joystick.y} fill={connection.player.color} r={40} />
                </g>

                {/* A button */}
                <g onTouchEnd={() => handleButton('a', false)} onTouchStart={() => handleButton('a', true)}>
                    <circle cx={370} cy={70} fill={connection.player.color} fillOpacity={buttons.a ? 0.5 : 1} r={30} />
                    <text dominantBaseline="middle" fill="#000000" fontSize={24} textAnchor="middle" x={370} y={70}>
                        A
                    </text>
                </g>

                {/* B button */}
                <g onTouchEnd={() => handleButton('b', false)} onTouchStart={() => handleButton('b', true)}>
                    <circle cx={300} cy={130} fill={connection.player.color} fillOpacity={buttons.b ? 0.5 : 1} r={30} />
                    <text dominantBaseline="middle" fill="#000000" fontSize={24} textAnchor="middle" x={300} y={130}>
                        B
                    </text>
                </g>
            </svg>
        </div>
    );
}
