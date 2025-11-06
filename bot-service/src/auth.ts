import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

// We will save our persistent profile in a new folder called 'user-data'
const USER_DATA_DIR = path.join(__dirname, "../user-data");

(async () => {
    console.log("--- One-Time Authentication Script ---");

    if (fs.existsSync(USER_DATA_DIR)) {
        console.log(`NOTE: A 'user-data' profile directory already exists.`);
        console.log("If you are already logged in, you can close this.");
        console.log(
            'If you want to re-login, close the browser, delete the "user-data" folder, and run this script again.'
        );
    } else {
        console.log(`Creating new user profile at: ${USER_DATA_DIR}`);
    }

    console.log(
        "\nA browser window will open. Please log in to your Google Account."
    );
    console.log(
        "After you are fully logged in, **MANUALLY CLOSE THE BROWSER**."
    );

    // Launch a persistent context
    // This is the magic part. It acts like a real browser profile.
    const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false, // Must be false so you can see the login screen
        // We add this argument to try and appear less like a bot
        args: ["--disable-blink-features=AutomationControlled"],
    });

    const page = await context.newPage();

    // Go to Google to log in
    await page.goto("https://accounts.google.com/signin");

    // Now, we just wait for the user to do their thing.
    console.log("Waiting for you to log in and close the browser...");

    // This promise will resolve when the user manually closes the browser
    await context.waitForEvent("close");

    console.log("Browser closed. Authentication profile is saved.");
    console.log('You can now run the main bot with "npm run start".');
})();
