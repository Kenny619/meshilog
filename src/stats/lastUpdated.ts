import type { Context } from "hono";
import type { City, Prefecture, Areas, Restaurant } from "../type";
import { getKV } from "../utils/kv/helper.kv";

export async function lastUpdated(c: Context) {
	const prefs = (await getKV(c.env, "PREFECTURES")) as Prefecture;
	if (!prefs) throw new Error("key:prefs do not exist.");

	type dates = {
		[key: string]: {
			city: number;
			shop: number;
		};
	};

	const dates: dates = {};

	for (const pref in prefs) {
		dates[prefs[pref].prefName] = {
			city: 0,
			shop: 0,
		};

		for (const area in prefs[pref].areas as Areas) {
			for (const city in prefs[pref].areas?.[area].cities as City) {
				const itr = prefs[pref].areas?.[area].cities?.[city]?.updated as number;
				const cur = dates[prefs[pref].prefName].city;
				if (itr > cur) dates[prefs[pref].prefName].city = itr;

				if (!prefs[pref].areas?.[area].cities?.[city]?.restaurants) continue;

				for (const shop of prefs[pref].areas?.[area].cities?.[city]
					.restaurants as Restaurant) {
					if (!shop.updated) continue;
					const itr = shop.updated as number;
					const cur = dates[prefs[pref].prefName].shop;
					if (itr > cur) dates[prefs[pref].prefName].shop = itr;
				}
			}
		}
	}

	return c.json(dates);
}
