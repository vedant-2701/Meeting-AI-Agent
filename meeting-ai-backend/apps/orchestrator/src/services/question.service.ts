import { prisma } from "../database/prisma.js";
import { logger } from "../utils/logger.js";
import { meetingService } from "./meeting.service.js";
import { llmService } from "./llm.service.js";

export const questionService = {
    /**
     * Ask a question about a meeting
     */
    async ask(meetingId: string, userId: string, question: string) {
        try {
            // Get transcript
            const transcript = await meetingService.getFullTranscript(meetingId);

            if (!transcript) {
                throw new Error("No transcript available for this meeting");
            }

            // Get answer from LLM
            const answer = await llmService.answerQuestion(transcript, question);

            // Save question and answer
            const savedQuestion = await prisma.userQuestion.create({
                data: {
                    meetingId,
                    userId,
                    question,
                    answer,
                },
            });

            logger.info({ meetingId, questionId: savedQuestion.id }, "Question answered");

            return {
                id: savedQuestion.id,
                question,
                answer,
                askedAt: savedQuestion.askedAt,
            };
        } catch (err) {
            logger.error({ err, meetingId }, "Error answering question");
            throw err;
        }
    },

    /**
     * Get question history for a meeting
     */
    async getByMeetingId(meetingId: string) {
        return prisma.userQuestion.findMany({
            where: { meetingId },
            orderBy: { askedAt: "desc" },
        });
    },

    /**
     * Get question history for a user
     */
    async getByUserId(userId: string) {
        return prisma.userQuestion.findMany({
            where: { userId },
            include: {
                meeting: {
                    select: { id: true, title: true },
                },
            },
            orderBy: { askedAt: "desc" },
        });
    },
};