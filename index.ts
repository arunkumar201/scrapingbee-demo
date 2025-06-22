import scrapingbee from "scrapingbee";
import fs from "fs/promises";
import path from "path";

const API_KEY =
	process.env.SCRAPINGBEE_API_KEY;

const OUTPUT_DIR = "./chatgpt-scrapes";
const PROMPT = "Donald Trump";

async function takeScreenshot(prompt: string) {
	const timestamp = new Date().toISOString().replace(/[:.]/g,"-");
	const screenshotPath = path.join(OUTPUT_DIR,`screenshot-${timestamp}.png`);
	await fs.mkdir(OUTPUT_DIR,{ recursive: true });

	const client = new scrapingbee.ScrapingBeeClient(API_KEY);

	const jsScenario = JSON.stringify({
		instructions: [
			{ wait_for: "#prompt-textarea > p" },
			{
				evaluate: `document.querySelector('#prompt-textarea > p').innerHTML = '${prompt.replace(
					/'/g,
					"\\'"
				)}';`,
			},
			{ wait: 2000 },
			{
				evaluate: "document.querySelector('[data-testid=\"composer-button-search\"]').click();",
			},
			{ wait: 2000 },
			{
				evaluate: "document.querySelector('#prompt-textarea').dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'Enter'}));",
			},
			{ wait: 15000 },
			{ wait_for: "button[composer-speech-button]" },
			{ wait: 2000 },
			{
				evaluate:
					"document.querySelector('button[aria-label=\"Sources\"]').click();",
			},
			{ wait: 2000 },
		],
	});

	try {
		const response = await client.get({
			url: "https://chatgpt.com",
			timeout: 120_000,
			params: {
				api_key: API_KEY,
				screenshot: true,
				screenshot_full_page: true,
				stealth_proxy: true,
				json_response: true,
				js_scenario: jsScenario,
				extract_rules:
					'{"AI Response":"article[data-testid=conversation-turn-2] > div"}',
			},
		});

		const decoder = new TextDecoder();
		const text1 = JSON.parse(decoder.decode(response.data));

		const text = text1.body;

		console.log("Markdown ---- ",text["AI Response"]);

		if (text1.screenshot) {
			const screenshotBuffer = Buffer.from(text1.screenshot,"base64");
			await fs.writeFile(screenshotPath,screenshotBuffer);
			console.log(`✅ Screenshot saved: ${screenshotPath}`);
		} else {
			console.log("❌ No screenshot data available in response.");
		}
	} catch (error: any) {
		console.error("Scraping failed:",error?.message || error);
		if (error?.response?.data) {
			console.error("ScrapingBee response:",error.response.data.toString());
		}
	}
}

takeScreenshot(PROMPT);
