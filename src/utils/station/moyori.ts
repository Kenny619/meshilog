import { getKV } from "../kv/helper.kv";
import type { Stations } from "../../type";

export async function getMoyori(
	env: CloudflareBindings,
	lon: string,
	lat: string,
) {
	const stations = (await getKV(env, "STATIONS")) as Stations;

	const nearestStation: {
		name: string;
		line: string;
		distance: number;
	}[] = [];

	for (const station of stations) {
		const distance = Math.sqrt(
			(Number(station.lon) - Number(lon)) ** 2 +
				(Number(station.lat) - Number(lat)) ** 2,
		);

		if (calculateDistance(lon, lat, station) < env.DISTANCE_LIMIT) {
			nearestStation.push({
				name: station.name,
				line: station.line,
				distance: calculateDistance(lon, lat, station),
			});
		}
	}

	return nearestStation;
}

//return the shortest distance between 2 coordinates in meters.
function calculateDistance(
	lon: string,
	lat: string,
	station: Stations[number],
) {
	const R = 6371000; // Radius of the Earth in m
	const dLat = (Number(station.lat) - Number(lat)) * (Math.PI / 180);
	const dLon = (Number(station.lon) - Number(lon)) * (Math.PI / 180);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(Number(lat) * (Math.PI / 180)) *
			Math.cos(Number(station.lat) * (Math.PI / 180)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = Math.floor(R * c);

	return distance;
}
