import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import config from './index';

let memoryServer: MongoMemoryServer | null = null;

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongodbUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Attempting to fall back to in-memory MongoDB for development...');
    try {
      memoryServer = await MongoMemoryServer.create();
      const memoryUri = memoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`MongoDB connected (in-memory fallback): ${memoryUri}`);
    } catch (fallbackError) {
      console.error('Failed to start in-memory MongoDB fallback:', fallbackError);
      process.exit(1);
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};

export default connectDB;