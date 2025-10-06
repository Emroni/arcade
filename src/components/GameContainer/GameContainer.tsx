import { useGame } from '@/contexts/Game/Game';
import { createRef, useEffect } from 'react';

export function GameContainer() {
    const game = useGame();
    const containerRef = createRef<HTMLDivElement>();

    useEffect(() => {
        // Mount canvas
        if (containerRef.current && !containerRef.current.children.length && game.canvas) {
            game.mountCanvas(containerRef.current);
        }
    }, [game, containerRef]);

    return (
        <div className="flex-1 relative">
            <div className="absolute inset-0" ref={containerRef} />
        </div>
    );
}
