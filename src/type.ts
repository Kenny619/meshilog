//type for location data
export type Prefecture = {
	[k: string]: {
		prefName: string;
		prefURL: string;
		areas?: Areas;
		updated?: number;
	};
};

export type Areas = {
	[k: string]: {
		url: string;
		cities?: City;
	};
};

export type City = {
	[k: string]: {
		url: string;
		updated?: number;
		restaurants?: Restaurant;
	};
};

export type Restaurant = {
	id: string;
	score: number;
	url: string;
	updated?: number;
}[];

export type Shops = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[k: string]: any;
};

export type Stations = {
	id: string;
	name: string;
	line: string;
	company: string;
	pref: string;
	lon: string;
	lat: string;
}[];
