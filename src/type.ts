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

export type ShopParams = {
	search: string | undefined;
	coord:
		| {
				lat: number;
				lon: number;
		  }
		| undefined;
	station:
		| {
				name: string;
				distance: string;
		  }
		| undefined;

	filter:
		| {
				genre: string[];
				award: boolean;
				reservation: boolean;
				smoking: boolean;
				open: boolean;
				budget: {
					min: number;
					max: number;
				};
				payment: string[];
				parking: boolean;
				private: boolean;
				rentout: boolean;
		  }
		| undefined;
};
