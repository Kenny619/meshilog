import { selectors } from "../selectors/tabelog.selectors";

export async function scrapeLocation(url: string): Promise<{
	source: string;
	names: string[];
	urls: string[];
}> {
	const response = await fetch(url, {
		method: "GET",
		headers: {
			cache: "no-store",
		},
	});
	const names: string[] = [];
	const urls: string[] = [];

	const extractor = new HTMLRewriter()
		// .on(selectors.locationNames, {
		// 	text({ text }) {
		// 		if (text !== "") names.push(text);
		// 	},
		// })
		.on(selectors.locationNames, new TextHandler(names))
		.on(selectors.locationURLs, {
			element(element) {
				if (
					/^.*(?<!\/rstLst\/)(?<!\/premiseLst\/)$/.test(
						element.getAttribute("href") as string,
					)
				) {
					urls.push(element.getAttribute("href") as string);
				}
			},
		})
		.transform(response);
	// .arrayBuffer();

	await extractor.text();
	// const extractor = new HTMLRewriter()
	// 	.on(selectors.locationNames, {
	// 		text({ text }) {
	// 			names.push(text);
	// 		},
	// 	})
	// 	.on(selectors.locationURLs, {
	// 		element(element) {
	// 			urls.push(element.getAttribute("href") as string);
	// 		},
	// 	});
	// await consume(extractor.transform(response).body as ReadableStream);

	//clean up non-white spaces (line change observed)
	return { source: url, names, urls };

	// const cleanedNames = filteredNames.map((name) => name.replaceAll(/\s+/g, ""));
	// const cleanedUrls = filteredUrls.map((url) => url.replaceAll(/\s+/g, ""));

	// return { names: cleanedNames, urls: cleanedUrls };
}
async function consume(stream: ReadableStream) {
	const reader = stream.getReader();
	while (!(await reader.read()).done) {
		/* NOOP */
	}
}

class TextHandler {
	str: string;
	names: string[] = [];

	constructor(nameStorage: string[]) {
		this.names = nameStorage;
		this.str = "";
	}

	async text(Text: {
		removed: boolean;
		text: string;
		lastInTextNode: boolean;
	}) {
		this.str += Text.text;
		if (Text.lastInTextNode) {
			if (this.str.length > 0) this.names.push(this.str);
			this.str = "";
		}
	}
}
