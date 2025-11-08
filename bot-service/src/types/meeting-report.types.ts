import { ChatMessage } from "./chat-message.types.ts";
import { Participant } from "./participants.types.ts";

// The final report sent to the Python agent
export interface MeetingReport {
    attendeeCount: number;
    attendees: Participant[];
    meetingUrl: string;
    chat: ChatMessage[];
}
