import type { Context } from "hono";
import { extractURLs, getURLsFromCity } from "../crawler/helper.crawler";
import { selectors } from "../selectors/tabelog.selectors";
import { getKV, putKV } from "../kv/helper.kv";
import type {
	OutputAreaCity,
	OutputRestaurant,
} from "../crawler/helper.crawler";

export async function getRestaurants(c: Context) {
	const cities = (await getKV(c.env, "cities")) as OutputAreaCity[];
	if (!cities) throw new Error("key:cities do not exist.");
	const targetCity = findLastUpdatedCity(cities);
	if (!targetCity) throw new Error("targetCity do not exist.");

	//get restaurants
	const restaurants = (await extractURLs(
		c.env,
		selectors.searchResultScore,
		selectors.searchResultURL,
		targetCity?.areas[0].cities[0],
		getURLsFromCity,
		20,
		{ retryCnt: 7 },
	)) as OutputRestaurant;

	//update restaurants
	try {
		const allRestaurants = (await getKV(
			c.env,
			"restaurants",
		)) as OutputRestaurant[];

		const restaurantsToPut = updateArray(allRestaurants, restaurants);
		await putKV(c.env, "restaurants", restaurantsToPut);
	} catch (e) {
		await putKV(c.env, "restaurants", [restaurants]);
	}

	//update cities
	await putKV(c.env, "cities", updateArray(cities, targetCity));

	return c.json(restaurants);
}

function updateArray<T extends OutputRestaurant | OutputAreaCity>(
	arr: T[],
	obj: T,
): T[] {
	if (Object.hasOwn(obj, "restaurants")) {
		//assert type of obj to be OutputRestaurant
		const objAsRestaurant = obj as OutputRestaurant;
		const arrAsRestaurant = arr as OutputRestaurant[];
		const existFlg = arrAsRestaurant.findIndex(
			(city) => city.cityUrl === objAsRestaurant.cityUrl,
		);
		return existFlg !== -1
			? (arrAsRestaurant.map((city) =>
					city.cityUrl === objAsRestaurant.cityUrl ? objAsRestaurant : city,
				) as T[])
			: ([...arrAsRestaurant, objAsRestaurant] as T[]);
	}

	const arrAsAreaCity = arr as OutputAreaCity[];
	const objAsAreaCity = obj as OutputAreaCity;

	const pref = arrAsAreaCity.find((pref) => pref.id === objAsAreaCity.id);
	if (!pref) throw new Error("pref do not exist.");

	const area = pref.areas.find(
		(area) => area.url === objAsAreaCity.areas[0].url,
	);
	if (!area) throw new Error("area do not exist.");

	const city = area.cities.find(
		(city) => city.url === objAsAreaCity.areas[0].cities[0].url,
	);
	if (!city) throw new Error("city do not exist.");

	city.time = Date.now().toString();

	return arrAsAreaCity as T[];
}

function findLastUpdatedCity(arr: OutputAreaCity[]) {
	let lastUpdatedCity: OutputAreaCity | null = null;
	let minTime = 999999999999999;
	let earlyExitFlg = false;

	for (const pref of arr) {
		if (earlyExitFlg) break;
		for (const area of pref.areas) {
			if (earlyExitFlg) break;
			for (const city of area.cities) {
				if (!Object.hasOwn(city, "time")) {
					lastUpdatedCity = {
						...pref,
						areas: [
							{
								...area,
								cities: [
									{
										...city,
									},
								],
							},
						],
					};
					earlyExitFlg = true;
					break;
				}
				if (Number.parseInt(city.time as string) < minTime) {
					minTime = Number.parseInt(city.time as string);
					lastUpdatedCity = {
						...pref,
						areas: [
							{
								...area,
								cities: [
									{
										...city,
									},
								],
							},
						],
					};
				}
			}
		}
	}
	return lastUpdatedCity;
}
