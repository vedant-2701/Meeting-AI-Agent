import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";
import { meetingService } from "./meeting.service.js";
import { llmService } from "./llm.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { InsufficientDataError } from "../utils/errors.js";
import { MIN_TRANSCRIPT_LENGTH } from "../constants/index.js";

export const reportService = {
    /**
     * Generate and save meeting report
     */
    async generate(meetingId: string) {
        try {
            // Get full transcript
            const transcript = await meetingService.getFullTranscript(meetingId);

            if (!transcript || transcript.length < MIN_TRANSCRIPT_LENGTH) {
                throw new InsufficientDataError("Insufficient transcript data to generate report");
            }

            // Get participant count
            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
                include: {
                    participants: true,
                },
            });

            // Generate report components using LLM
            const [summary, actionItems, keyTopics, sentiment] = await Promise.all([
                llmService.generateSummary(transcript),
                llmService.extractActionItems(transcript),
                llmService.extractKeyTopics(transcript),
                llmService.analyzeSentiment(transcript),
            ]);

            // Save or update report
            const report = await prisma.meetingReport.upsert({
                where: { meetingId },
                create: {
                    meetingId,
                    summary,
                    actionItems: actionItems as Prisma.InputJsonValue,
                    keyTopics: keyTopics as Prisma.InputJsonValue,
                    sentiment,
                    attendeeCount: meeting?.participants.length || 0,
                },
                update: {
                    summary,
                    actionItems: actionItems as Prisma.InputJsonValue,
                    keyTopics: keyTopics as Prisma.InputJsonValue,
                    sentiment,
                    attendeeCount: meeting?.participants.length || 0,
                    generatedAt: new Date(),
                },
            });

            logger.info({ meetingId, reportId: report.id }, "Report generated");
            return report;
        } catch (err) {
            logger.error({ err, meetingId }, "Error generating report");
            throw err;
        }
    },

    /**
     * Get report by meeting ID
     */
    async getByMeetingId(meetingId: string) {
        return prisma.meetingReport.findUnique({
            where: { meetingId },
        });
    },

    /**
     * Check if report exists
     */
    async exists(meetingId: string): Promise<boolean> {
        const count = await prisma.meetingReport.count({ where: { meetingId } });
        return count > 0;
    },
};