import { firestore } from '../config/firebase';
import * as admin from 'firebase-admin';

/**
 * Abstract base class for Data Access Objects
 * Provides common CRUD operations using Firestore
 * @template T - Entity type
 * @template CreateT - DTO type for creating entities
 * @template UpdateT - DTO type for updating entities
 */
export abstract class GlobalDao<T, CreateT, UpdateT> {
  /**
   * Collection name in Firestore
   * Must be implemented by child classes
   */
  protected abstract readonly collectionName: string;

  /**
   * Get Firestore collection reference
   */
  protected getCollection(): admin.firestore.CollectionReference {
    return firestore.collection(this.collectionName);
  }

  /**
   * Convert Firestore document to entity
   * Must be implemented by child classes
   * @param docId - Document ID
   * @param data - Document data
   * @returns Entity object
   */
  protected abstract documentToEntity(docId: string, data: FirebaseFirestore.DocumentData): T;

  /**
   * Prepare data for creation
   * Can be overridden by child classes for custom logic
   * @param data - DTO data
   * @returns Prepared data with timestamps
   */
  protected prepareCreateData(data: any): any {
    return {
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  /**
   * Prepare data for update
   * Can be overridden by child classes for custom logic
   * @param data - DTO data
   * @returns Prepared update data with timestamp
   */
  protected prepareUpdateData(data: UpdateT): any {
    const updateData: any = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    return updateData;
  }

  /**
   * Create a new entity
   * Can be overridden by child classes for custom creation logic
   * @param data - Entity data to create
   * @returns Created entity object
   */
  async create(data: CreateT): Promise<T> {
    try {
      // Generate ID (can be overridden for custom ID generation)
      const id = await this.generateId(data);

      // Prepare data with timestamps
      const entityData = this.prepareCreateData(data);

      // Remove id field if it exists in data (we use document ID instead)
      if ('id' in entityData) {
        delete entityData.id;
      }

      // Create document in Firestore
      await this.getCollection().doc(id).set(entityData);

      // Retrieve and return the created entity
      const createdEntity = await this.findById(id);
      if (!createdEntity) {
        throw new Error(`Failed to retrieve created ${this.collectionName.slice(0, -1)}`);
      }

      return createdEntity;
    } catch (error: any) {
      console.error(`Error creating ${this.collectionName.slice(0, -1)} in DAO:`, error);
      throw error;
    }
  }

  /**
   * Generate document ID for new entity
   * Can be overridden by child classes for custom ID generation
   * Default: generates a random ID
   * @param _data - Entity data (unused in base implementation)
   * @returns Generated ID
   */
  protected async generateId(_data: CreateT): Promise<string> {
    // Default: generate random ID
    return this.getCollection().doc().id;
  }

  /**
   * Find an entity by ID
   * @param id - Entity unique identifier
   * @returns Entity object if found, null otherwise
   */
  async findById(id: string): Promise<T | null> {
    try {
      const doc = await this.getCollection().doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return this.documentToEntity(doc.id, doc.data()!);
    } catch (error: any) {
      console.error(`Error finding ${this.collectionName.slice(0, -1)} by ID:`, error);
      throw error;
    }
  }

  /**
   * Get all entities
   * @returns Array of all entities
   */
  async findAll(): Promise<T[]> {
    try {
      const querySnapshot = await this.getCollection().get();

      if (querySnapshot.empty) {
        return [];
      }

      return querySnapshot.docs.map((doc) => this.documentToEntity(doc.id, doc.data()));
    } catch (error: any) {
      console.error(`Error finding all ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update an entity by ID
   * Can be overridden by child classes for custom update logic
   * @param id - Entity unique identifier
   * @param data - Partial entity data to update
   * @returns Updated entity object
   */
  async update(id: string, data: UpdateT): Promise<T> {
    try {
      const docRef = this.getCollection().doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error(`${this.collectionName.slice(0, -1)} not found`);
      }

      // Prepare update data
      const updateData = this.prepareUpdateData(data);

      // Remove id field if it exists
      if ('id' in updateData) {
        delete updateData.id;
      }

      // Update document in Firestore
      await docRef.update(updateData);

      // Retrieve and return updated entity
      const updatedEntity = await this.findById(id);
      if (!updatedEntity) {
        throw new Error(`Failed to retrieve updated ${this.collectionName.slice(0, -1)}`);
      }

      return updatedEntity;
    } catch (error: any) {
      console.error(`Error updating ${this.collectionName.slice(0, -1)} in DAO:`, error);
      throw error;
    }
  }

  /**
   * Delete an entity by ID
   * Can be overridden by child classes for custom deletion logic
   * @param id - Entity unique identifier
   * @returns true if deletion was successful
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Check if entity exists
      const doc = await this.getCollection().doc(id).get();
      if (!doc.exists) {
        throw new Error(`${this.collectionName.slice(0, -1)} not found`);
      }

      // Delete document from Firestore
      await this.getCollection().doc(id).delete();

      return true;
    } catch (error: any) {
      console.error(`Error deleting ${this.collectionName.slice(0, -1)} in DAO:`, error);
      throw error;
    }
  }

  /**
   * Check if an entity exists by ID
   * @param id - Entity unique identifier
   * @returns true if entity exists, false otherwise
   */
  async exists(id: string): Promise<boolean> {
    try {
      const doc = await this.getCollection().doc(id).get();
      return doc.exists;
    } catch (error: any) {
      console.error(`Error checking ${this.collectionName.slice(0, -1)} existence:`, error);
      throw error;
    }
  }

  /**
   * Find entities by a field value
   * @param field - Field name to search
   * @param value - Value to match
   * @param limit - Maximum number of results (default: 1)
   * @returns Array of matching entities
   */
  protected async findByField(field: string, value: any, limit: number = 1): Promise<T[]> {
    try {
      const querySnapshot = await this.getCollection()
        .where(field, '==', value)
        .limit(limit)
        .get();

      if (querySnapshot.empty) {
        return [];
      }

      return querySnapshot.docs.map((doc) => this.documentToEntity(doc.id, doc.data()));
    } catch (error: any) {
      console.error(`Error finding ${this.collectionName} by ${field}:`, error);
      throw error;
    }
  }
}

