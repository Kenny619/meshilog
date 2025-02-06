import type { Context } from "hono";
import {
	extractURLs,
	getURLsFromPrefectures,
	getURLsFromAreas,
} from "../crawler/helper.crawler";
import { selectors } from "../selectors/tabelog.selectors";
import { getKV, putKV } from "../kv/helper.kv";
import type {
	InputArea,
	InputCity,
	OutputAreaCity,
} from "../crawler/helper.crawler";

export async function getAreaCities(c: Context) {
	const prefs = (await getKV(c.env, "prefectures")) as InputArea[];
	if (!prefs) throw new Error("key:prefectures do not exist.");

	//get pref with lowest time value = oldest update time
	const targetPref = lastUpdatedPref(prefs);

	//get areas
	const areaResult = (await extractURLs(
		c.env,
		selectors.locationNames,
		selectors.locationURLs,
		targetPref as InputArea,
		getURLsFromPrefectures,
	)) as InputCity;

	const cities = (await extractURLs(
		c.env,
		selectors.locationNames,
		selectors.locationURLs,
		areaResult as InputCity,
		getURLsFromAreas,
	)) as OutputAreaCity;

	//update prefectures
	const updatedTarget = {
		...prefs.find((p) => p.id === targetPref.id),
		time: Date.now().toString(),
	};
	const updatedPref = prefs.map((p) =>
		p.id === targetPref.id ? updatedTarget : p,
	);

	await putKV(c.env, "prefectures", updatedPref);

	//update cities
	const allCities = (await getKV(c.env, "cities")) as InputCity[];
	const updatedCities = allCities.map((p) => (p.id === cities.id ? cities : p));

	await putKV(c.env, "cities", updatedCities);
	return c.json(updatedCities);
}

function lastUpdatedPref(prefs: InputArea[]) {
	const undefinedTime = prefs.find((p) => p.time === undefined);
	if (undefinedTime) {
		return undefinedTime;
	}

	const lastUpdatedPref = prefs.find(
		(p) =>
			Number.parseInt(p.time) ===
			Math.min(...prefs.map((pref) => Number(pref.time))),
	);
	if (!lastUpdatedPref) throw new Error("lastUpdatedPref do not exist.");
	return lastUpdatedPref;
}
