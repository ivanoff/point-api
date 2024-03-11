import * as readline from 'readline';
// import { ApiClient } from '@point/api';
import { ApiClient } from './src/index';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
});

// async function question(q): Promise<string> {
//     return new Promise((resolve) => rl.question(q, resolve));
// }

const question = async (q): Promise<string> => new Promise((r) => rl.question(q, r));

const user = {
    // email: '2@ivanoff.org.ua',
    email: 'my.name.is.dimitry@gmail.com',
    login: 'ivanoff',
    password: '1',
};

const f = async (name, func) => {
    console.log(`>>> ${name}`);

    const res = await func;

    console.log(`<<<`, JSON.stringify(res, null, '  '), '\n');

    return res;
};

// examples flow

const client = new ApiClient({ url: 'https://api.dev.point.study' });

const { id: userId } = await f('Register new user', client.registerNewUser(user));

const code = await question('Enter code from e-mail: ');

await f('Email confirmation', client.checkRegisteredEmail({ email: user.email, code }));

const { refresh } = await f(
    'Get token',
    client.login({ email: user.email, password: user.password })
);

await f('Renew access token by refresh', client.refreshAccessToken({ refresh }));

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

await f('Get information about owner of token', client.getMeInUsers({}));

await f('Get information about user by userId', client.getUsersById({ Id: userId }));

await f('Delete user', client.deleteUserById({ Id: userId }));

await f('Get information about user by userId', client.getUsersById({ Id: userId }));

rl.close();
