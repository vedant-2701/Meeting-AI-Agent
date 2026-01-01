export const REDIS_CHANNELS = {
    AUDIO_INPUT: "queue:audio_input",
    TEXT_OUTPUT: "channel:text_output",
} as const;

export const MEETING_STATUS = {
    ACTIVE: "ACTIVE",
    ENDED: "ENDED",
    CANCELLED: "CANCELLED",
} as const;

export const MEETING_PLATFORM = {
    GOOGLE_MEET: "GOOGLE_MEET",
    ZOOM: "ZOOM",
    TEAMS: "TEAMS",
    OTHER: "OTHER",
} as const;

export const SENTIMENT = {
    POSITIVE: "positive",
    NEGATIVE: "negative",
    NEUTRAL: "neutral",
    MIXED: "mixed",
} as const;

export const MIN_TRANSCRIPT_LENGTH = 50;
export const MAX_PAGINATION_LIMIT = 100;
export const DEFAULT_PAGINATION_LIMIT = 10;