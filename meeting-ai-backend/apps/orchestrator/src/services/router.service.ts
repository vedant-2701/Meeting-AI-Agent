import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { logger } from "../utils/logger.js";
import { Prompts } from "../helper/promptTemplate.js";
import { routerModel as model } from "./llm-client.js";

export type Intent =
    | "generate_report"
    | "get_report"
    | "ask_question"
    | "get_summary"
    | "get_action_items"
    | "get_transcripts"
    | "search_transcripts"
    | "get_meeting_info"
    | "list_meetings"
    | "create_meeting"
    | "end_meeting"
    | "add_participant"
    | "chat"
    | "unknown";

// Define the valid intents array at runtime for checking
const VALID_INTENTS: Intent[] = [
    "generate_report", "get_report", "ask_question", "get_summary", 
    "get_action_items", "get_transcripts", "search_transcripts", 
    "get_meeting_info", "list_meetings", "create_meeting", 
    "end_meeting", "add_participant", "chat", "unknown"
];

export interface RouterResult {
    intent: Intent;
    confidence: number;
    entities: {
        meetingId?: string;
        question?: string;
        searchQuery?: string;
        meetingTitle?: string;
        participantName?: string;
        [key: string]: string | undefined;
    };
    originalMessage: string;
}

export const routerService = {
    async route(
        message: string,
        context?: { meetingId?: string | undefined }
    ): Promise<RouterResult> {
        try {
            const userPrompt = context?.meetingId
                ? `Current meeting: ${context.meetingId}\nUser: ${message}`
                : `User: ${message}`;

            const response = await model.invoke([
                new SystemMessage(Prompts.ROUTER_SYSTEM_PROMPT),
                new HumanMessage(userPrompt),
            ]);
            
            console.log(response);
            
            const content =
                typeof response.content === "string"
                    ? response.content
                    : JSON.stringify(response.content);

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return this.createUnknownResult(message);
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // SAFETY CHECK: Ensure the returned intent is actually one of our allowed strings
            let intent: Intent = parsed.intent;
            if (!VALID_INTENTS.includes(intent)) {
                logger.warn({ rawIntent: parsed.intent }, "LLM returned invalid intent, defaulting to unknown");
                intent = "unknown";
            }

            return {
                intent: intent,
                confidence: parsed.confidence || 0,
                entities: {
                    ...parsed.entities,
                    meetingId: parsed.entities?.meetingId || context?.meetingId,
                },
                originalMessage: message,
            };
        } catch (err) {
            logger.error({ err }, "Router error");
            return this.createUnknownResult(message);
        }
    },

    createUnknownResult(message: string): RouterResult {
        return {
            intent: "unknown",
            confidence: 0,
            entities: {},
            originalMessage: message,
        };
    },
};
