const crypto = require('crypto');
const config = require('../config');

/**
 * Verify token issued by PHP backend.
 * Token format: base64url(payload).hmac_sha256(payload, secret)
 * payload: userId.expiresAt or userId.role.expiresAt
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing or invalid format' };
  }

  // Remove optional Bearer prefix
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const parts = cleanToken.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed token structure' };
  }

  const [encodedPayload, signature] = parts;

  // Base64url decode
  let payloadStr;
  try {
    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    payloadStr = Buffer.from(base64 + pad, 'base64').toString('utf8');
  } catch (err) {
    return { valid: false, error: 'Failed to decode payload' };
  }

  // Verify HMAC SHA256 signature
  const expectedSig = crypto
    .createHmac('sha256', config.API_SECRET)
    .update(payloadStr)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: 'Invalid token signature' };
  }

  const bits = /^([1-9][0-9]*)\.(admin|tenant)\.([0-9]+)$/.exec(payloadStr);
  if (!bits) return { valid: false, error: 'Invalid payload content' };
  const userId = Number(bits[1]);
  const role = bits[2];
  const expiresAt = Number(bits[3]);
  if (!Number.isSafeInteger(userId) || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return { valid: false, error: 'Invalid user id or token expiry' };
  }

  return {
    valid: true,
    user: {
      id: userId,
      role: role || 'tenant'
    }
  };
}

/**
 * Socket.IO authentication middleware for handshake
 */
async function authMiddleware(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization ||
    socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Authentication required: Token missing'));
  }

  const result = verifyToken(token);
  if (!result.valid) {
    return next(new Error(`Authentication failed: ${result.error}`));
  }

  // Check account status and current role with PHP, not only the signed token.
  try {
    const response = await fetch(config.API_BASE + 'session', {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000)
    });
    const data = await response.json();
    if (!response.ok || !data.success || Number(data.user?.id) !== result.user.id || data.user?.role !== result.user.role) {
      return next(new Error('Account disabled, expired or role changed'));
    }
    socket.authToken = token.replace(/^Bearer\s+/i, '').trim();
    socket.user = result.user;
    next();
  } catch { next(new Error('Cannot verify account with PHP API')); }

}

module.exports = {
  verifyToken,
  authMiddleware
};
