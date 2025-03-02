import { Hono } from "hono";
import type { Context } from "hono";
import { updateRestaurants } from "./utils/endPoint/updateRestaurant";
import { getShopDetails } from "./utils/endPoint/getShopDetails";
import { updateSinglePrefecture } from "./utils/endPoint/updateSinglePrefecture";
import { manualUpdatePrefecture } from "./utils/endPoint/manualUpdatePrefecture";
import { manualUpdateRestaurant } from "./utils/endPoint/  ";
import { debugLocations } from "./utils/debug/debugLocations";
const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/shopdetails", async (c) => await getShopDetails(c));
app.get("/man/restaurant", async (c) => await manualUpdateRestaurant(c));
app.get("/man/prefecture", async (c) => await manualUpdatePrefecture(c));

app.get(
	"/man/prefecture/:prefID",
	async (c) => await manualUpdatePrefecture(c),
);
app.get(
	"/debug/:mode",
	async (c) =>
		await debugLocations(
			c,
			c.req.param("mode") as "PREFECTURES" | "cities" | "restaurants",
		),
);
//export default app;
export default {
	async scheduled(
		event: ScheduledEvent,
		env: CloudflareBindings,
		ctx: ExecutionContext,
	) {
		switch (event.cron) {
			case "*/30 * * * *": {
				const delayedProcessing = async () => {
					const res = await updateSinglePrefecture(env);
					console.log(res);
				};
				ctx.waitUntil(delayedProcessing());
				break;
			}
			case "*/1 * * * *": {
				const delayedProcessing = async () => {
					const res = await updateRestaurants(env);
					console.log(res);
				};
				ctx.waitUntil(delayedProcessing());
				break;
			}
		}
	},

	fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext) {
		return app.fetch(request, env, ctx);
	},
};
