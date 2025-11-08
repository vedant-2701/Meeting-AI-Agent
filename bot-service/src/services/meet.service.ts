import { chromium, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import { USER_DATA_DIR } from "../config";
import { RawParticipant, Participant } from "../types/participants.types";
import { ChatMessage } from "../types/chat-message.types";

/**
 * This class manages all interactions with the Playwright browser
 * for the Google Meet call.
 */
export class MeetService {
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private isInMeeting: boolean = false;

    /**
     * Simple wrapper for page.waitForTimeout
     */
    async wait(ms: number): Promise<void> {
        if (!this.page) return;
        await this.page.waitForTimeout(ms);
    }

    /**
     * Launches the browser and loads the authenticated user profile.
     */
    async launchBrowser(): Promise<void> {
        if (!fs.existsSync(USER_DATA_DIR)) {
            throw new Error(
                `User profile not found. Please run "npm run auth" first.`
            );
        }

        console.log("Launching browser and loading user profile...");
        this.context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless: false,
            args: ["--disable-blink-features=AutomationControlled"],
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        });

        this.page = await this.context.newPage();
    }

    /**
     * Navigates to the Meet URL and clicks the "Join now" button.
     */
    async joinMeeting(meetUrl: string): Promise<void> {
        if (!this.page) throw new Error("Browser is not launched.");

        console.log("Navigating to Google Meet...");
        await this.page.goto(meetUrl);

        // Note: We skip Mute/Cam controls because they are persistent in the user-data profile

        console.log('Clicking "Join now"...');
        await this.page.getByRole("button", { name: "Join now" }).click();

        console.log("Waiting to join the meeting...");
        const showEveryoneButtonSelector = 'button[aria-label^="People"]';
        await this.page.waitForSelector(showEveryoneButtonSelector, {
            state: "visible",
            timeout: 60000,
        });

        this.isInMeeting = true; // Set monitoring flag
        console.log("Successfully joined the meeting!");
    }

    async openParticipantPanel(): Promise<void> {
        if (!this.page) throw new Error("Browser is not in a meeting.");

        console.log("Opening participant list...");
        const showEveryoneButtonSelector = 'button[aria-label^="People"]';
        await this.page.locator(showEveryoneButtonSelector).click();

        const participantSelector = "div[data-participant-id]";
        await this.page.waitForSelector(participantSelector, {
            state: "visible",
            timeout: 5000,
        });
        console.log("Participant panel is open.");
    }

    /**
     * Opens the participant list and scrapes all raw participant data.
     */
    async scrapeParticipants(): Promise<RawParticipant[]> {
        if (!this.page) throw new Error("Browser is not in a meeting.");

        await this.wait(5000); // Wait for list to render

        const participantSelector = "div[data-participant-id]";
        await this.page.waitForSelector(participantSelector);

        console.log("Scraping raw attendee details...");
        const rawAttendees = await this.page.$$eval(
            participantSelector,
            (elements) =>
                elements
                    .map((el) => {
                        const nameEl = el.querySelector("span.zWGUib");
                        const avatarEl = el.querySelector("img.KjWwNd");
                        if (!nameEl || !avatarEl) return null;

                        const name = nameEl.textContent || "Unknown";
                        const avatarUrl = avatarEl.getAttribute("src") || "";
                        if (!avatarUrl) return null;

                        const statusEl = el.querySelector("div.d93U2d");
                        const statusText = statusEl
                            ? (statusEl.textContent || "").toLowerCase()
                            : "";

                        const youEl = el.querySelector("span.NnTWjc");
                        const youText = youEl
                            ? (youEl.textContent || "").toLowerCase()
                            : "";

                        let role = "Participant";
                        if (statusText.includes("presentation")) {
                            role = "Presenter";
                        } else if (statusText.includes("host")) {
                            role = "Host";
                        } else if (youText.includes("you")) {
                            role = "You";
                        }
                        return { name, avatarUrl, role };
                    })
                    .filter((p) => p !== null)
        );

        return rawAttendees as RawParticipant[];
    }

    /**
     * Opens the chat panel in Google Meet.
     */
    async openChatPanel(): Promise<void> {
        if (!this.page) throw new Error("Browser is not in a meeting.");

        try {
            console.log("Opening chat panel...");
            // Using the selector you provided
            const chatButtonSelector =
                'button[aria-label="Chat with everyone"]';
            await this.page.waitForSelector(chatButtonSelector, {
                state: "visible",
                timeout: 10000,
            });
            await this.page.locator(chatButtonSelector).click();

            // Wait for the chat message container to be visible
            await this.page.waitForSelector('div[jsname="xySENc"]', {
                state: "visible",
                timeout: 5000,
            });
            console.log("Chat panel is open.");
        } catch (e) {
            console.error("Could not open chat panel.", e);
        }
    }

    /**
     * Scrapes all chat messages from the panel.
     * Now handles consecutive messages.
     */
    async scrapeChatMessages(): Promise<ChatMessage[]> {
        if (!this.page) throw new Error("Browser is not in a meeting.");

        const messageBlockSelector = "div.Ss4fHf"; // Selects the entire block for one person
        try {
            await this.page.waitForSelector(messageBlockSelector, {
                timeout: 5000,
            });

            const messages: ChatMessage[] = [];

            // Get all message blocks
            const messageBlocks = await this.page.$$(messageBlockSelector);

            for (const block of messageBlocks) {
                // Find the sender and time once for the whole block
                const senderEl = await block.$("div.poVWob"); // Sender name
                const timeEl = await block.$("div.MuzmKe"); // Timestamp

                // If no time, it's not a valid message block
                if (!timeEl) continue;

                // If senderEl is null, it's "You" (from your log)
                const sender = senderEl
                    ? ((await senderEl.textContent()) || "Unknown").trim()
                    : "You";
                const time = ((await timeEl.textContent()) || "??:??").trim();

                // Find ALL message bubbles inside this block
                // Your HTML shows consecutive messages are in 'div.RLrADb'
                const msgBubbleEls = await block.$$("div.RLrADb");

                for (const msgEl of msgBubbleEls) {
                    // Inside the bubble, the text is in 'div[jsname="dTKtvb"]'
                    const textEl = await msgEl.$('div[jsname="dTKtvb"]');
                    if (textEl) {
                        const message = (
                            (await textEl.textContent()) || ""
                        ).trim();
                        if (message) {
                            messages.push({ sender, time, message });
                        }
                    }
                }
            }
            return messages;
        } catch (e) {
            // It's okay if no messages are found
            return [];
        }
    }


    /**
     * Finds the "Leave call" button and clicks it.
     */
    async leaveCall(): Promise<void> {
        this.isInMeeting = false;

        if (!this.context) return;

        console.log("Cleaning up and leaving the call...");
        try {
            let meetPage: Page | null = null;
            for (const p of this.context.pages()) {
                if (p.url().includes("meet.google.com")) {
                    meetPage = p;
                    break;
                }
            }

            if (meetPage && !meetPage.isClosed()) {
                const leaveCallButton = meetPage.locator(
                    'button[aria-label="Leave call"]'
                );
                await leaveCallButton.click({ timeout: 5000 });
                console.log("Successfully left the call.");
            } else {
                console.warn(
                    "Could not find the Google Meet page to leave the call."
                );
            }
        } catch (e) {
            console.warn(
                'Could not click "Leave call" button. May have already left.'
            );
        } finally {
            console.log("Closing browser context.");
            await this.context.close();
        }
    }
}
