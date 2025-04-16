import type { Context } from "hono";
import type { Shops, Prefecture, Areas, City, Restaurant } from "../type";
import { getKV } from "../utils/kv/helper.kv";

export async function historyShops(c: Context) {
	const shops = (await getKV(c.env, "SHOPS")) as Shops;
	if (!shops) throw new Error("key:shops do not exist.");

	const prefs = (await getKV(c.env, "PREFECTURES")) as Prefecture;
	if (!prefs) throw new Error("key:prefs do not exist.");

	type History = {
		id: string;
		prefName: string;
		areaName: string;
		cityName: string;
		updated: number;
		name: string;
	};

	let minUpdatedAt = 0;
	let history: History[] = [];

	for (const prefID in prefs) {
		const prefName = prefs[prefID].prefName;
		for (const areaID in prefs[prefID].areas as Areas) {
			const areaName = areaID;
			for (const cityID in prefs[prefID].areas?.[areaID]?.cities as City) {
				const cityName = cityID;
				if (!prefs[prefID].areas?.[areaID]?.cities?.[cityID]?.restaurants)
					continue;
				for (const restaurantObj of prefs[prefID].areas?.[areaID]?.cities?.[
					cityID
				]?.restaurants as Restaurant) {
					const name = shops[restaurantObj.id]?.name ?? "";
					if (history.length <= 2000) {
						history.push({
							id: restaurantObj.id,
							prefName: prefName,
							areaName: areaName,
							cityName: cityName,
							updated: restaurantObj.updated as number,
							name,
						});
						minUpdatedAt =
							minUpdatedAt === 0
								? (restaurantObj.updated as number)
								: (restaurantObj.updated as number) < minUpdatedAt
									? (restaurantObj.updated as number)
									: minUpdatedAt;
					} else if ((restaurantObj.updated as number) > minUpdatedAt) {
						history = history.filter((h) => h.updated !== minUpdatedAt);
						history.push({
							id: restaurantObj.id,
							prefName: prefName,
							areaName: areaName,
							cityName: cityName,
							updated: restaurantObj.updated as number,
							name,
						});
						minUpdatedAt = Math.min(...history.map((h) => h.updated));
					}
				}
			}
		}
	}

	return c.json(history);
}
