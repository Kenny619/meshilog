import type { Context } from "hono";
import { selectors } from "../selectors/tabelog.selectors";

export async function scrapeRestaurants(url: string) {
	const response = await fetch(url);

	const scores: string[] = [];
	const urls: string[] = [];

	await new HTMLRewriter()
		.on(selectors.searchResultScore, {
			text({ text }) {
				scores.push(text);
			},
		})
		.on(selectors.searchResultURL, {
			element(element) {
				urls.push(element.getAttribute("href") as string);
			},
		})
		.transform(response)
		.arrayBuffer();

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

	return {
		scores: cleanedScores,
		urls: cleanedUrls,
	};
	// const restaurantsObj = cleanedScores
	// 	.map((score, index) => ({
	// 		id: (cleanedUrls[index].match(/^.*\/(.+?)(?=\/?$)/) as string[])[1],
	// 		score: Number(score),
	// 		url: cleanedUrls[index],
	// 	}))
	// 	.filter((restaurant) => restaurant.score >= c.env.SCORES_THRESHOLD)
	// 	.sort((a, b) => b.score - a.score);

	// return restaurantsObj;
}
