export type SelectorKeys =
	| "locationURLs"
	| "locationNames"
	| "searchResultScore"
	| "searchResultURL"
	| "restaurant";
export type Selector = {
	[key in SelectorKeys]: {
		selector: string;
		subSelector?: string;
		type: "link" | "links" | "text" | "texts";
	};
};
export const selectors: Selector = {
	locationURLs: {
		selector: "#tabs-panel-balloon-pref-area > div > ul a",
		subSelector: "#js-leftnavi-area-scroll > div > ul > li > a",
		type: "links",
	},

	locationNames: {
		selector:
			"#tabs-panel-balloon-pref-area > div > ul span:not(.list-balloon__nolink)",
		subSelector: "#js-leftnavi-area-scroll > div > ul > li > a > span",
		type: "texts",
	},
	searchResultScore: {
		selector: "span.list-rst__rating-val",
		type: "texts",
	},
	searchResultURL: {
		selector: "a.list-rst__rst-name-target",
		type: "links",
	},
	restaurant: {
		selector: "#list-area-list > ul > li > a",
		type: "texts",
	},
};
