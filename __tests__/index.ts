import { strict as assert } from 'node:assert';
import { ApiClient } from '../src/index';

test('Create new ApiClient object', () => {
    new ApiClient({ url: 'https://api.dev.point.study' });
    assert(true);
});
