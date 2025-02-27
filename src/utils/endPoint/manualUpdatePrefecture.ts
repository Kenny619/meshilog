import type { Context } from "hono";
import { getKV, putKV } from "../kv/helper.kv";
import { scrapeLocation } from "../crawler/scrapeLocation";
import type { Prefecture, Areas, City } from "../../type";
import { findOldest } from "../lib/findOldest";
export async function manualUpdatePrefecture(c: Context) {
	const errMsgPrefix = "manualUpdatePrefecture failed. ";

	//get PREFECTURES from KV
	let prefs: Prefecture = {};
	try {
		prefs = (await getKV(c.env, "PREFECTURES")) as Prefecture;
	} catch (e) {
		throw new Error(`${errMsgPrefix} ${e}`);
	}

	//if prefID was passed as a parameter e.g. /man/prefecture/tokyo
	//set passed parameter to prefID
	//otherwise find the oldest updated prefecture from KV
	let prefID = "";
	if (c.req.param("prefID")) {
		prefID = c.req.param("prefID");
	} else {
		const targetPref = findOldest(prefs);
		prefID = Object.keys(targetPref)[0];
	}

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
		await putKV(c.env, "PREFECTURES", prefUpdatedCities);
	} catch (e) {
		throw new Error(`${errMsgPrefix} ${e}`);
	}

	return c.text(`[update-prefecture] Success: ${prefID}`);
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
