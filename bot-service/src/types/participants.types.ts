// The raw data scraped from a single participant tile
export interface RawParticipant {
    name: string;
    avatarUrl: string;
    role: string;
}

// The final de-duplicated participant object
export interface Participant {
    name: string;
    avatarUrl: string;
    roles: string[]; //["Host", "Presenter", "You", "Participant"];
}