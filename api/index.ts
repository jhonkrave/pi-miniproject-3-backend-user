import express, { Application } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import * as dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';

import './config/firebase'; // Initialize Firebase

dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

/**
 * CORS configuration based on environment variables
 * @description Processes allowed origins from CORS_ORIGIN environment variable
 * @type {string[]}
 */
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/**
 * CORS configuration options
 * @description Configuration that allows specific origins and credentials
 * @type {CorsOptions}
 */
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

/**
 * CORS middleware
 * @description Applies CORS configuration to all routes
 */
app.use(cors(corsOptions));

/**
 * Server status route
 * @description Basic endpoint that confirms the server is running
 * @route GET /
 */
app.get('/', (_req, res) => { res.send('Server is running'); });

/**
 * Server health check route
 * @description Health check endpoint that returns server status
 * @route GET /health
 * @returns {Object} Object with 'ok' status
 */
app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });



// Routes
app.use('/api/auth', authRoutes);

/**
 * Server initialization
 * @description Only starts the server if this file is run directly
 * @description Does not start server if file is imported as module
 */
if (require.main === module) {
    /**
     * Server port
     * @description Port obtained from PORT environment variable or 3000 as default
     * @type {number}
     */
    const PORT = Number(process.env.PORT || 3000);
    
    /**
     * Starts HTTP server
     * @description Listens on specified port and shows confirmation message
     * @param {number} PORT - Port to listen on
     * @param {Function} callback - Callback function executed when server starts
     */
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }



export default app;

