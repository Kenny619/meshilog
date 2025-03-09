import { getKV, putKV } from "../utils/kv/helper.kv";
import { scrapeLocation } from "../utils/crawler/scrapeLocation";
import type { Prefecture, Areas, City } from "../type";
import { findOldest } from "../utils/lib/findOldest";
export async function updateSinglePrefecture(env: CloudflareBindings) {
	const errMsgPrefix = "updateSinglePrefecture failed. ";
	//get PREFECTURES from KV
	let prefs: Prefecture = {};
	try {
		prefs = (await getKV(env, "PREFECTURES")) as Prefecture;
	} catch (e) {
		throw new Error(`${errMsgPrefix} ${e}`);
	}

	//find the oldest updated prefecture from KV
	const targetPref = findOldest(prefs);
	const prefID = Object.keys(targetPref)[0];

	//update area
	let prefUpdatedAreas: Prefecture = {};
	try {
		const scrapedAreas = await scrapeLocation(prefs[prefID].prefURL);
		prefUpdatedAreas = updateArea(prefs, prefID, scrapedAreas);
	} catch (e) {
		throw new Error(`${errMsgPrefix} ${e}`);
	}

	//scraped cities variable
	let prefUpdatedCities: Prefecture = {};
	try {
		const res = await Promise.all(
			Object.values(prefUpdatedAreas[prefID].areas as Areas).map((a) =>
				scrapeLocation(a.url),
			),
		);
		prefUpdatedCities = updateCity(prefUpdatedAreas, prefID, res);
		prefUpdatedCities[prefID].updated = Date.now();
	} catch (e) {
		throw new Error(`${errMsgPrefix} ${e}`);
	}

	//overwrite PREFECTURES KV with updated prefectures obj
	try {
		await putKV(env, "PREFECTURES", prefUpdatedCities);
	} catch (e) {
		throw new Error(`${errMsgPrefix} ${e}`);
	}

	return `[update-prefecture] Success: ${prefID}`;
}

async function scrapeLocationRetry(
	url: string | string[],
	maxRetry = 7,
	successResponse: { source: string; names: string[]; urls: string[] }[] = [],
) {
	let retryCount = maxRetry;
	while (retryCount > 0) {
		//for area
		if (typeof url === "string") {
			const res = await scrapeLocation(url);
			if (res.names.length === res.urls.length) {
				return { names: res.names, urls: res.urls };
			}
			retryCount--;
			scrapeLocationRetry(url, retryCount);
		}

		//for city
		if (Array.isArray(url)) {
			const res = await Promise.all(url.map((u) => scrapeLocation(u)));
			if (res.every((r) => r.names.length === r.urls.length)) {
				successResponse.push(...res);
				return successResponse.map((r) => ({
					names: r.names,
					urls: r.urls,
				}));
			}
			retryCount--;
			successResponse.push(
				...res.filter((r) => r.names.length === r.urls.length),
			);
			const failedURLs = res
				.filter((r) => r.names.length !== r.urls.length)
				.map((r) => r.source);

			//debug
			if (retryCount === 0) {
				console.error(
					"Failed to scrape location: name and url length mismatch",
				);
				console.error(res.filter((r) => r.names.length !== r.urls.length));
			}
			scrapeLocationRetry(failedURLs, retryCount, successResponse);
		}
		throw new Error("Failed to scrape location");
	}
}

//convert scrape response of {names: string[]; urls:string[]}
//to location obj format of {[name:string]: {url: string}}
function getLocationObj(response: { names: string[]; urls: string[] }) {
	return response.names.reduce(
		(acc, cur, index) => {
			acc[cur] = {
				url: response.urls[index],
			};
			return acc;
		},
		{} as Record<string, { url: string }>,
	);
}

function updateArea(
	pref: Prefecture,
	prefID: string,
	resArea: { names: string[]; urls: string[] },
) {
	pref[prefID].areas = updateLocations(
		pref[prefID].areas as Areas,
		getLocationObj(resArea),
	);

	return pref;
}

function updateCity(
	pref: Prefecture,
	prefID: string,
	resCities: { names: string[]; urls: string[] }[],
) {
	const areaKeys = Object.keys(pref[prefID].areas as Areas);

	if (areaKeys.length !== resCities.length) {
		throw new Error("areaKeys and resCities length mismatch");
	}

	for (let i = 0; i < areaKeys.length; i++) {
		const curCities = (pref[prefID].areas as Areas)[areaKeys[i]].cities as City;
		const newCities = resCities[i];

		(pref[prefID].areas as Areas)[areaKeys[i]].cities = updateLocations(
			curCities,
			getLocationObj(newCities),
		) as City;
	}
	return pref;
}

function updateLocations<T extends Areas | City>(
	current: T,
	res: { [key: string]: { url: string } },
) {
	const curKeys = new Set(Object.keys(current as T));
	const newKeys = new Set(Object.keys(res));

	//check if curArea and newArea shares the same keys(area names)
	if (JSON.stringify([...newKeys]) !== JSON.stringify([...curKeys])) {
		//find keys that only exist in curAreaKeys
		const onlyInCurKeys = [...curKeys].filter((key) => !newKeys.has(key));
		const onlyInNewKeys = [...newKeys].filter((key) => !curKeys.has(key));

		//delete area keys that were not found in newAreas
		if (onlyInCurKeys.length > 0) {
			for (const delKey of onlyInCurKeys) {
				console.log("delete from cur:", delKey);
				delete current[delKey];
			}
		}

		//add areas which were not found in curAreas
		if (onlyInNewKeys.length > 0) {
			for (const addKey of onlyInNewKeys) {
				console.log("added to cur:", addKey);
				current[addKey] = res[addKey];
			}
		}
	}

	//check for changed URLs.  If changed, update curAreas
	for (const key of newKeys) {
		if (res[key].url !== current[key as keyof T as string].url) {
			console.log("update cur URL:", key);
			current[key as keyof T as string].url = res[key].url;
		}
	}
	return current as T;
}
