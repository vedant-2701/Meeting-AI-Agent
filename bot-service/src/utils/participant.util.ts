import { Participant, RawParticipant } from "../types/participants.types";

/**
 * Merges a raw list of participants, combining roles for duplicates.
 * Uses avatarUrl as the unique key.
 */
export function mergeDuplicates(rawAttendees: RawParticipant[]): Participant[] {
    console.log("Merging duplicate participants...");
    const participantMap = new Map<string, Participant>();

    for (const rawP of rawAttendees) {
        const key = rawP.avatarUrl; // Use avatar as the unique key

        if (participantMap.has(key)) {
            // This person already exists, just add the new role
            const existingP = participantMap.get(key)!;

            if (!existingP.roles.includes(rawP.role)) {
                // Smart ordering: "Presenter" and "Host" go first
                if (rawP.role === "Presenter" || rawP.role === "Host") {
                    existingP.roles.unshift(rawP.role);
                } else {
                    existingP.roles.push(rawP.role);
                }
            }
        } else {
            // This is a new person, add them to the map
            participantMap.set(key, {
                name: rawP.name,
                avatarUrl: rawP.avatarUrl,
                roles: [rawP.role],
            });
        }
    }

    // Convert the map back into our final list
    return Array.from(participantMap.values());
}
