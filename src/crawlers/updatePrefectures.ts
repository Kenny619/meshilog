import type { Context } from "hono";
import { getKV, putKV } from "../utils/kv/helper.kv";
import { scrapeLocation } from "../utils/crawler/scrapeLocation";

type Prefecture = {
	[k: string]: {
		prefName: string;
		prefURL: string;
		areas?: Areas;
	};
};

type Areas = {
	[k: string]: {
		url: string;
		cities?: City;
	};
};

type City = {
	[k: string]: {
		url: string;
		updated?: number;
		restaurants?: string[];
	};
};

export async function updatePrefectures(c: Context) {
	const prefs = (await getKV(c.env, "PREFECTURES")) as Prefecture;
	if (!prefs) throw new Error("key:PREFECTURES do not exist.");

	//scrape areas
	const resAreas = await Promise.all(
		Object.values(prefs).map((p) => scrapeLocation(p.prefURL)),
	);

	const updatedAreas = updateAreas(prefs, resAreas);

	//set city
	const resCities = await Promise.all(
		Object.values(updatedAreas).map(async (p) =>
			Object.values(p.areas as Areas).map((area) => scrapeLocation(area.url)),
		),
	);

	const updatedCities = await updateCities(updatedAreas, resCities);
	//await putKV(c.env, "PREFECTURES", updatedCities);
	console.log(updatedCities);

	// console.log("update Success: Prefectures");
	//return c.json("update Success: Prefectures");
	return c.json(updatedCities);
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

function updateAreas(
	pref: Prefecture,
	resAreas: { names: string[]; urls: string[] }[],
) {
	const prefKeys = Object.keys(pref);
	//use i to track Prefecture key and corresponding resAreas[]
	for (let i = 0; i < prefKeys.length; i++) {
		pref[prefKeys[i]].areas = updateLocations(
			pref[prefKeys[i]].areas as Areas,
			getLocationObj(resAreas[i]),
		);
	}

	return pref;
}

async function updateCities(
	pref: Prefecture,
	resCities: Promise<{ names: string[]; urls: string[] }>[][],
) {
	const prefKeys = Object.keys(pref);
	for (let i = 0; i < prefKeys.length; i++) {
		const p = pref[prefKeys[i]];
		const areaKeys = Object.keys(p.areas as Areas);

		for (let j = 0; j < areaKeys.length; j++) {
			const curCities = (p.areas as Areas)[areaKeys[j]].cities as City;
			const curCityKeys = new Set(Object.keys(curCities));
			const newCities = await resCities[i][j];

			(p.areas as Areas)[areaKeys[j]].cities = updateLocations(
				curCities,
				getLocationObj(newCities),
			) as City;
		}
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
				delete current[delKey];
			}
		}

		//add areas which were not found in curAreas
		if (onlyInNewKeys.length > 0) {
			for (const addKey of onlyInNewKeys) {
				current[addKey] = res[addKey];
			}
		}
	}

	//check for changed URLs.  If changed, update curAreas
	for (const key of curKeys) {
		if (!Object.hasOwn(current, key)) {
			console.log("current:", current, "key:", key);
		}
		if (!Object.hasOwn(res, key)) {
			console.log("res:", res, "key:", key);
		}
		if (current[key as keyof T as string].url !== res[key].url) {
			current[key as keyof T as string].url = res[key].url;
		}
	}
	return current as T;
}
