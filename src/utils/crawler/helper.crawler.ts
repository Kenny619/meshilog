/*

crawlers
- get area1
- get area2
- filter restaurants with above the bar score
- store it to restaurants array

*/

import { getDOM } from "../dom/helper.getDom";
import {
	selectors,
	type Selector,
	type SelectorKeys,
} from "../selectors/tabelog.selectors";
import type { ResponseArray } from "../dom/helper.getDom";

export type GetDOMResponse = [ResponseArray, ResponseArray];

export type InputArea = {
	id: string;
	prefecture: string;
	url: string;
	time: string;
};

export type InputCity = {
	id: string;
	prefecture: string;
	url: string;
	time: string;
	areas: {
		name: string;
		url: string;
	}[];
};

export type OutputAreaCity = {
	id: string;
	prefecture: string;
	url: string;
	time: string;
	areas: {
		name: string;
		url: string;
		cities: {
			name: string;
			url: string;
			time?: string;
		}[];
	}[];
};

export type InputRestaurant = {
	name: string;
	url: string;
};

export type OutputRestaurant = {
	cityUrl: string;
	name: string;
	time: string;
	restaurants: {
		score: string;
		url: string;
	}[];
};

export async function extractURLs<
	T extends InputCity | InputRestaurant | InputArea,
>(
	env: CloudflareBindings,
	selector1: Selector[SelectorKeys],
	selector2: Selector[SelectorKeys],
	sourceObj: T,
	fnGetURLfromObj: (source: T) => string[],
	concurrentPromise = 100,
	retry?: {
		retryCnt?: number;
		errException?: string;
	},
) {
	//throw error
	if (selector1 === selector2)
		throw new Error("selector1 and selector2 are same");

	//set filter for failed promises
	//return false if 1) res[0].err or res[1].err contains err message
	//or when res[0] and res[1] come back with data, but their length is not equal
	const failedFilter = retry?.errException
		? (r: GetDOMResponse) =>
				(r[0].err !== null && !/retry?errException/.test(r[0].err)) ||
				(r[1].err !== null && !/retry?errException/.test(r[1].err)) ||
				r[0].data?.length !== r[1].data?.length
		: (r: GetDOMResponse) =>
				r[0].err !== null ||
				r[1].err !== null ||
				(r[0].data === null && r[1].data === null) ||
				r[0].data.length !== r[1].data.length;

	//return true if 1) res[0].err and res[1].err are null
	//2) res[0] and res[1] come back with data
	//3) their length is greater than 0
	//4) their length is equal
	const successFilter = (r: [ResponseArray, ResponseArray]) =>
		r[0].err === null &&
		r[1].err === null &&
		r[0].data.length > 0 &&
		r[1].data.length > 0 &&
		r[0].data.length === r[1].data.length;

	//set maxRetry count to 2 if not provided
	let maxRetry = retry?.retryCnt ?? 2;

	//extract urls from sourceObj
	const allURLs = fnGetURLfromObj(sourceObj);

	//declare containers
	let prms = [];
	const succeeded: GetDOMResponse[] = [];
	let failed: GetDOMResponse[] = [];
	let urls: string[] = [];

	//early exit flag for restaurants
	let earlyExit = false;

	while (allURLs.length > 0) {
		if (earlyExit) break;
		//slice urls to fit max concurrency
		urls = allURLs.splice(0, concurrentPromise);

		//retry loop
		while (maxRetry > 0) {
			if (earlyExit) break;
			//create array of promise.all containing array of getDOMs
			prms = urls.map((url) => {
				return Promise.all([
					getDOM(env, url, selector1),
					getDOM(env, url, selector2),
				]);
			});

			//resolve promises
			const res = await Promise.all(prms);

			//filter failed promises
			failed = res.filter(failedFilter);

			//push successfully resolved promises to succeeded
			succeeded.push(...res.filter(successFilter));

			//if there are failed promises, extract urls from failed promises and retry
			if (failed.length > 0) {
				//only for the case of restaurants

				console.log("entering failed.length > 0");
				console.log("key length:", Object.keys(sourceObj).length);

				if (Object.keys(sourceObj).length === 2) {
					for (const fail of failed) {
						const [scores, urls] = fail as [ResponseArray, ResponseArray];
						//check for querySelectorAll failed
						if (
							scores.err?.includes("querySelectorAll failed") &&
							urls.err?.includes("querySelectorAll failed")
						) {
							console.log("earlyExit set to true", scores.url);
							earlyExit = true;
							break;
						}
					}
				}
				maxRetry--;
				urls = failed.map((res) => res[0].url || res[1].url);
			} else {
				//if there are no failed promises, break the loop
				break;
			}
		}
	}

	//return successfully resolved promises
	if (!Object.hasOwn(sourceObj as InputArea, "prefecture")) {
		return returnRestaurants(
			succeeded,
			sourceObj as InputRestaurant,
			env.SCORES_THRESHOLD,
		);
	}
	return Object.hasOwn(sourceObj, "areas")
		? (returnCities(succeeded, sourceObj as InputCity) as OutputAreaCity)
		: (returnAreas(succeeded, sourceObj as InputArea) as InputCity);
}

