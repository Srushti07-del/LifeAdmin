import http from 'http';
import os from 'os';
import app from './app';
import config from './config';
import connectDB, { disconnectDB } from './config/database';
import { startReminderScheduler, stopReminderScheduler } from './services/reminderScheduler';

let server: http.Server | null = null;
let isShuttingDown = false;

/**
 * Finds the first non-internal IPv4 address on local network interfaces.
 */
const getLanIp = (): string | null => {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {
    // Ignore network interface enumeration failures
  }
  return null;
};

/**
 * Initiates a graceful shutdown of the HTTP server, scheduler, and database connection.
 */
export const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);

  // Stop background reminder polling
  stopReminderScheduler();

  // Safety timer to prevent hanging shutdown
  const forceExitTimeout = setTimeout(() => {
    console.error('⚠️  Graceful shutdown timed out after 10s. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref?.();

  if (server) {
    server.close(async (err) => {
      if (err) {
        console.error('❌ Error while closing HTTP server:', err);
      } else {
        console.log('🔌 HTTP server connections closed.');
      }

      try {
        await disconnectDB();
        console.log('🗄️  MongoDB disconnected cleanly.');
      } catch (dbErr) {
        console.error('❌ Error disconnecting MongoDB:', dbErr);
      }

      process.exit(err ? 1 : 0);
    });
  } else {
    try {
      await disconnectDB();
      console.log('🗄️  MongoDB disconnected cleanly.');
    } catch (dbErr) {
      console.error('❌ Error disconnecting MongoDB:', dbErr);
    }
    process.exit(0);
  }
};

// Global process error handlers
process.on('unhandledRejection', (reason: unknown) => {
  console.error('\n💥 Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('\n💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));

/**
 * Starts the LifeAdmin server.
 */
export const startServer = async (): Promise<http.Server | void> => {
  try {
    await connectDB();
    startReminderScheduler();

    const host = process.env.HOST || (config.nodeEnv === 'development' ? '0.0.0.0' : undefined);
    const lanIp = getLanIp();

    const onListening = () => {
      const port = config.port;
      console.log('\n================================================================================');
      console.log(`🚀 LifeAdmin Server running in [${config.nodeEnv}] mode`);
      console.log('--------------------------------------------------------------------------------');
      console.log(`💻 Local:      http://localhost:${port}`);
      if (host === '0.0.0.0') {
        console.log(`🌐 LAN:        http://${lanIp || '0.0.0.0'}:${port}`);
        console.log(`📱 Mobile API: http://${lanIp || 'localhost'}:${port}/api`);
      } else if (host) {
        console.log(`🌐 Host:       http://${host}:${port}`);
      }
      const isLocalDb = config.mongodbUri.includes('localhost') || config.mongodbUri.includes('127.0.0.1');
      console.log(`🗄️  MongoDB:    ${isLocalDb ? 'local' : 'Atlas'}`);
      console.log('================================================================================\n');
    };

    if (host) {
      server = app.listen(config.port, host, onListening);
    } else {
      server = app.listen(config.port, onListening);
    }

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error('\n================================================================================');
        console.error(`❌ FATAL: Port ${config.port} is already in use.`);
        console.error('--------------------------------------------------------------------------------');
        console.error(`Another process is already listening on port ${config.port}${host ? ` (${host})` : ''}.`);
        console.error('Troubleshooting options:');
        console.error(`  1. Terminate the other process currently using port ${config.port}.`);
        console.error(`  2. Or change the PORT variable in server/.env (e.g. PORT=${config.port + 1}).`);
        console.error('================================================================================\n');
      } else {
        console.error('\n❌ Server socket error:', err.message || err);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Prevent auto-starting in test environments
if (process.env.NODE_ENV !== 'test' && config.nodeEnv !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}

export { server };
export default app;
