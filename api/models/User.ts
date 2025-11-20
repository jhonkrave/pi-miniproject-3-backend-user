/**
 * User model representing a user in the system
 */
export interface User {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  age?: number;
  disabled: boolean;
  emailVerified: boolean;
  //password: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

/**
 * Data transfer object for creating a new user
 * Includes password which is required for Firebase Auth but not stored in User model
 */
export type UserCreate = Omit<User,  'createdAt' | 'updatedAt'>;

/**
 * Data transfer object for updating a user
 */
export type UserUpdate = Partial<Omit<User, 'uid' | 'createdAt' | 'updatedAt'>>;
