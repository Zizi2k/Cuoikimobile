const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
process.env.QLPT_API_SECRET = crypto.randomBytes(32).toString('hex');
process.env.QLPT_REALTIME_SECRET = crypto.randomBytes(32).toString('hex');
const { verifyToken, authMiddleware } = require('../src/auth');
const { setupUserRooms, handleJoinRoom } = require('../src/rooms');
const sign = (payload) => Buffer.from(payload).toString('base64url') + '.' +
  crypto.createHmac('sha256', process.env.QLPT_API_SECRET).update(payload).digest('hex');
const expiry = Math.floor(Date.now() / 1000) + 60;

test('requires both independent server secrets before startup', () => {
  for (const key of ['QLPT_API_SECRET', 'QLPT_REALTIME_SECRET']) {
    const result = spawnSync(process.execPath, ['-e', "require('./src/config')"], {
      cwd: require('node:path').resolve(__dirname, '..'), env: { ...process.env, [key]: '' }
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr.toString(), new RegExp(key));
  }
});
test('accepts a signed role-bound PHP token', () => {
  assert.deepEqual(verifyToken(sign(`7.admin.${expiry}`)).user, { id: 7, role: 'admin' });
  assert.deepEqual(verifyToken(sign(`8.tenant.${expiry}`)).user, { id: 8, role: 'tenant' });
});
test('rejects malformed, expired, legacy and tampered tokens', () => {
  for (const payload of [`7.admin.NaN`, `7.admin.0`, `7.admin.${Math.floor(Date.now()/1000)}`,
    `7.superadmin.${expiry}`, `7.${expiry}`, `7x.admin.${expiry}`, `0.tenant.${expiry}`]) {
    assert.equal(verifyToken(sign(payload)).valid, false, payload);
  }
  assert.equal(verifyToken(sign(`7.tenant.${expiry}`) + 'x').valid, false);
  assert.equal(verifyToken('bad').valid, false);
});
test('rejects a handshake without a token', () => {
  authMiddleware({ handshake: { auth: {} } }, (err) => assert.match(err.message, /required/));
});
test('isolates tenant rooms and denies foreign private/admin rooms', () => {
  const joined = [];
  const socket = { user: { id: 8, role: 'tenant' }, join: (room) => joined.push(room) };
  setupUserRooms(socket);
  assert.deepEqual(joined, ['user_8', 'tenant']);
  for (const room of ['admin', 'user_7']) {
    handleJoinRoom(socket, room, (res) => assert.equal(res.success, false));
  }
  assert.deepEqual(joined, ['user_8', 'tenant']);
});
