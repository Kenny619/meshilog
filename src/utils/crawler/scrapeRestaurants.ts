import type { Context } from "hono";
import { selectors } from "../selectors/tabelog.selectors";

export async function scrapeRestaurants(url: string, env: CloudflareBindings) {
	let response: Response | null = null;
	try {
		response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				cache: "no-store",
			},
		});
	} catch (e) {
		throw new Error(`fetch failed.  URL:${url} ${e}`);
	}
	if (!response) throw new Error(`fetch failed.  URL:${url}`);

	const scores: string[] = [];
	const urls: string[] = [];

	try {
		await new HTMLRewriter()
			.on(selectors.searchResultScore, new TextHandler(scores))
			.on(selectors.searchResultURL, new ElementHandler(urls))
			.transform(response)
			.arrayBuffer();
	} catch (e) {
		throw new Error(`scrapeRestaurants failed. ${e}`);
	}

	//clean up non-white spaces (line change observed)
	const cleanedScores = scores
		.map((score) => score.replaceAll(/\s+/g, ""))
		.filter((score) => score.length > 0);
	const cleanedUrls = urls
		.map((url) => url.replaceAll(/\s+/g, ""))
		.filter((url) => url.length > 0);

	if (cleanedScores.length === 0 || cleanedUrls.length === 0) {
		return null;
	}

	//if all scores are below threshold, return null
	// console.log("cleanedScores", cleanedScores);
	if (cleanedScores.every((s) => Number(s) < env.SCORES_THRESHOLD)) {
		return null;
	}

	return {
		scores: cleanedScores,
		urls: cleanedUrls,
	};
}

class TextHandler {
	scores: string[] = [];
	str: string;

	constructor(scoreStorage: string[]) {
		this.scores = scoreStorage;
		this.str = "";
	}

	async text(Text: {
		removed: boolean;
		text: string;
		lastInTextNode: boolean;
	}) {
		this.str += Text.text;
		if (Text.lastInTextNode) {
			if (this.str.length > 0) this.scores.push(this.str);
			this.str = "";
		}
	}
}

class ElementHandler {
	urls: string[] = [];

	constructor(urlStorage: string[]) {
		this.urls = urlStorage;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async element(Element: any) {
		this.urls.push((await Element.getAttribute("href")) as string);
	}
}