export function returnAreas(
	response: GetDOMResponse[],
	sourceObj: InputArea,
): InputCity {
	const [name, url] = response[0];
	if (!name.data || !url.data)
		throw new Error(
			`data is null.  name.err: ${name.err}.  url.err: ${url.err}`,
		);

	return {
		...sourceObj,
		time: Date.now().toString(),
		areas: name.data.map((n, index) => {
			return {
				name: n,
				url: url.data[index],
			};
		}),
	};
}

export function returnCities(
	response: GetDOMResponse[],
	sourceObj: InputCity,
): OutputAreaCity {
	if (response.length === 0) throw new Error("response is empty");

	const areas = sourceObj.areas.map((area) => {
		const res = response.find(
			(re) => re[0].url === area.url || re[1].url === area.url,
		);
		if (!res) throw new Error("res is null");
		const [name, url] = res;
		if (!name.data || !url.data) throw new Error("data is null");
		return {
			...area,
			cities: name.data.map((n, index) => {
				return {
					name: n,
					url: url.data[index],
				};
			}),
		};
	});

	return {
		id: sourceObj.id,
		prefecture: sourceObj.prefecture,
		url: sourceObj.url,
		time: Date.now().toString(),
		areas,
	};
}

export function returnRestaurants(
	response: GetDOMResponse[],
	sourceObj: InputRestaurant,
	threshold: number,
): OutputRestaurant {
	if (!response.length) throw new Error("response is empty");

	const aboveThreshold: { score: string; url: string }[] = [];

	for (const [scoreArr, urlArr] of response) {
		if (!scoreArr.data || !urlArr.data)
			throw new Error(
				`data is null.  score.err: ${scoreArr.err}.  url.err: ${urlArr.err}`,
			);

		for (let i = 0; i < scoreArr.data.length; i++) {
			if (Number.parseFloat(scoreArr.data[i]) >= threshold) {
				//change to url only array
				aboveThreshold.push({ score: scoreArr.data[i], url: urlArr.data[i] });
			}
		}
	}

	return {
		name: sourceObj.name,
		cityUrl: sourceObj.url,
		time: Date.now().toString(),
		restaurants: aboveThreshold.sort(
			(a, b) => Number.parseFloat(b.score) - Number.parseFloat(a.score),
		),
	};
}

export function getURLsFromPrefectures(sourceObj: InputArea) {
	return [sourceObj.url];
}

export function getURLsFromAreas(sourceObj: InputCity) {
	return sourceObj.areas.map((area) => area.url);
}

export function getURLsFromCity(sourceObj: InputRestaurant) {
	const urls: string[] = [];
	const serpURL = (url: string, num: number) =>
		`${url}rstLst/${num.toString()}/?Srt=D&SrtT=rt&sort_mode=1`;

	for (let i = 1; i <= 60; i++) {
		urls.push(serpURL(sourceObj.url, i));
	}

	return urls;
}
