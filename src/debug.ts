import _ from 'lodash';

const clientTypes: Record<string, string> = {
    player: '#0099ff',
    socket: '#fff700',
    viewer: '#aa00aa',
};

const serverTypes: Record<string, string> = {
    player: '\x1b[36m',
    socket: '\x1b[33m',
    viewer: '\x1b[35m',
};

export function debugClient(type: string, message: string, ...rest: any) {
    // Check if type is enabled by getting color
    const color = clientTypes[type];
    if (!color) {
        return;
    }

    // Log message
    const name = _.upperFirst(type);
    const data = [...rest].filter(item => item !== undefined);
    console.log(`%c[${name}]`, `color: ${color}`, message, ...data);
}

export function debugServer(type: string, message: string, ...rest: any) {
    // Check if type is enabled
    const color = serverTypes[type];
    if (!color) {
        return;
    }

    // Log message
    const name = _.upperFirst(type);
    const data = [...rest].filter(item => item !== undefined);
    console.log(`${color}[${name}]\x1b[0m`, message, ...data);
}
