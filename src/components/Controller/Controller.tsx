'use client';
import { useSocket } from '@/contexts/Socket/Socket';
import { Point } from '@/types';
import _ from 'lodash';
import { TouchEvent, useRef, useState } from 'react';

export function Controller() {
    const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
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
            const newPosition = {
                x: _.clamp((touch.clientX - touchRect.x) / touchRect.width, 0, 1),
                y: _.clamp((touch.clientY - touchRect.y) / touchRect.height, 0, 1),
            };
            setPosition(newPosition);
            socket.emit('movePlayer', newPosition);
        }
    }

    return (
        <>
            <div
                className="border fixed inset-0 select-none touch-none"
                ref={touchRef}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
            />
            <div
                className="border rounded-full fixed h-6 w-6"
                style={{
                    left: `calc(${position.x * 100}% - 12px)`,
                    top: `calc(${position.y * 100}% - 12px)`,
                }}
            />
        </>
    );
}
