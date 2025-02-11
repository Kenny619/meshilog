import type { Context } from "hono";
import { getKV, putKV } from "../kv/helper.kv";
import { scrapeLocation } from "../crawler/scrapeLocation";

type Prefecture = {
	[k: string]: {
		prefName: string;
		prefURL: string;
		areas?: Areas;
	};
};

type Areas = {
	[k: string]: {
		url: string;
		cities?: City;
	};
};

type City = {
	[k: string]: {
		url: string;
		updated?: number;
		restaurants?: string[];
	};
};

export async function getCity(c: Context) {
	const prefs = (await getKV(c.env, "PREFECTURES")) as Prefecture;
	if (!prefs) throw new Error("key:PREFECTURES do not exist.");

	await updatePrefecture(prefs);
	await putKV(c.env, "PREFECTURES", prefs);
	console.log("update Success: Prefectures");
	return c.json("update Success: Prefectures");
}

function getLocationObj(response: { names: string[]; urls: string[] }) {
	return response.names.reduce(
		(acc, cur, index) => {
			acc[cur] = {
				url: response.urls[index],
			};
			return acc;
		},
		{} as Record<string, { url: string }>,
	);
}

async function updatePrefecture(pref: Prefecture) {
	//update time
	// for (const p of Object.values(pref)) {
	// 	p.updated = Date.now();
	// }

	//set area
	const resAreas = await Promise.all(
		Object.values(pref).map((p) => scrapeLocation(p.prefURL)),
	);
	for (let i = 0; i < resAreas.length; i++) {
		pref[Object.keys(pref)[i] as keyof typeof pref].areas = getLocationObj(
			resAreas[i],
		);
	}

	//set city
	const cityPromises = Object.values(pref).map((p) =>
		Object.values(p.areas as Areas).map((a) => scrapeLocation(a.url)),
	);

	const cityArr = await Promise.all(cityPromises);

	for (let i = 0; i < cityArr.length; i++) {
		//indicates prefecture
		const p = pref[Object.keys(pref)[i] as keyof typeof pref];
		for (let j = 0; j < Object.keys(p.areas as Areas).length; j++) {
			const area = Object.keys(p.areas as Areas)[j];
			(p.areas as Areas)[area].cities = getLocationObj(await cityArr[i][j]);
		}
	}
}
