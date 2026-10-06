import mongoose from 'mongoose';
import config from './index';

/**
 * Connect to persistent MongoDB.
 * Silent in-memory fallback is strictly removed for application runtime.
 * Fails with a clear, actionable error if MONGODB_URI is missing or unreachable.
 */
const connectDB = async (): Promise<void> => {
  if (!config.mongodbUri) {
    const errorMsg = [
      '================================================================================',
      '❌ FATAL: MONGODB_URI is missing or empty in server/.env',
      '--------------------------------------------------------------------------------',
      'LifeAdmin requires a persistent MongoDB database connection.',
      'Silent in-memory fallback is disabled.',
      '',
      'Actionable Setup:',
      '  1. Create or edit `server/.env`',
      '  2. Set MONGODB_URI to your local MongoDB or Atlas cluster:',
      '     Local:  MONGODB_URI=mongodb://localhost:27017/lifeadmin',
      '     Atlas:  MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/lifeadmin?retryWrites=true&w=majority',
      '  3. Refer to `server/.env.example` for the complete template.',
      '================================================================================',
    ].join('\n');
    console.error(errorMsg);
    throw new Error('MONGODB_URI is required in server/.env');
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`🗄️  MongoDB connected: ${conn.connection.host}${conn.connection.port ? ':' + conn.connection.port : ''}/${conn.connection.name}`);
  } catch (error: any) {
    const errorMsg = [
      '================================================================================',
      '❌ FATAL: Unable to connect to MongoDB',
      '--------------------------------------------------------------------------------',
      `Target URI: ${config.mongodbUri}`,
      `Error:      ${error?.message || error}`,
      '',
      'Troubleshooting Steps:',
      '  1. Verify the MongoDB server/service is running and accessible.',
      '  2. If using local MongoDB, ensure port 27017 is listening.',
      '  3. If using MongoDB Atlas, verify your IP is whitelisted (Network Access) and credentials are valid.',
      '  4. Check server/.env.example for connection string formatting.',
      '================================================================================',
    ].join('\n');
    console.error(errorMsg);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

export default connectDB;