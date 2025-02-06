import type { Context } from "hono";
import {
	extractURLs,
	getURLsFromPrefectures,
	getURLsFromAreas,
	getURLsFromCity,
} from "../crawler/helper.crawler";
import { selectors } from "../selectors/tabelog.selectors";
import { getKV, putKV } from "../kv/helper.kv";
import type {
	OutputArea,
	OutputCity,
	OutputRestaurant,
	InputArea,
	InputCity,
	InputRestaurant,
} from "../crawler/helper.crawler";

export async function getCities(c: Context) {
	const prefs = (await getKV(c.env, "cities")) as OutputCity[];
	if (!prefs) throw new Error("key:cities do not exist.");

	//get updated times of areass
	const updatedTimes = prefs.reduce((acc: { [key: string]: number }, pref) => {
		for (const area of pref.areas) {
			acc[area.time] = acc[area.time]++ || 1;
		}
		return acc;
	}, {});

	const sortedUpdatedTimes = Object.keys(updatedTimes).sort(
		(a, b) => Number.parseInt(a) - Number.parseInt(b),
	);

	sortedUpdatedTimes.map((time) => {
		console.log(new Date(Number.parseInt(time)).toISOString());
	});

	const updateSource = [];
	while (updateSource.length < 6 && sortedUpdatedTimes.length > 0) {
		const pref = prefs.filter((pref) => {
			return pref.areas.some((area) => {
				return area.time === sortedUpdatedTimes[0];
			});
		});
		updateSource.push(...pref);
		sortedUpdatedTimes.shift();
	}

	updateSource.map((pref) => {
		console.log(
			pref.prefecture,
			new Date(Number.parseInt(pref.areas[0].time)).toISOString(),
		);
	});
	//asses only 5 prefs at a time
	const prms = updateSource
		.slice(0, 5)
		.map((pref) =>
			extractURLs(
				c.env,
				selectors.locationNames,
				selectors.locationURLs,
				pref,
				getURLsFromAreas,
				20,
				{ retryCnt: 5 },
			),
		);

	const areaResult = (await Promise.all(prms)) as OutputCity[];

	const cities = prefs.map(
		(pref) => areaResult.find((res: OutputCity) => res.id === pref.id) || pref,
	);

	await putKV(c.env, "cities", cities);

	return c.json(cities);
}
