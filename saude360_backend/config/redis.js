const { Redis } = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let connection;
let isConnected = false;

try {
  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: () => null, // Don't retry, just fail silently
    lazyConnect: true
  });

  connection.on('error', () => {
    // Silently ignore Redis errors - it's optional
  });

  connection.on('ready', () => {
    isConnected = true;
    console.log('✅ Conectado ao Redis');
  });

  // Try to connect but don't crash if it fails
  connection.connect().catch(() => {
    console.log('⚠️  Redis não disponível (opcional)');
  });
} catch (err) {
  console.log('⚠️  Redis não disponível (opcional)');
  // Create a mock that returns null for all methods
  connection = new Proxy({}, {
    get: () => async () => null
  });
}

module.exports = connection;
