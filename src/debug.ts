import _ from 'lodash';

const clientColors: Record<string, string> = {
    socket: '#fff700',
};

const serverColors: Record<string, string> = {
    player: '\x1b[33m', // Yellow
    room: '\x1b[34m', // Blue
};

const clientEnabled = ['socket'];

const serverEnabled = ['player', 'room'];

export function debugClient(type: string, message: string, ...rest: any) {
    // Check if type is enabled
    if (!clientEnabled.includes(type)) {
        return;
    }

    // Log message
    const name = _.upperFirst(type);
    const data = [...rest].filter(item => item !== undefined);
    const params = [`%c[${name}]`, `color: ${clientColors[type]}`, message, ...data];
    console.log.apply(console, params);
}

export function debugServer(type: string, message: string, ...rest: any) {
    // Check if type is enabled
    if (!serverEnabled.includes(type)) {
        return;
    }

    // Log message
    const name = _.upperFirst(type);
    const data = [...rest].filter(item => item !== undefined);
    const params = [`${serverColors[type]}[${name}]\x1b[0m`, message, ...data];
    console.log.apply(console, params);
}
