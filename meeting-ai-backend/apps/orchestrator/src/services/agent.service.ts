import { logger } from "../utils/logger.js";
import {
    routerService,
    type RouterResult,
    type Intent,
} from "./router.service.js";
import { meetingService } from "./meeting.service.js";
import { transcriptService } from "./transcript.service.js";
import { reportService } from "./report.service.js";
import { questionService } from "./question.service.js";
import { llmService } from "./llm.service.js";

export interface ChatRequest {
    message: string;
    meetingId?: string | undefined;
    userId: string;
}

export interface ChatResponse {
    success: boolean;
    intent: Intent;
    message: string;
    data?: any;
    error?: string;
}

type ActionHandler = (
    result: RouterResult,
    userId: string
) => Promise<ChatResponse>;

const actionHandlers: Record<Intent, ActionHandler> = {
    async generate_report(result, _userId) {
        const { meetingId } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting should I generate a report for?",
                error: "Missing meetingId",
            };
        }
        if (!(await meetingService.exists(meetingId))) {
            return {
                success: false,
                intent: result.intent,
                message: "Meeting not found.",
                error: "Not found",
            };
        }
        const report = await reportService.generate(meetingId);
        return {
            success: true,
            intent: result.intent,
            message: "Report generated successfully!",
            data: report,
        };
    },

    async get_report(result, _userId) {
        const { meetingId } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting's report would you like?",
                error: "Missing meetingId",
            };
        }
        const report = await reportService.getByMeetingId(meetingId);
        if (!report) {
            return {
                success: false,
                intent: result.intent,
                message: "No report found. Would you like me to generate one?",
                error: "Not found",
            };
        }
        return {
            success: true,
            intent: result.intent,
            message: "Here's the report:",
            data: report,
        };
    },

    async ask_question(result, userId) {
        const { meetingId, question } = result.entities;
        const q = question || result.originalMessage;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting are you asking about?",
                error: "Missing meetingId",
            };
        }
        const answer = await questionService.ask(meetingId, userId, q);
        return {
            success: true,
            intent: result.intent,
            message: answer.answer || "Couldn't find an answer.",
            data: answer,
        };
    },

    async get_summary(result, _userId) {
        const { meetingId } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting should I summarize?",
                error: "Missing meetingId",
            };
        }
        const transcript = await meetingService.getFullTranscript(meetingId);
        if (!transcript) {
            return {
                success: false,
                intent: result.intent,
                message: "No transcript found.",
                error: "No transcript",
            };
        }
        const summary = await llmService.generateSummary(transcript);
        return { success: true, intent: result.intent, message: summary };
    },

    async get_action_items(result, _userId) {
        const { meetingId } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting's action items?",
                error: "Missing meetingId",
            };
        }
        const transcript = await meetingService.getFullTranscript(meetingId);
        if (!transcript) {
            return {
                success: false,
                intent: result.intent,
                message: "No transcript found.",
                error: "No transcript",
            };
        }
        const items = await llmService.extractActionItems(transcript);
        return {
            success: true,
            intent: result.intent,
            message: items.length ? "Action items:" : "No action items found.",
            data: items,
        };
    },

    async get_transcripts(result, _userId) {
        const { meetingId } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting's transcript?",
                error: "Missing meetingId",
            };
        }
        const transcript = await transcriptService.getFormattedTranscript(
            meetingId
        );
        return {
            success: true,
            intent: result.intent,
            message: "Here's the transcript:",
            data: { transcript },
        };
    },

    async search_transcripts(result, _userId) {
        const { meetingId, searchQuery } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting should I search?",
                error: "Missing meetingId",
            };
        }
        if (!searchQuery) {
            return {
                success: false,
                intent: result.intent,
                message: "What should I search for?",
                error: "Missing query",
            };
        }
        const results = await transcriptService.search(meetingId, searchQuery);
        return {
            success: true,
            intent: result.intent,
            message: results.length
                ? `Found ${results.length} matches:`
                : "No matches found.",
            data: results,
        };
    },

    async get_meeting_info(result, _userId) {
        const { meetingId } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting?",
                error: "Missing meetingId",
            };
        }
        const meeting = await meetingService.getById(meetingId);
        if (!meeting) {
            return {
                success: false,
                intent: result.intent,
                message: "Meeting not found.",
                error: "Not found",
            };
        }
        return {
            success: true,
            intent: result.intent,
            message: `Meeting: ${meeting.title}`,
            data: meeting,
        };
    },

    async list_meetings(result, userId) {
        const meetings = await meetingService.getByUserId(userId);
        return {
            success: true,
            intent: result.intent,
            message: meetings.length
                ? `You have ${meetings.length} meetings:`
                : "No meetings yet.",
            data: meetings,
        };
    },

    async create_meeting(result, userId) {
        const title = result.entities.meetingTitle || "Untitled Meeting";
        const meeting = await meetingService.create({
            title,
            hostId: userId,
            userId,
        });
        return {
            success: true,
            intent: result.intent,
            message: `Meeting "${meeting.title}" created!`,
            data: meeting,
        };
    },

    async end_meeting(result, _userId) {
        const { meetingId } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting should I end?",
                error: "Missing meetingId",
            };
        }
        const meeting = await meetingService.endMeeting(meetingId);
        return {
            success: true,
            intent: result.intent,
            message: `Meeting ended.`,
            data: meeting,
        };
    },

    async add_participant(result, _userId) {
        const { meetingId, participantName } = result.entities;
        if (!meetingId) {
            return {
                success: false,
                intent: result.intent,
                message: "Which meeting?",
                error: "Missing meetingId",
            };
        }
        if (!participantName) {
            return {
                success: false,
                intent: result.intent,
                message: "What's the participant's name?",
                error: "Missing name",
            };
        }
        const participant = await meetingService.addParticipant(meetingId, {
            name: participantName,
        });
        return {
            success: true,
            intent: result.intent,
            message: `${participantName} added.`,
            data: participant,
        };
    },

    async chat(result, _userId) {
        // Simple fallback for small talk
        return {
            success: true,
            intent: "chat",
            message: "Hello! I am your Meeting Assistant. Ask me to summarize a meeting or generate a report.",
            data: null
        };
    },

    async unknown(result, _userId) {
        return {
            success: false,
            intent: result.intent,
            message:
                "I can help you with:\n• Generate/view reports\n• Answer questions about meetings\n• Get summaries or action items\n• Search transcripts\n• Manage meetings",
            error: "Unknown intent",
        };
    },
};

export const agentService = {
    async chat(request: ChatRequest): Promise<ChatResponse> {
        try {
            console.log(request);
            const routerResult = await routerService.route(request.message, {
                meetingId: request.meetingId,
            });
            logger.info(
                {
                    intent: routerResult.intent,
                    confidence: routerResult.confidence,
                },
                "Routed"
            );

            const handler = actionHandlers[routerResult.intent];
            return await handler(routerResult, request.userId);
        } catch (err) {
            logger.error({ err }, "Agent error");
            return {
                success: false,
                intent: "unknown",
                message: "Something went wrong.",
                error: String(err),
            };
        }
    },
};
