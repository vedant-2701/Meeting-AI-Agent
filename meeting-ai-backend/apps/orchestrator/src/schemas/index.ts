import { MEETING_PLATFORM, MEETING_STATUS } from "../constants/index.js";

export const createMeetingSchema = {
    body: {
        type: "object",
        required: ["title"],
        properties: {
            title: { type: "string", minLength: 1, maxLength: 255 },
            meetingUrl: { type: "string", format: "uri" },
            platform: {
                type: "string",
                enum: Object.values(MEETING_PLATFORM), // ["GOOGLE_MEET", "ZOOM", "TEAMS", "OTHER"],
            },
        },
    },
};

export const updateMeetingSchema = {
    body: {
        type: "object",
        properties: {
            title: { 
                type: "string", 
                minLength: 1, 
                maxLength: 255 
            },
            meetingUrl: { 
                type: "string" 
            },
            status: { 
                type: "string", 
                enum: Object.values(MEETING_STATUS), // ["ACTIVE", "ENDED", "CANCELLED"] 
            },
        },
    },
};

export const askQuestionSchema = {
    body: {
        type: "object",
        required: ["question"],
        properties: {
            question: { 
                type: "string", 
                minLength: 1, 
                maxLength: 1000 
            },
        },
    },
};

export const chatSchema = {
    body: {
        type: "object",
        required: ["message"],
        properties: {
            message: { 
                type: "string", 
                minLength: 1, 
                maxLength: 2000 

            },
            meetingId: { 
                type: "string" 
            },
        },
    },
};

export const addParticipantSchema = {
    body: {
        type: "object",
        required: ["name"],
        properties: {
            name: { 
                type: "string", 
                minLength: 1, 
                maxLength: 100 
            },
            email: { 
                type: "string", 
                format: "email" 
            },
            isHost: { 
                type: "boolean" 
            },
        },
    },
};

export const searchQuerySchema = {
    querystring: {
        type: "object",
        required: ["q"],
        properties: {
            q: { 
                type: "string", 
                minLength: 1 
            },
        },
    },
};
