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
	InputAreaCity,
	OutputArea,
} from "../crawler/helper.crawler";

export async function fixPrefectures(c: Context) {
	const prefs = (await getKV(c.env, "prefectures")) as InputArea[];
	if (!prefs) throw new Error("key:prefectures do not exist.");

	const fixed = prefs.map((p) => ({
		...p,
		time: Date.now().toString(),
	}));

	await putKV(c.env, "prefectures", fixed);

	return c.json(fixed);
}
