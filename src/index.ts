import { Hono } from "hono";
import { updateRestaurants } from "./utils/endPoint/updateRestaurant";
import { debugLocations } from "./utils/debug/debugLocations";
import { getShopDetails } from "./utils/endPoint/getShopDetails";
import { updateSinglePrefectures } from "./utils/endPoint/updateSinglePrefectures";
const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/prefecture", async (c) => await updateSinglePrefectures(c));
app.get("/restaurant", async (c) => await updateRestaurants(c));
app.get("/shopdetails", async (c) => await getShopDetails(c));
app.get(
	"/debug/:mode",
	async (c) =>
		await debugLocations(
			c,
			c.req.param("mode") as "PREFECTURES" | "cities" | "restaurants",
		),
);
export default app;
