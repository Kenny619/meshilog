import type { Context } from "hono";
import { extractURLs, getURLsFromCity } from "../crawler/helper.crawler";
import { selectors } from "../selectors/tabelog.selectors";
import { getKV, putKV } from "../kv/helper.kv";
import type {
	OutputAreaCity,
	OutputRestaurant,
} from "../crawler/helper.crawler";

export async function lastUpdated(c: Context) {
	const arr = (await getKV(c.env, "cities")) as OutputAreaCity[];
	if (!arr) throw new Error("key:cities do not exist.");

	let minTime = 999999999999999;
	let earlyExitFlg = false;
	let lastUpdatedCity: OutputAreaCity | null = null;

	for (const pref of arr) {
		if (earlyExitFlg) break;
		for (const area of pref.areas) {
			if (earlyExitFlg) break;
			for (const city of area.cities) {
				if (!Object.hasOwn(city, "time")) {
					lastUpdatedCity = {
						...pref,
						areas: [
							{
								...area,
								cities: [
									{
										...city,
									},
								],
							},
						],
					};
					earlyExitFlg = true;
					break;
				}
				if (Number.parseInt(city.time as string) < minTime) {
					minTime = Number.parseInt(city.time as string);
					lastUpdatedCity = {
						...pref,
						areas: [
							{
								...area,
								cities: [
									{
										...city,
									},
								],
							},
						],
					};
				}
			}
		}
	}
	return c.json(lastUpdatedCity);
}
