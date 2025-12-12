import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import meetingDao from '../dao/MeetingDao';
import { upload } from '../middleware/upload';
import { transcribeAudio } from '../services/transcriptionService';
import fs from 'fs';

const router = Router();

/**
 * @route   POST /api/meetings
 * @desc    Create a new meeting
 * @access  Private
 */
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, startDateTime, maxParticipants } = req.body;
        const uid = req.uid;

        if (!title || !startDateTime) {
            res.status(400).json({
                success: false,
                message: 'Title and startDateTime are required',
            });
            return;
        }

        if (!uid) {
            res.status(401).json({
                success: false,
                message: 'User authentication required',
            });
            return;
        }

        const meeting = await meetingDao.create({
            title,
            description,
            startDateTime: new Date(startDateTime),
            createdBy: uid,
            maxParticipants: maxParticipants || 10,
        });

        res.status(201).json({
            success: true,
            message: 'Meeting created successfully',
            data: meeting,
        });
    } catch (error: any) {
        console.error('Error creating meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create meeting',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/meetings
 * @desc    Get all meetings created by the authenticated user
 * @access  Private
 */
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const uid = req.uid;

        if (!uid) {
            res.status(401).json({
                success: false,
                message: 'User authentication required',
            });
            return;
        }

        const meetings = await meetingDao.findByCreator(uid);

        res.status(200).json({
            success: true,
            data: meetings,
        });
    } catch (error: any) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meetings',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/meetings/:id
 * @desc    Get a specific meeting by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const meeting = await meetingDao.findById(id);

        if (!meeting) {
            res.status(404).json({
                success: false,
                message: 'Meeting not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: meeting,
        });
    } catch (error: any) {
        console.error('Error fetching meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch meeting',
            error: error.message,
        });
    }
});

/**
 * @route   PUT /api/meetings/:id
 * @desc    Update a meeting
 * @access  Private
 */
router.put('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, startDateTime, status, maxParticipants } = req.body;
        const uid = req.uid;

        const existingMeeting = await meetingDao.findById(id);
        if (!existingMeeting) {
            res.status(404).json({
                success: false,
                message: 'Meeting not found',
            });
            return;
        }

        if (existingMeeting.createdBy !== uid) {
            res.status(403).json({
                success: false,
                message: 'Not authorized to update this meeting',
            });
            return;
        }

        const updateData: any = {};
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (startDateTime) updateData.startDateTime = new Date(startDateTime);
        if (status) updateData.status = status;
        if (maxParticipants) updateData.maxParticipants = maxParticipants;

        const updatedMeeting = await meetingDao.update(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Meeting updated successfully',
            data: updatedMeeting,
        });
    } catch (error: any) {
        console.error('Error updating meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update meeting',
            error: error.message,
        });
    }
});

/**
 * @route   DELETE /api/meetings/:id
 * @desc    Delete a meeting
 * @access  Private
 */
router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const uid = req.uid;

        const existingMeeting = await meetingDao.findById(id);
        if (!existingMeeting) {
            res.status(404).json({
                success: false,
                message: 'Meeting not found',
            });
            return;
        }

        if (existingMeeting.createdBy !== uid) {
            res.status(403).json({
                success: false,
                message: 'Not authorized to delete this meeting',
            });
            return;
        }

        await meetingDao.delete(id);

        res.status(200).json({
            success: true,
            message: 'Meeting deleted successfully',
        });
    } catch (error: any) {
        console.error('Error deleting meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete meeting',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/meetings/:id/transcription
 * @desc    Get meeting transcription
 * @access  Private (Participants only)
 */
router.get('/:id/transcription', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const uid = req.uid;

        const meeting = await meetingDao.findById(id);

        if (!meeting) {
            res.status(404).json({
                success: false,
                message: 'Meeting not found',
            });
            return;
        }

        // Check if user is participant
        if (!meeting.participants || !meeting.participants.includes(uid!)) {
            res.status(403).json({
                success: false,
                message: 'Not authorized to view transcription',
            });
            return;
        }

        if (!meeting.transcription) {
            res.status(404).json({
                success: false,
                message: 'Transcription not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: meeting.transcription,
        });
    } catch (error: any) {
        console.error('Error fetching transcription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transcription',
            error: error.message,
        });
    }
});

/**
 * @route   POST /api/meetings/:id/transcription
 * @desc    Generate meeting transcription from audio
 * @access  Private (Participants only)
 */
router.post('/:id/transcription', authenticate, upload.any(), async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const uid = req.uid;
        
        // Handle file from either 'audio' or 'recording' or any single file upload
        // Cast to any to avoid TypeScript issues with Multer types in production build
        const reqAny = req as any;
        const files = reqAny.files as any[] | undefined;
        const file = files && files.length > 0 ? files[0] : undefined;

        if (!file) {
            res.status(400).json({
                success: false,
                message: 'Audio file is required (field name: audio or recording)',
            });
            return;
        }

        const meeting = await meetingDao.findById(id);

        if (!meeting) {
            fs.unlinkSync(file.path);
            res.status(404).json({
                success: false,
                message: 'Meeting not found',
            });
            return;
        }

        // Check permission
        if (!meeting.participants || !meeting.participants.includes(uid!)) {
            fs.unlinkSync(file.path);
            res.status(403).json({
                success: false,
                message: 'Not authorized to generate transcription',
            });
            return;
        }

        // Process audio
        const transcription = await transcribeAudio(file.path, file.mimetype);

        // Save to DB
        await meetingDao.saveTranscription(id, transcription);

        // Cleanup
        fs.unlinkSync(file.path);

        res.status(200).json({
            success: true,
            message: 'Transcription generated successfully',
            data: transcription,
        });

    } catch (error: any) {
        // Cleanup uploaded file if exists (using req.files array now)
        const reqAny = req as any;
        const files = reqAny.files as any[] | undefined;
        if (files && files.length > 0 && fs.existsSync(files[0].path)) {
            fs.unlinkSync(files[0].path);
        }
        
        console.error('Error generating transcription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate transcription',
            error: error.message,
        });
    }
});

export default router;
