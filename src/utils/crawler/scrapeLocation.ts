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
				urls.push(element.getAttribute("href") as string);
			},
		})
		.transform(response)

		.arrayBuffer();

	const filteredNames = names.filter((name) => name !== "");
	const filteredUrls = urls.filter((url) => url !== "");

	//clean up non-white spaces (line change observed)
	const cleanedNames = filteredNames.map((name) => name.replaceAll(/\s+/g, ""));
	const cleanedUrls = filteredUrls.map((url) => url.replaceAll(/\s+/g, ""));

	return { names: cleanedNames, urls: cleanedUrls };
}
