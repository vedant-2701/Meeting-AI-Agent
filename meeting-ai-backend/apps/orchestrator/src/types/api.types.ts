export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Re-export Prisma types for convenience
export type {
    Meeting,
    Transcript,
    MeetingReport,
    Participant,
    User,
} from "../generated/prisma/client.js";
