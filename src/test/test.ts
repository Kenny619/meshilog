import { getKV, putKV } from "../utils/kv/helper.kv";
import type { Shops } from "../type";
import type { Context } from "hono";
import { getMoyori } from "../utils/station/moyori";

export async function test(c: Context) {
	const shops = (await getKV(c.env, "SHOPS")) as Shops;

	const shopArr = Object.values(shops);
	const shop = shopArr[Math.floor(Math.random() * shopArr.length)];

	const moyori = await getMoyori(c.env, shop.coord.lng, shop.coord.lat);

	return c.json({ shop, moyori });
}
