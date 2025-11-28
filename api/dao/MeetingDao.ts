import { Meeting, MeetingCreate, MeetingUpdate } from '../models/Meeting';
import { GlobalDao } from './GlobalDao';

/**
 * Firestore implementation of Meeting DAO
 * Handles all database operations for meetings
 */
class MeetingDao extends GlobalDao<Meeting, MeetingCreate, MeetingUpdate> {
    protected readonly collectionName = 'meetings';

    /**
     * Convert Firestore document data to Meeting model
     */
    protected documentToEntity(docId: string, data: FirebaseFirestore.DocumentData): Meeting {
        return {
            id: docId,
            title: data.title,
            description: data.description,
            startDateTime: data.startDateTime?.toDate() || new Date(),
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    }

    /**
     * Find meetings created by a specific user
     */
    async findByCreator(userId: string): Promise<Meeting[]> {
        try {
            const querySnapshot = await this.getCollection()
                .where('createdBy', '==', userId)
                .orderBy('startDateTime', 'asc')
                .get();

            if (querySnapshot.empty) {
                return [];
            }

            return querySnapshot.docs.map((doc) => this.documentToEntity(doc.id, doc.data()));
        } catch (error: any) {
            console.error('Error finding meetings by creator:', error);
            throw error;
        }
    }
}

export default new MeetingDao();
