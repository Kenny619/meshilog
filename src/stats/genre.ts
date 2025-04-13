import type { Context } from "hono";
import type { Shops } from "../type";
import { getKV } from "../utils/kv/helper.kv";

export async function genre(c: Context) {
	const shops = (await getKV(c.env, "SHOPS")) as Shops;
	if (!shops) throw new Error("key:shops do not exist.");

	type GenreStats = {
		[genre: string]: number;
	};

	const genreStats: GenreStats = {};

	for (const id in shops) {
		const genres = shops[id].genre.split("、");
		for (const genre of genres) {
			if (!Object.hasOwn(genreStats, genre)) {
				genreStats[genre] = 0;
			}
			genreStats[genre]++;
		}
	}

	console.log(JSON.stringify(genreStats, null, 2));
	return c.json(genreStats);
}
