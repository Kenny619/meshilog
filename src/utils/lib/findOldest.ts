import type { Prefecture, Restaurant } from "../../type";

export function findOldest(location: Prefecture) {
	//find prefecture with no updated value
	const prefID = Object.keys(location).find(
		(prefID) => location[prefID].updated === undefined,
	);
	if (prefID) {
		return {
			[prefID]: location[prefID],
		};
	}

	//find prefecture with smallest updated value
	const oldesttime = Object.values(location).map((p) => p.updated) as number[];
	const oldestpref = Object.keys(location).find(
		(prefID) => location[prefID].updated === Math.min(...oldesttime),
	) as string;
	return {
		[oldestpref]: location[oldestpref],
	};
}

export function findOldestUpdatedRestaurant(location: Prefecture) {
	//find Restaurant object with smallest updated value and return its parent prefID, areaID, cityID
	const result = {
		prefecture: "",
		area: "",
		city: "",
		restaurant: {} as Restaurant[number],
	};

	for (const [prefID, prefData] of Object.entries(location)) {
		for (const [areaID, areaData] of Object.entries(prefData.areas || {})) {
			for (const [cityID, cityData] of Object.entries(areaData.cities || {})) {
				for (const restaurant of cityData.restaurants || []) {
					if (restaurant.updated === undefined) {
						return {
							prefecture: prefID,
							area: areaID,
							city: cityID,
							restaurant: restaurant,
						};
					}
					if (result.restaurant === null) {
						result.prefecture = prefID;
						result.area = areaID;
						result.city = cityID;
						result.restaurant = restaurant;
					}
					if (
						result.restaurant !== null &&
						Object.hasOwn(result.restaurant, "updated") &&
						restaurant.updated < (result.restaurant.updated as number)
					) {
						result.prefecture = prefID;
						result.area = areaID;
						result.city = cityID;
						result.restaurant = restaurant;
					}
				}
			}
		}
	}

	return result;
}
