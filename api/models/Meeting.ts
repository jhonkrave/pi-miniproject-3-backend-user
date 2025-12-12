/**
 * Meeting model representing a video conference meeting
 */
export interface Meeting {
    id: string;
    title: string;
    description?: string;
    startDateTime: Date;
    createdBy: string; // uid of the creator
    createdAt: Date;
    updatedAt: Date;
    status: 'scheduled' | 'active' | 'ended' | 'cancelled';
    maxParticipants: number;
    participants: string[];
    transcription?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
    timestamp: string;
    speaker: string;
    text: string;
}

/**
 * Data transfer object for creating a new meeting
 */
export type MeetingCreate = Omit<Meeting, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'maxParticipants' | 'participants' | 'transcription'> & {
    maxParticipants?: number;
    participants?: string[];
};

/**
 * Data transfer object for updating a meeting
 */
export type MeetingUpdate = Partial<Omit<Meeting, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>;
