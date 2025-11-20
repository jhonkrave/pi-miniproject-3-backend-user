# pi-miniproject-3-backend-user TeamLink

Backend API for user management using Express, Firebase Admin SDK, and TypeScript.

## Features

- RESTful API built with Express.js
- Firebase Admin SDK integration for user authentication
- Firebase ID Token authentication middleware
- TypeScript for type safety
- Environment-based configuration
- Error handling middleware


## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project with Admin SDK enabled
- Firebase service account key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pi-miniproject-3-backend-user
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and configure your environment variables:
```env
PORT=3000
NODE_ENV=development

```

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project or create a new one
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key" to download your service account key JSON file
5. Either:
   - Place the JSON file in the root directory and set `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` in `.env`
   - Or extract the values from the JSON and set them in `.env` as shown above

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Health Check
- **GET** `/api/health`
  - Returns server status
  - **Access**: Public

### Authentication

- **POST** `/api/auth/verify`
  - Verify authentication token
  - **Headers**: `Authorization: Bearer <token>`
  - **Access**: Public (but requires valid token)
  - Returns: User information if token is valid

- **GET** `/api/auth/me`
  - Get current authenticated user information
  - **Headers**: `Authorization: Bearer <token>`
  - **Access**: Private (requires authentication)
  - Returns: Current user's decoded token information

### User Management

All user management endpoints require authentication.

**Authentication Header Required:**
```
Authorization: Bearer <firebase-id-token>
```

- **GET** `/api/users`
  - Get all users
  - **Access**: Private (requires authentication)
  - Returns: Array of user objects

- **GET** `/api/users/:uid`
  - Get user by UID
  - **Access**: Private (requires authentication)
  - Returns: User object

- **POST** `/api/users`
  - Create a new user
  - **Access**: Private (requires authentication)
  - Body: `{ email, password, displayName? }`
  - Returns: Created user object

- **PUT** `/api/users/:uid`
  - Update user by UID
  - **Access**: Private (requires authentication)
  - Body: `{ email?, displayName?, disabled?, emailVerified? }`
  - Returns: Updated user object

- **DELETE** `/api/users/:uid`
  - Delete user by UID
  - **Access**: Private (requires authentication)
  - Returns: Success message

## Authentication

This API uses Firebase ID Tokens for authentication. Clients must obtain an ID token from Firebase Authentication (client-side) and include it in the `Authorization` header for protected routes.

### How to Use

1. **Get Firebase ID Token (Client-side)**:
   ```javascript
   // Example with Firebase JavaScript SDK
   const user = firebase.auth().currentUser;
   const idToken = await user.getIdToken();
   ```

2. **Include Token in API Requests**:
   ```javascript
   fetch('/api/users', {
     headers: {
       'Authorization': `Bearer ${idToken}`,
       'Content-Type': 'application/json'
     }
   });
   ```

3. **Token Validation**:
   - Tokens are automatically verified by the `authenticateToken` middleware
   - Invalid or expired tokens will return a `401 Unauthorized` error
   - Valid tokens provide user information via `req.user` and `req.uid` in route handlers

### Token Errors

The API returns specific error messages for different token issues:

- `401`: Missing or invalid token format
- `401`: Token expired (`Token has expired`)
- `401`: Token revoked (`Token has been revoked`)
- `401`: Invalid token format (`Invalid token format`)

## Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (development only)"
}
```

## Project Structure

```
├── src/
│   ├── config/
│   │   └── firebase.ts          # Firebase Admin SDK configuration
│   ├── routes/
│   │   ├── index.ts             # Main router
│   │   ├── auth.routes.ts       # Authentication routes
│   │   └── user.routes.ts       # User management routes
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   └── errorHandler.ts      # Error handling middleware
│   ├── types/
│   │   └── express.d.ts         # TypeScript type definitions
│   └── index.ts                 # Application entry point
├── dist/                        # Compiled JavaScript (generated)
├── .env                         # Environment variables (not in git)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Security Considerations

- Never commit your `.env` file or Firebase service account keys
- Use environment variables for sensitive data
- All user management routes are protected by authentication middleware
- Firebase ID Tokens are verified server-side using Firebase Admin SDK
- Enable Firebase App Check for additional security
- Use HTTPS in production to protect tokens in transit
- Tokens should be obtained from Firebase Authentication client-side only
- Implement token refresh on the client when tokens expire

## Technologies Used

- **Express.js** - Web framework
- **Firebase Admin SDK** - Firebase authentication and database
- **TypeScript** - Type-safe JavaScript
- **Helmet** - Security middleware
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - HTTP request logger
- **dotenv** - Environment variable management

## License

ISC
