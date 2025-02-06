import { getAreaList } from "./helper.crawler";
import { getKV } from "../kv/helper.kv";

export async function getAllPrefectures(env: CloudflareBindings) {
	const kv = await getKV(env, "prefectures");
	if (kv.data === null) throw new Error(kv.err);

	const areas = await getAreaList(env, {
		name: "東京都",
		url: "https://tabelog.com/tokyo/",
	});
	if (areas.data === null) {
		return { err: areas.err, data: null };
	}

	const citiesPRMS = areas.data.result.map(
		(area: { name: string; url: string }) => {
			return getAreaList(env, area);
		},
	);

	const cities = (await Promise.all(citiesPRMS))
		.filter((r) => r.data !== null)
		.map((r) => {
			return {
				area: r.data.name,
				url: r.data.url,
				cities: r.data.result,
			};
		});

	const failed = cities.filter((r) => r.cities === null);
	if (failed.length > 0) console.log(failed);

	return cities;
}
