import type { Context } from "hono";
import type { Shops, ShopParams } from "../../type";
import { getKV } from "../kv/helper.kv";

export async function getShops(c: Context) {
	const shops = (await getKV(c.env, "SHOPS")) as Shops;
	if (!shops) throw new Error("key:shops do not exist.");

	const params = c.req.query() as unknown as ShopParams;

	const lastUpdated = shops.lastUpdated;
	return c.json({ lastUpdated });
}
