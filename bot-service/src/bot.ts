import { chromium, Browser, Page, BrowserContext } from 'playwright';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { error } from 'console';

// --- Config ---
// *** 1. EDIT THIS URL: Paste your Google Meet link here ***
const MEET_URL = 'https://meet.google.com/zjn-kjyg-hwd';

// This is the profile folder we created with the auth.ts script
const USER_DATA_DIR = path.join(__dirname, '../user-data');

// This is the URL of our LOCAL Python "Agent" server
const AGENT_API_URL = 'http://localhost:8000/api/report';
// ---

interface MeetingReport {
  attendeeCount: number;
  attendees: string[];
  meetingUrl: string;
}

async function runBot() {
  if (MEET_URL.includes('YOUR-CODE-HERE')) {
    console.error('Error: Please edit bot-service/src/bot.ts and set your MEET_URL');
    return;
  }
  if (!fs.existsSync(USER_DATA_DIR)) {
    console.error(`Error: User profile not found at ${USER_DATA_DIR}`);
    console.error('Please run "npm run auth" first to log in.');
    return;
  }

  let context: BrowserContext | null = null;
  console.log(`Bot starting. Target URL: ${MEET_URL}`);

  try {
    // 1. LAUNCH BROWSER & LOAD AUTH
    console.log('Launching browser and loading user profile...');
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      args: ['--disable-blink-features=AutomationControlled'],
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    
    const page = await context.newPage();

    // 2. JOIN THE MEETING
    console.log('Navigating to Google Meet...');
    await page.goto(MEET_URL);

    // Mute mic and camera before joining
    console.log('Muting mic and camera...');
    // try {
    //   await page.getByRole('button', { name: /Mute microphone/ }).click({ timeout: 10000 });
    //   await page.getByRole('button', { name: /Turn off camera/ }).click({ timeout: 10000 });
    // } catch (e) {
    //   console.warn('Could not mute mic/cam, maybe already muted?');
    // }
    
    // Click "Join now"
    console.log('Clicking "Join now"...');
    await page.getByRole('button', { name: 'Join now' }).click();
    
    console.log('Waiting to join the meeting...');
    
    // *** --- START OF FIX 1: NEW SELECTOR --- ***
    // We are now using a more stable selector and waiting 60 seconds
    const showEveryoneButtonSelector = 'button[aria-label^="People"]';
    await page.waitForSelector(showEveryoneButtonSelector, { state: 'visible', timeout: 60000 });
    // *** --- END OF FIX 1 --- ***

    console.log('Successfully joined the meeting!');

    // 3. SCRAPE ATTENDEE DATA
    console.log('Opening participant list...');
    // Use the new selector to click
    await page.locator(showEveryoneButtonSelector).click();
    
    await page.waitForTimeout(3000); // Wait for list to render

    const participantSelector = 'div[data-participant-id]';
    await page.waitForSelector(participantSelector);

    // const attendees = await page.$$eval(participantSelector, (elements) =>
    //   elements.map((el) => {
    //     // This selector targets the nameplate
    //     const nameEl = el.querySelector('div[data-self-name]'); 
    //     return nameEl?.textContent || 'Unknown';
    //   })
    // );

    // *** --- START OF FIX 4: NAME SELECTOR --- ***
    // This is the new logic to find the name, based on your HTML
    const attendees = await page.$$eval(participantSelector, (elements) =>
      elements.map((el) => {
        console.log(el);
        // OLD (WRONG): const nameEl = el.querySelector('div[data-self-name]');
        
        // NEW (CORRECT): Find the span with class 'zWGUib'
        const nameEl = el.querySelector('span.zWGUib');
        
        if (!nameEl) return null;

        // Also check for the "(You)" span
        const youEl = el.querySelector('span.NnTWjc');
        const youText = youEl ? youEl.textContent : ''; // Will be '(You)' or ''
        
        // Combine them, e.g., "Vedant Daryapurkar(You)"
        return `${nameEl.textContent}${youText}`;
      }).filter(name => name !== null)
    );
    // *** --- END OF FIX 4 --- ***

    const report: MeetingReport = {
      attendeeCount: attendees.length,
      attendees: attendees,
      meetingUrl: MEET_URL,
    };

    console.log('--- Meeting Report ---');
    console.log(`Count: ${report.attendeeCount}`);
    console.log(`Attendees: ${report.attendees.join(', ')}`);
    console.log('------------------------');

    // 4. SEND REPORT TO PYTHON AGENT
    console.log(`Sending report to Agent at ${AGENT_API_URL}...`);
    try {
      const response = await axios.post(AGENT_API_URL, report);
      console.log('Agent responded:', response.data);
    } catch (e: any) {
      console.error(`Error sending report to agent: ${e.message}`);
      console.error('Is the Python agent running in the other terminal?');
    }

  } catch (error) {
    console.error('An error occurred in the bot:', error);
  } finally {
    // 5. CLEANUP
    if (context) {
      
      // *** --- START OF NEW HANGUP FIX --- ***
      console.log('Cleaning up and leaving the call...');
      try {
        let meetPage: Page | null = null;
        // Loop through all open pages to find the Meet one
        for (const p of context.pages()) {
          if (p.url().includes('meet.google.com')) {
            meetPage = p;
            break;
          }
        }

        // If we found the meet page, use it to hang up
        if (meetPage && !meetPage.isClosed()) {
          const leaveCallButton = meetPage.locator('button[aria-label="Leave call"]');
          await leaveCallButton.click({ timeout: 5000 });
          console.log('Successfully left the call.');
        } else {
          console.warn('Could not find the Google Meet page to leave the call.');
        }
      } catch (e) {
        console.warn('Could not click "Leave call" button. May have already left.');
      }
      // *** --- END OF NEW HANGUP FIX --- ***
      
      console.log('Closing browser context.');
      await context.close();
    }
  }
}

// Run the main bot logic
runBot();