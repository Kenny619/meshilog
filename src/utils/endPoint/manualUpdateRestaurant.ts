import type { Context } from "hono";
import { getKV, putKV } from "../kv/helper.kv";
import { scrapeRestaurants } from "../crawler/scrapeRestaurants";
import type { Prefecture, Areas, City, Restaurant } from "../../type";

export async function manualUpdateRestaurant(c: Context) {
	const errMsgPrefix = "manualUpdateRestaurant failed.";

	//get PREFECTURES
	let prefectures: Prefecture | null = null;
	try {
		prefectures = (await getKV(c.env, "PREFECTURES")) as Prefecture;
	} catch (e) {
		throw new Error(`${errMsgPrefix}. key:PREFECTURES do not exist.`);
	}

	//find target city
	const target = findOldestUpdatedCity(prefectures);
	const targetCity = (
		(prefectures[target.prefecture].areas as Areas)[target.area].cities as City
	)[target.city];

	if (!targetCity) throw new Error(`${errMsgPrefix}. target: ${target}`);

	const url = targetCity.url;
	if (!url)
		throw new Error(
			`${errMsgPrefix}. target: ${target}. targetCity: ${targetCity}`,
		);

	//create restaurant listing page urls
	const urls = [];
	for (let p = 1; p <= 60; p++) {
		urls.push(`${url}/rstLst/${p}/?Srt=D&SrtT=rt&sort_mode=1`);
	}

	const restaurants: Restaurant = [];
	let res: ({ scores: string[]; urls: string[] } | null)[] = [];
	//scrape restaurant urls
	try {
		res = await Promise.all(urls.map((url) => scrapeRestaurants(url, c.env)));
	} catch (e) {
		throw new Error(`${errMsgPrefix}. ${e}`);
	}

	for (const page of res) {
		if (!page) continue;
		for (const [index, score] of page.scores.entries()) {
			if (Number(score) < c.env.SCORES_THRESHOLD) continue;
			restaurants.push({
				id: page.urls[Number(index)],
				score: Number(score),
				url: page.urls[Number(index)],
			});
		}
	}

	//update city
	((prefectures[target.prefecture].areas as Areas)[target.area].cities as City)[
		target.city
	] =
		restaurants.length > 0
			? {
					...targetCity,
					updated: Date.now(),
					restaurants,
				}
			: {
					...targetCity,
					updated: Date.now(),
				};

	//overwrite PREFECTURES KV with updated prefectures obj
	try {
		await putKV(c.env, "PREFECTURES", prefectures);
	} catch (e) {
		throw new Error(`${errMsgPrefix}. ${e}`);
	}

	if (restaurants.length > 0) {
		console.log("res", res);
		console.log("restaurants", restaurants);
		console.log("url", url);
	}

	return c.text(
		`[update-restaurant] Success: ${target.prefecture}/${target.area}/${target.city}`,
	);
	// return c.json(
	// 	`[update-restaurant] Success: ${target.prefecture}/${target.area}/${target.city}`,
	// );
}

function findOldestUpdatedCity(prefectures: Prefecture) {
	let oldestUpdateTime = Date.now();
	const oldestUpdatedCity: {
		prefecture: keyof Prefecture;
		area: keyof Areas;
		city: keyof City;
		updated: number;
	} = {
		prefecture: "",
		area: "",
		city: "",
		updated: 0,
	};
	for (const [prefID, pref] of Object.entries(prefectures)) {
		for (const [areaID, area] of Object.entries(pref.areas as Areas)) {
			for (const [cityID, city] of Object.entries(area.cities as City)) {
				//return if updated=undefined is found
				if (!Object.hasOwn(city, "updated")) {
					return {
						prefecture: prefID as keyof Prefecture,
						area: areaID as keyof Areas,
						city: cityID as keyof City,
					};
				}

				//otherwise, find the oldest updated city
				if ((city.updated as number) < oldestUpdateTime) {
					oldestUpdateTime = city.updated as number;
					oldestUpdatedCity.prefecture = prefID as keyof Prefecture;
					oldestUpdatedCity.area = areaID as keyof Areas;
					oldestUpdatedCity.city = cityID as keyof City;
					oldestUpdatedCity.updated = city.updated as number;
				}
			}
		}
	}
	return oldestUpdatedCity;
}

function countAreaCity(prefectures: Prefecture) {
	let areaCnt = 0;
	let cityCnt = 0;
	for (const [prefID, pref] of Object.entries(prefectures)) {
		for (const [areaID, area] of Object.entries(pref.areas as Areas)) {
			areaCnt++;
			for (const [cityID, city] of Object.entries(area.cities as City)) {
				cityCnt++;
			}
		}
	}
	console.log({ areaCnt, cityCnt });
}
