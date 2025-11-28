import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

/**
 * Initialize Firebase Admin SDK
 * Supports both environment variables and service account key file
 */
const initializeFirebase = (): void => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase Admin SDK already initialized');
      return;
    }


    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Use environment variable containing the JSON object directly
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized using environment variable JSON');
      return;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {

      const keyPath = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
        ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
        : path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);

      // Check if file exists before requiring
      if (!require('fs').existsSync(keyPath)) {
         console.warn(`Service account file not found at: ${keyPath}. Checking if running in cloud environment...`);
         // In cloud environments like Render, we should prefer using env vars or skip if file missing
      } else {
          const serviceAccount = require(keyPath);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log('Firebase Admin SDK initialized using service account key file');
          return;
      }
    }

    throw new Error(
      'Firebase configuration not found. Please set environment variables or provide service account key file path.'
    );
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

// Initialize Firebase
initializeFirebase();

// Export Firebase Admin SDK instances
export const auth = admin.auth();
export const firestore = admin.firestore();
//export const database = admin.database();
export default admin;

