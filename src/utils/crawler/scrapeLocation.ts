import { selectors } from "../selectors/tabelog.selectors";

export async function scrapeLocation(url: string): Promise<{
	names: string[];
	urls: string[];
}> {
	const response = await fetch(url);

	const names: string[] = [];
	const urls: string[] = [];

	await new HTMLRewriter()
		.on(selectors.locationNames, {
			text({ text }) {
				names.push(text);
			},
		})
		.on(selectors.locationURLs, {
			element(element) {
				urls.push(element.getAttribute("href") || "");
			},
		})
		.transform(response)
		.arrayBuffer();

	return {
		names: names.filter((name) => name !== ""),
		urls: urls.filter((url) => url !== ""),
	};
}
