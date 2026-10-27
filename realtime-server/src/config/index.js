function requiredSecret(name) {
  const value = process.env[name];
  if (!value || Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error(`${name} must contain at least 32 bytes`);
  }
  return value;
}

module.exports = {
  API_BASE: process.env.QLPT_API_URL || 'http://127.0.0.1:8080/QuanLyPhongTro/api/',
  PORT: process.env.PORT || 3001,
  HOST: process.env.HOST || '0.0.0.0',
  API_SECRET: requiredSecret('QLPT_API_SECRET'),
  REALTIME_INTERNAL_SECRET: requiredSecret('QLPT_REALTIME_SECRET'),
  CORS_ORIGIN: '*'
};
