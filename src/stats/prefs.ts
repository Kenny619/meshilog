import type { Context } from "hono";
import type { City, Prefecture, Areas, Restaurant, Shops } from "../type";
import { getKV } from "../utils/kv/helper.kv";

export async function prefecturesCoverage(c: Context) {
	const prefs = (await getKV(c.env, "PREFECTURES")) as Prefecture;
	if (!prefs) throw new Error("key:prefs do not exist.");

	const shops = (await getKV(c.env, "SHOPS")) as Shops;
	if (!shops) throw new Error("key:shops do not exist.");

	type Coverage = {
		[key: string]: {
			shopsTTL: number;
			shopsCovered: number;
			shopsCoverage: number;
		};
	};

	const coverage: Coverage = {};
	const shopIds = Object.keys(shops);

	for (const pref in prefs) {
		coverage[prefs[pref].prefName] = {
			shopsTTL: 0,
			shopsCovered: 0,
			shopsCoverage: 0,
		};

		for (const area in prefs[pref].areas as Areas) {
			for (const city in prefs[pref].areas?.[area].cities as City) {
				coverage[prefs[pref].prefName].shopsTTL +=
					prefs[pref].areas?.[area].cities?.[city].restaurants?.length || 0;

				const coveredIds =
					prefs[pref].areas?.[area].cities?.[city].restaurants?.map(
						(r) => r.id,
					) || [];
				coverage[prefs[pref].prefName].shopsCovered += coveredIds.filter((id) =>
					shopIds.includes(id),
				).length;
			}
		}

		coverage[prefs[pref].prefName].shopsCoverage = Math.round(
			(coverage[prefs[pref].prefName].shopsCovered /
				coverage[prefs[pref].prefName].shopsTTL) *
				100,
		);
	}

	return c.json(coverage);
}
