import type { Context } from "hono";
import { getKV, putKV } from "../kv/helper.kv";
import { scrapeRestaurants } from "../crawler/scrapeRestaurants";
import type { Prefecture, Areas, City, Restaurant } from "../../type";

export async function updateRestaurants(c: Context) {
	const prefectures = (await getKV(c.env, "PREFECTURES")) as Prefecture;
	if (!prefectures) throw new Error("key:PREFECTURES do not exist.");
	//find target city
	const target = findOldestUpdatedCity(prefectures);
	const city = (
		(prefectures[target.prefecture].areas as Areas)[target.area].cities as City
	)[target.city];
	if (!city) throw new Error("key:PREFECTURES do not exist.");
	const url = city.url;

	// end result variable
	const restaurants: Restaurant = [];
	//create restaurant listing page urls
	const urls = [];
	for (let p = 1; p <= 60; p++) {
		urls.push(`${url}/rstLst/${p}/?Srt=D&SrtT=rt&sort_mode=1`);
	}

	//exit scraping while loop flag
	let abortScraping = false;

	//scraper
	while (urls.length > 0) {
		///// 10 urls at a time
		const prms = urls.splice(0, 5).map((url) => scrapeRestaurants(url));
		const result = await Promise.all(prms);
		for (const page of result) {
			//if resolved promise is null skip the loop
			if (!page) continue;
			//set abortScraping to true if any score is above threshold
			if (page.scores.some((score) => Number(score) < c.env.SCORES_THRESHOLD))
				abortScraping = true;
			//exit for loop if all scores are below threshold
			if (page.scores.every((score) => Number(score) < c.env.SCORES_THRESHOLD))
				break;

			const restaurantsObj = page.scores
				.map((score, index) => {
					console.log(page.urls[index], score);
					return {
						id: (page.urls[index].match(/^.*\/(.+?)(?=\/?$)/) as string[])[1],
						score: Number(score),
						url: page.urls[index],
					};
				})
				.filter((restaurant) => restaurant.score >= c.env.SCORES_THRESHOLD);
			restaurants.push(...restaurantsObj);
		}
		//exit scraping while loop if a joint with score < SCRORES_THRESHOLD is observed
		if (abortScraping) break;
	}

	//add restaurants to city
	((prefectures[target.prefecture].areas as Areas)[target.area].cities as City)[
		target.city
	] = {
		...city,
		updated: Date.now(),
		restaurants: restaurants,
	};

	//overwrite PREFECTURES KV with updated prefectures obj
	await putKV(c.env, "PREFECTURES", prefectures);
	console.info(
		`[update-restaurant] Success: ${target.prefecture}/${target.area}/${target.city}`,
	);
	return c.json(
		`[update-restaurant] Success: ${target.prefecture}/${target.area}/${target.city}`,
	);
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
