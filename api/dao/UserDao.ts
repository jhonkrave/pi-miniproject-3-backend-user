import { auth, firestore } from '../config/firebase';
import { User, UserCreate, UserUpdate } from '../models/User';
import { GlobalDao } from './GlobalDao';
import * as admin from 'firebase-admin';

/**
 * Firestore implementation of User DAO
 * Handles all database operations for users
 * Extends GlobalDao for common CRUD operations
 */
class UserDao extends GlobalDao<User, UserCreate, UserUpdate> {
  protected readonly collectionName = 'users';

  /**
   * Convert Firestore document data to User model
   */
  protected documentToEntity(docId: string, data: FirebaseFirestore.DocumentData): User {
    return {
      uid: docId,
      email: data.email || '',
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: data.displayName,
      age: data.age,
      emailVerified: data.emailVerified || false,
      disabled: data.disabled ?? false,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      metadata: data.metadata,
    };
  }

  /**
   * Create a new user
   * Creates user in Firebase Auth and stores additional data in Firestore
   */
  async create(userData: User): Promise<User> {
    try {

      
      // Create user in Firebase Authentication
/* const userRecord = await auth.createUser({
        email: userData.email,
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
        emailVerifi      ed: userData.emailVerified ?? false,
        disabled: userData.disabled ?? false,
      }); */

      const now = admin.firestore.FieldValue.serverTimestamp();

      // Create user document in Firestore
      const userDoc: UserCreate & {
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
      } = {
        uid: userData.uid,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
        age: userData.age,
        emailVerified: userData.emailVerified ?? false,
        disabled: userData.disabled ?? false,
        createdAt: now,
        updatedAt: now,
        metadata: {
          creationTime: userData.metadata?.creationTime ?? '',
        },
      };

      const batch = firestore.batch();
      const userRef  = await this.getCollection().doc(userData.uid);
      batch.set(userRef, userDoc);

      const emailIndexRef = await firestore.collection('emailIndex').doc(userData.email);
      batch.set(emailIndexRef, { userId: userData.uid });

      await batch.commit();

      // Retrieve and return the created user
      //const createdUser = await this.findById(userRecord.uid);
      /* if (!createdUser) {
        throw new Error('Failed to retrieve created user');
      } */

      return userData;
    } catch (error: any) {
      console.error('Error creating user in DAO:', error);
      throw error;
    }
  }

  /**
   * Find a user by email
   * Uses the base class findByField method
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.findByField('email', email, 1);
      return users.length > 0 ? users[0] : null;
    } catch (error: any) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Prepare update data for User
   * Handles displayName logic when firstName or lastName change
   */
  protected prepareUpdateData(data: UserUpdate): any {
    // Get base update data with timestamp
    const updateData: any = super.prepareUpdateData(data);

    // Handle displayName logic
    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    } else if (data.firstName !== undefined || data.lastName !== undefined) {
      // If firstName or lastName changed, we need to get current data
      // This will be handled in the update method
    }

    return updateData;
  }

  /**
   * Update a user by UID
   * Updates both Firebase Auth and Firestore
   * Overrides base update to handle Firebase Auth integration
   */
  async update(uid: string, userData: UserUpdate): Promise<User> {
    try {
      const userDocRef = this.getCollection().doc(uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      // Prepare update data for Firestore
      let updateData = this.prepareUpdateData(userData);

      // Handle displayName if firstName or lastName changed
      if (userData.displayName === undefined && (userData.firstName !== undefined || userData.lastName !== undefined)) {
        const currentData = userDoc.data()!;
        const firstName = userData.firstName ?? currentData.firstName;
        const lastName = userData.lastName ?? currentData.lastName;
        if (firstName && lastName) {
          updateData.displayName = `${firstName} ${lastName}`;
        }
      }

      // Update Firestore
      await userDocRef.update(updateData);

      // Update Firebase Auth if needed
      const authUpdateData: any = {};
      if (userData.email !== undefined) authUpdateData.email = userData.email;
      if (updateData.displayName) {
        authUpdateData.displayName = updateData.displayName;
      }
      if (userData.disabled !== undefined) authUpdateData.disabled = userData.disabled;
      if (userData.emailVerified !== undefined) {
        authUpdateData.emailVerified = userData.emailVerified;
      }

      if (Object.keys(authUpdateData).length > 0) {
        await auth.updateUser(uid, authUpdateData);
      }

      // Retrieve and return updated user
      const updatedUser = await this.findById(uid);
      if (!updatedUser) {
        throw new Error('Failed to retrieve updated user');
      }

      return updatedUser;
    } catch (error: any) {
      console.error('Error updating user in DAO:', error);
      throw error;
    }
  }

  /**
   * Delete a user by UID
   * Deletes from both Firebase Auth and Firestore
   * Overrides base delete to handle Firebase Auth integration
   */
  async delete(uid: string): Promise<boolean> {
    try {
      // Use base class to delete from Firestore
      await super.delete(uid);

      // Delete from Firebase Auth
      await auth.deleteUser(uid);

      return true;
    } catch (error: any) {
      console.error('Error deleting user in DAO:', error);
      throw error;
    }
  }
}

// Export DAO instance for dependency injection
export default new UserDao();