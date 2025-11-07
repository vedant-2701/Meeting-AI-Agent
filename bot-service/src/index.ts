import { MEET_URL } from "./config";
import { MeetingReport } from "./types/meeting-report.types";
import { MeetService } from "./services/meet.service";
import { sendReportToAgent } from "./services/api.service";
import { mergeDuplicates } from "./utils/participant.util";

/**
 * Main bot orchestration function
 */
async function runBot() {
    const meetService = new MeetService();

    try {
        // 1. Start the browser
        await meetService.launchBrowser();

        // 2. Join the meeting
        await meetService.joinMeeting(MEET_URL);

        // 3. Scrape the raw data
        const rawAttendees = await meetService.scrapeParticipants();

        // 4. Process the data (de-duplicate)
        const finalAttendees = mergeDuplicates(rawAttendees);

        // 5. Create the final report
        const report: MeetingReport = {
            attendeeCount: finalAttendees.length,
            attendees: finalAttendees,
            meetingUrl: MEET_URL,
        };

        console.log("--- Final Meeting Report ---");
        console.log(`Count: ${report.attendeeCount}`);
        console.log("Attendees:", JSON.stringify(report.attendees, null, 2));
        console.log("----------------------------");

        // 6. Send the report to the Python Agent
        await sendReportToAgent(report);
    } catch (error) {
        console.error("An error occurred in the bot:", error);
    } finally {
        // 7. Always clean up and leave the call
        await meetService.leaveCall();
    }
}

// Run the main bot logic
runBot();
