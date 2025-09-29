import dotenvFlow from 'dotenv-flow';
import { Server } from 'socket.io';
import * as players from './players';
import * as viewers from './viewers';

dotenvFlow.config();

// Create server
const io = new Server(process.env.SERVER_PORT, {
    cors: {
        origin: '*',
    },
});
console.log(`Server ready on port ${process.env.SERVER_PORT}`);

// Initialize modules
players.init(io);
viewers.init(io);

// Handle connections
io.on('connection', socket => {
    socket.on('disconnect', () => {
        players.unregister(socket);
        viewers.unregister(socket);
    });

    socket.on('registerPlayer', () => {
        players.register(socket);
    });

    socket.on('registerViewer', () => {
        viewers.register(socket, Object.values(players.map));
    });
});
