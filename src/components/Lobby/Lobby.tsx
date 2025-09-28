'use client';
import { useSocket } from '@/contexts/Socket/Socket';
import _ from 'lodash';
import { TouchEvent, useRef, useState } from 'react';

export function Lobby() {
    const [touchRect, setTouchRect] = useState<DOMRect | null>(null);
    const socket = useSocket();
    const touchRef = useRef<HTMLDivElement>(null);

    function handleTouchStart(e: TouchEvent) {
        const newTouchRect = touchRef.current?.getBoundingClientRect();
        setTouchRect(newTouchRect || null);
        handleTouchMove(e);
    }

    function handleTouchMove(e: TouchEvent) {
        if (touchRect) {
            const touch = e.touches[0];
            const x = _.clamp((touch.clientX - touchRect.x) / touchRect.width, 0, 1);
            const y = _.clamp((touch.clientY - touchRect.y) / touchRect.height, 0, 1);
            socket.emit('move', { x, y });
        }
    }

    return (
        <div className="flex flex-col gap-4 p-4">
            <div
                className="border h-50 select-none touch-none"
                ref={touchRef}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
            />
            <div>
                <div>Players: {socket.players.length}</div>
                <ol className="list-decimal list-inside">
                    {socket.players.map(player => (
                        <li key={player.id}>
                            {player.x.toFixed(3)}, {player.y.toFixed(3)}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}
