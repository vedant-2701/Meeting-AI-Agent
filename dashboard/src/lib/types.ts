// This matches the Pydantic models in our Python agent
export interface Participant {
    name: string;
    avatarUrl: string;
    roles: string[]; // e.g., ["Host", "Presenter", "You", "Participant"]
}

export interface MeetingReport {
    attendeeCount: number;
    attendees: Participant[];
    meetingUrl: string;
    // We'll add a 'createdAt' field in the python agent later
    // createdAt: string;
}
