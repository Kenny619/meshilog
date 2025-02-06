import type { Context } from "hono";
import { getKV, putKV } from "../kv/helper.kv";
import type { OutputAreaCity } from "../crawler/helper.crawler";
export async function fixAreaCities(c: Context) {
	const prefs = (await getKV(c.env, "prefectures")) as OutputAreaCity[];
	if (!prefs) throw new Error("key:prefectures do not exist.");

	const updatedPref = prefs.map((p) => {
		if (p.id === "aomori" || p.id === "iwate" || p.id === "miyagi") {
			return {
				url: p.url,
				prefecture: p.prefecture,
				id: p.id,
			};
		}
		return p;
	});

	await putKV(c.env, "prefectures", updatedPref);

	return c.json(prefs);
}
