import * as readline from 'readline';
import fs from 'fs/promises';
// import { ApiClient } from '@point/api';
import { ApiClient } from './src/index';

// const url = 'http://localhost:7788';
const url = 'https://api.dev.point.study';

const user = {
    email: 'my.name.is.dimitry@gmail.com',
    password: '1',
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

const question = async (q): Promise<string> => new Promise((r) => rl.question(q, r));

const f = async (name, func) => {
    console.log(`>>> ${name}`);

    const res = await func;

    console.log(`<<<`, JSON.stringify(res, null, '  '), '\n');

    return res;
};

// examples flow

const client = new ApiClient({ url });

await f('Register new user', client.registerNewUser(user));

const code = await question('Enter code from e-mail: ');

await f('Email confirmation', client.checkRegisteredEmail({ email: user.email, code }));

const { refresh } = await f(
    'Get token',
    client.login({ email: user.email, password: user.password })
);

const { id: userId } = await f(
    'Renew access token by refresh',
    client.refreshAccessToken({ refresh })
);

await f('Register the same user, example of error', client.registerNewUser(user));

await f(
    'Get 2 users on first page, only id and login fields, sort by time created desc',
    client.getUsers({
        _limit: 2,
        _page: 1,
        _fields: 'id,login',
        _sort: '-timeCreated',
    })
);

await f(
    'Update user profile',
    client.updateUserById(
        { id: userId },
        {
            firstName: 'Test',
            secondName: 'User',
            biography: 'I am first user',
            timezone: 'Europe/London',
            avatar: './avatar.png',
        }
    )
);

const content = await fs.readFile('./avatar.png');
const avatar = new Blob([new Uint8Array(content)]);

await f('Another way to update avatar', client.updateUserById({ id: userId }, { avatar }));

await f('Get information about owner of token', client.getMeInUsers({}));

await f('Get information about user by userId', client.getUsersById({ id: userId }));

await f('Delete user', client.deleteUserById({ id: userId }));

await f('Get information about user by userId', client.getUsersById({ id: userId }));

await f('Get list of timezones', client.getTimezones({ _limit: 5, _sort: 'name' }));

await f(
    'Search "europe k" timezone',
    client.getTimezones({ _search: 'europe k', _fields: 'name', _limit: 1 })
);

// const googleCallbackUrl = await question(`Open ${url}/login/google and paste result URL here: `);
// const [, query] = googleCallbackUrl.match(/^.*?\?(.*)/) || [];
// const g = query.split('&').reduce((acc, cur) => {
//     const m = cur.match(/^(.*?)=(.*)$/);
//     acc[m[1]] = m[2];
//     return acc;
// }, {});

// await f('Get google login', client.postGoogleData(g));

rl.close();
