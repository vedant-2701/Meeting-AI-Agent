import { MEET_URL } from "./config";
import { MeetingReport } from "./types/meeting-report.types";
import { MeetService } from "./services/meet.service";
import { sendReportToAgent } from "./services/api.service";
import { mergeDuplicates } from "./utils/participant.util";
import { ChatMessage } from "./types/chat-message.types";
import { Participant, RawParticipant } from "./types/participants.types";

/**
 * Main bot orchestration function
 */
async function runBot() {
    const meetService = new MeetService();

    let lastKnownParticipants: Participant[] = [];
    let lastKnownMessages: ChatMessage[] = [];
    let botIsRunning = true;
    let hostName = "";

    try {
        // 1. Start the browser and join
        await meetService.launchBrowser();
        await meetService.joinMeeting(MEET_URL);

        // 2. Open the participant panel to start
        // await meetService.openParticipantPanel();
        console.log(
            "Bot is active. Monitoring for participants and chat commands..."
        );

        // 3. Start the main monitoring loop
        while (botIsRunning) {
            // --- PARTICIPANT SCRAPE ---
            // Panel is already open from the previous loop or initial setup
            console.log("Scraping participants...");
            try {
                const rawParticipants: RawParticipant[] =
                    await meetService.scrapeParticipants();
                lastKnownParticipants = mergeDuplicates(rawParticipants);

                // Find the host on the first loop
                if (!hostName) {
                    hostName =
                        lastKnownParticipants.find((p) =>
                            p.roles.includes("Host")
                        )?.name || "";
                    if (hostName) {
                        console.log(
                            `Host detected: ${hostName}. Listening for 'agent leave' command.`
                        );
                    } else {
                        console.warn(
                            "Could not identify host. Bot will run until manually stopped."
                        );
                    }
                }
            } catch (e: any) {
                console.warn("Could not scrape participants:", e.message);
            }

            // --- CHAT SCRAPE ---
            // Now, close the participant panel by opening the chat panel
            await meetService.openChatPanel();
            console.log("Scraping chat...");
            try {
                lastKnownMessages = await meetService.scrapeChatMessages();

                // Check for the leave command
                if (hostName) {
                    for (const msg of lastKnownMessages) {
                        if (
                            msg.sender === hostName &&
                            msg.message.toLowerCase().includes("agent leave")
                        ) {
                            console.log(
                                "Leave command received from host. Shutting down..."
                            );
                            botIsRunning = false;
                            break; // Exit the for-loop
                        }
                    }
                }
            } catch (e: any) {
                console.warn("Could not scrape chat:", e.message);
            }

            if (!botIsRunning) {
                break; // Exit the while-loop
            }

            // --- PREPARE FOR NEXT LOOP ---
            // Close the chat panel and re-open the participant panel
            await meetService.openParticipantPanel();

            console.log("...waiting 5 seconds...");
            await meetService.wait(5000);
        } // End of while-loop

        // 4. Loop has broken (leave command was received)
        // Create the final report with the last known data
        const finalReport: MeetingReport = {
            attendeeCount: lastKnownParticipants.length,
            attendees: lastKnownParticipants,
            meetingUrl: MEET_URL,
            chat: lastKnownMessages,
        };

        console.log("--- Sending Final Meeting Report ---");
        console.log(`Count: ${finalReport.attendeeCount}`);
        console.log(
            "Attendees:",
            JSON.stringify(finalReport.attendees, null, 2)
        );
        console.log(
            `Chat (${finalReport.chat.length} messages):`,
            JSON.stringify(finalReport.chat, null, 2)
        );
        console.log("------------------------------------");

        // 5. Send the final report
        await sendReportToAgent(finalReport);
    } catch (error) {
        console.error("An error occurred in the bot:", error);
    } finally {
        // 6. Always clean up and leave the call
        await meetService.leaveCall();
    }
}

// Run the main bot logic
runBot();
