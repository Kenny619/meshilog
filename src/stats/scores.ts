import type { Context } from "hono";
import type { Shops } from "../type";
import { getKV } from "../utils/kv/helper.kv";

export async function scoreReviews(c: Context) {
	const shops = (await getKV(c.env, "SHOPS")) as Shops;
	if (!shops) throw new Error("key:shops do not exist.");

	type scores = {
		[score: string]: {
			[reviews: string]: number;
		};
	};

	const scores: scores = {};

	for (const id in shops) {
		if (!Object.hasOwn(scores, shops[id].score)) {
			scores[shops[id].score] = {};
		}
		if (!Object.hasOwn(scores[shops[id].score], shops[id].rev)) {
			scores[shops[id].score][shops[id].rev] = 0;
		}
		scores[shops[id].score][shops[id].rev]++;
	}

	console.log(JSON.stringify(scores, null, 2));
	return c.json(scores);
}
