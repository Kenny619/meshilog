export type ResponseArray =
	| { err: string; data: null; url: string }
	| { err: null; data: string[]; url: string };

async function runCrawler<T extends "text" | "texts" | "link" | "links">(
	env: CloudflareBindings,
	sourceURL: string,
	selectorOBJ: { selector: string; subSelector?: string; type: T },
	timeoutMS = 20000,
) {
	//create fetch option
	const options = fetchOption(env, sourceURL, selectorOBJ);
	const subOptions = fetchOption(env, sourceURL, selectorOBJ, "sub");
	//run fetch with regular selector
	const response = await fetchWithTimeout(env, options, timeoutMS);

	//return error response if response.ok is false
	if (!response.ok) {
		return {
			err: `getDOM failed. HTTP error! status: ${response.status}`,
			data: null,
			url: sourceURL,
		};
	}

	let result = (await response.json()) as ResponseArray;

	//second run of crawling using subSelector
	if (result.err?.includes("querySelectorAll failed")) {
		//use subOption query
		const subResponse = await fetchWithTimeout(env, subOptions, timeoutMS);

		if (!subResponse.ok) {
			return {
				err: `getDOM failed. HTTP error! status: ${subResponse.status}`,
				data: null,
				url: sourceURL,
			};
		}

		result = (await subResponse.json()) as ResponseArray;
	}

	return {
		err: result.err,
		data: result.data,
		url: sourceURL,
	} as ResponseArray;
}
export async function getDOM<T extends "text" | "texts" | "link" | "links">(
	env: CloudflareBindings,
	sourceURL: string,
	selectorOBJ: {
		selector: string;
		subSelector?: string;
		type: T;
	},
	timeoutMS = 20000,
): Promise<ResponseArray> {
	//create fetch option
	const options = fetchOption(env, sourceURL, selectorOBJ);
	const subOptions = fetchOption(env, sourceURL, selectorOBJ, "sub");
	//run fetch with regular selector
	const response = await fetchWithTimeout(env, options, timeoutMS);

	//return error response if response.ok is false
	if (!response.ok) {
		return {
			err: `getDOM failed. HTTP error! status: ${response.status}`,
			data: null,
			url: sourceURL,
		};
	}

	let result = (await response.json()) as ResponseArray;

	//second run of crawling using subSelector
	if (result.err?.includes("querySelectorAll failed")) {
		//use subOption query
		const subResponse = await fetchWithTimeout(env, subOptions, timeoutMS);

		if (!subResponse.ok) {
			return {
				err: `getDOM failed. HTTP error! status: ${subResponse.status}`,
				data: null,
				url: sourceURL,
			};
		}

		result = (await subResponse.json()) as ResponseArray;
	}

	return {
		err: result.err,
		data: result.data,
		url: sourceURL,
	} as ResponseArray;
	/*
	const options = fetchOption(env, sourceURL, selectorOBJ);
	const response = await fetchWithTimeout(env, options, timeoutMS);

	if (!response.ok) {
		return {
			err: `getDOM failed. HTTP error! status: ${response.status}`,
			data: null,
			url: sourceURL,
		};
	}

	//initialize result val in case of rerun
	const result:
		| {
				err: null;
				data: T extends "text" | "link" ? string : string[];
				url: string;
		  }
		| { err: string; data: null; url: string } = await response.json();

	if (!result.err?.includes("querySelectorAll failed")) {
		return {
			err: null,
			data: result.data,
			url: sourceURL,
		} as T extends "text" | "link" ? ResponseSingle : ResponseArray;
	}

	//use subOption query

	const subOption = fetchOption(env, sourceURL, selectorOBJ, "sub");
	const subResponse = await fetchWithTimeout(env, subOption, timeoutMS);

	if (!subResponse.ok) {
		return {
			err: `getDOM failed. HTTP error! status: ${subResponse.status}`,
			data: null,
			url: sourceURL,
		};
	}

	const subResult = (await subResponse.json()) as T extends "text" | "link"
		? ResponseSingle
		: ResponseArray;

	return {
		err: null,
		data: subResult.data,
		url: sourceURL,
	} as T extends "text" | "link" ? ResponseSingle : ResponseArray;
	 */
}

async function fetchWithTimeout(
	env: CloudflareBindings,
	options: RequestInit,
	timeoutMS = 10000,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMS);

	try {
		const response = await fetch(env.DOM_API_URL, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error("Request timed out");
		}
		throw error;
	}
}

function fetchOption(
	env: CloudflareBindings,
	sourceURL: string,
	selectorOBJ: { selector: string; subSelector?: string; type: string },
	mode: "main" | "sub" = "main",
) {
	return mode === "main"
		? {
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.DOM_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url: sourceURL,
					selector: selectorOBJ.selector,
					type: selectorOBJ.type,
				}),
			}
		: {
				method: "POST",
				headers: {
					Authorization: `Bearer ${env.DOM_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url: sourceURL,
					selector: selectorOBJ.subSelector,
					type: selectorOBJ.type,
				}),
			};
}
