import type { Context } from "hono";
import { getKV } from "../kv/helper.kv";

export async function debugLocations(
	c: Context,
	mode: "prefectures" | "cities" | "restaurants",
) {
	const res = await getKV(c.env, mode);
	if (!res) throw new Error(`key:${mode} do not exist.`);

	return c.json(res);
}
