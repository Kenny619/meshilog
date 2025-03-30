import { Hono } from "hono";
import { updateShops } from "./crawlers/updateShops";
import { updateRestaurants } from "./crawlers/updateRestaurant";
import { updateSinglePrefecture } from "./crawlers/updateSinglePrefecture";
import { manualUpdatePrefecture } from "./crawlers/manualUpdatePrefecture";
import { manualUpdateRestaurant } from "./crawlers/manualUpdateRestaurant";
import { debugLocations } from "./utils/debug/debugLocations";
import { manualUpdateShops } from "./crawlers/manualShopsDetails";

const app = new Hono<{ Bindings: CloudflareBindings }>();

//// SHOPS APIs

//// MANUAL UPDATES
//app.get("/man/shopdetails", async (c) => await manualUpdateShops(c));
app.get("/man/shopsdetails", async (c) => await manualUpdateShops(c));
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
			c.req.param("mode") as "PREFECTURES" | "cities" | "restaurants" | "SHOPS",
		),
);

//// Crawler
export default {
	async scheduled(
		event: ScheduledEvent,
		env: CloudflareBindings,
		ctx: ExecutionContext,
	) {
		switch (event.cron) {
			case "* */6 * * * *": {
				const delayedProcessing = async () => {
					const res = await updateSinglePrefecture(env);
					console.log(res);
				};
				ctx.waitUntil(delayedProcessing());
				break;
			}
			case "*/5 * * * *": {
				const delayedProcessing = async () => {
					const res = await updateRestaurants(env);
					console.log(res);
				};
				ctx.waitUntil(delayedProcessing());
				break;
			}
			case "*/1 * * * *": {
				const delayedProcessing = async () => {
					const res = await updateShops(env);
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
