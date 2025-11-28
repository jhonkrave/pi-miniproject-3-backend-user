import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase';

/**
 * Authentication middleware to verify Firebase ID tokens
 * Expects token in Authorization header as "Bearer <token>"
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header or Session Cookie
    const authHeader = req.headers.authorization;
    const sessionCookie = req.cookies?.session || '';

    let decodedToken;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      decodedToken = await auth.verifyIdToken(idToken);
    } else if (sessionCookie) {
      decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    } else {
      res.status(401).json({
        success: false,
        message: 'Authorization token or session cookie required',
      });
      return;
    }

    // Attach user information to request object
    req.user = decodedToken;
    req.uid = decodedToken.uid;

    next();
  } catch (error: any) {
    console.error('Token verification error:', error);

    // Handle specific Firebase auth errors
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({
        success: false,
        message: 'Token has expired',
      });
      return;
    }

    if (error.code === 'auth/id-token-revoked') {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked',
      });
      return;
    }

    if (error.code === 'auth/argument-error') {
      res.status(401).json({
        success: false,
        message: 'Invalid token format',
      });
      return;
    }

    // Generic unauthorized error
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Optional authentication middleware
 * Allows access if token is provided and valid, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      if (idToken) {
        const decodedToken = await auth.verifyIdToken(idToken);
        req.user = decodedToken;
        req.uid = decodedToken.uid;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    console.log('Optional auth failed:', error);
  }

  next();
};

