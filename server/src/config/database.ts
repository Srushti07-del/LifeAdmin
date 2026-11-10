import mongoose from 'mongoose';
import config from './index';

/**
 * Safely masks database credentials in a MongoDB connection URI.
 * Preserves the protocol, host, port, db name, and query options while masking the password.
 */
export function maskMongoUri(uri?: string): string {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(
    /(mongodb(?:\+srv)?:\/\/)([^/?#\s]+)([/?#\s]|$)/gi,
    (match, protocol, authority, rest) => {
      const atIdx = authority.lastIndexOf('@');
      if (atIdx === -1) return match;
      const userInfo = authority.slice(0, atIdx);
      const hostPort = authority.slice(atIdx + 1);
      const colonIdx = userInfo.indexOf(':');
      if (colonIdx === -1) {
        return `${protocol}****@${hostPort}${rest}`;
      }
      const user = userInfo.slice(0, colonIdx);
      return `${protocol}${user}:****@${hostPort}${rest}`;
    }
  );
}

/**
 * Sanitizes any string (such as an error message or stack trace) to redact
 * embedded MongoDB connection URIs and raw database passwords.
 */
export function sanitizeErrorMessage(message: string, rawUri?: string): string {
  if (!message || typeof message !== 'string') return '';
  let sanitized = maskMongoUri(message);

  if (rawUri) {
    const match = rawUri.match(/mongodb(?:\+srv)?:\/\/([^/?#\s]+)/i);
    if (match && match[1]) {
      const authority = match[1];
      const atIdx = authority.lastIndexOf('@');
      if (atIdx !== -1) {
        const userInfo = authority.slice(0, atIdx);
        const colonIdx = userInfo.indexOf(':');
        const rawPassword = colonIdx !== -1 ? userInfo.slice(colonIdx + 1) : userInfo;
        if (rawPassword && rawPassword.length > 0 && rawPassword !== '****') {
          sanitized = sanitized.split(rawPassword).join('****');
          try {
            const decodedPassword = decodeURIComponent(rawPassword);
            if (decodedPassword !== rawPassword && decodedPassword.length > 0) {
              sanitized = sanitized.split(decodedPassword).join('****');
            }
          } catch {
            // ignore uri decode errors
          }
        }
      }
    }
  }

  return sanitized;
}

/**
 * Sanitizes an error object, its message, stack trace, and nested properties
 * so that logging the error will never leak MongoDB connection credentials.
 */
export function sanitizeMongoError<T = any>(error: T, rawUri?: string): T {
  if (!error) return error;

  if (typeof error === 'string') {
    return sanitizeErrorMessage(error, rawUri) as unknown as T;
  }

  if (error instanceof Error) {
    if (error.message) {
      error.message = sanitizeErrorMessage(error.message, rawUri);
    }
    if (error.stack) {
      error.stack = sanitizeErrorMessage(error.stack, rawUri);
    }
  }

  try {
    const visited = new Set<any>();
    const sanitizeNested = (obj: any, depth = 0) => {
      if (!obj || typeof obj !== 'object' || depth > 4 || visited.has(obj)) return;
      visited.add(obj);

      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
          obj[key] = sanitizeErrorMessage(val, rawUri);
        } else if (val && typeof val === 'object') {
          sanitizeNested(val, depth + 1);
        }
      }
    };

    sanitizeNested(error);
  } catch {
    // Never fail inside error sanitizer
  }

  return error;
}

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
    const sanitizedError = sanitizeMongoError(error, config.mongodbUri);
    const maskedUri = maskMongoUri(config.mongodbUri);

    const errorMsg = [
      '================================================================================',
      '❌ FATAL: Unable to connect to MongoDB',
      '--------------------------------------------------------------------------------',
      `Target URI: ${maskedUri}`,
      `Error:      ${sanitizedError?.message || sanitizedError}`,
      '',
      'Troubleshooting Steps:',
      '  1. Verify the MongoDB server/service is running and accessible.',
      '  2. If using local MongoDB, ensure port 27017 is listening.',
      '  3. If using MongoDB Atlas, verify your IP is whitelisted (Network Access) and credentials are valid.',
      '  4. Check server/.env.example for connection string formatting.',
      '================================================================================',
    ].join('\n');
    console.error(errorMsg);
    throw sanitizedError;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

export default connectDB;