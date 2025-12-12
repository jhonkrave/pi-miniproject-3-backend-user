import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { TranscriptionSegment } from '../models/Meeting';

// Initialize Gemini - ensures usage even if env var is missing initially (will fail at runtime call)
const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const getFileManager = () => new GoogleAIFileManager(process.env.GEMINI_API_KEY || '');

export const transcribeAudio = async (filePath: string, mimeType: string): Promise<TranscriptionSegment[]> => {
    let uploadResult;
    try {
        const fileManager = getFileManager();
        const genAI = getGenAI();

        // 1. Upload the file to Google AI Files API
        // MimeType fallback if not provided or generic
        const safeMimeType = (mimeType && mimeType !== 'application/octet-stream') ? mimeType : 'audio/mp3';
        
        uploadResult = await fileManager.uploadFile(filePath, {
            mimeType: safeMimeType,
            displayName: "Meeting Audio",
        });

        // 2. Wait for file to be active
        let file = await fileManager.getFile(uploadResult.file.name);
        let retries = 0;
        while (file.state === "PROCESSING" && retries < 20) { // Max 40 seconds wait
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
            retries++;
        }

        if (file.state === "FAILED") {
            throw new Error("Audio processing failed by Gemini");
        }

        // 3. Generate content
        // Using 'gemini-2.0-flash' as confirmed by user's available model list
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const prompt = `
            Transcribe this audio recording of a meeting.
            Identify different speakers if possible (e.g., Speaker 1, Speaker 2).
            Provide timestamps for each segment in "MM:SS" format.
            
            Return ONLY a valid JSON array matching this structure exactly:
            [
              {
                "timestamp": "string",
                "speaker": "string",
                "text": "string"
              }
            ]
            Do not include markdown formatting (like \`\`\`json). Just the raw JSON string.
        `;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri
                }
            },
            { text: prompt }
        ]);

        const response = await result.response;
        const text = response.text();

        // 4. Clean and parse JSON
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        try {
            const transcription: TranscriptionSegment[] = JSON.parse(cleanedText);
            return transcription;
        } catch (e) {
            console.error("Failed to parse Gemini response:", text);
            // Fallback if JSON parsing fails - return raw text as one segment
            return [{
                timestamp: "00:00",
                speaker: "AI Summary",
                text: text
            }];
        }

    } catch (error) {
        console.error('Gemini Transcription error:', error);
        throw error;
    } finally {
        // 5. Cleanup: Delete file from Gemini storage
        if (uploadResult) {
            try {
                const fileManager = getFileManager();
                await fileManager.deleteFile(uploadResult.file.name);
            } catch (cleanupError) {
                console.error("Failed to cleanup file on Gemini:", cleanupError);
            }
        }
    }
};
