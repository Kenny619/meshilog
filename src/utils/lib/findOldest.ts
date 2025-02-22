import type { Prefecture, Areas, City } from "../../type";

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
