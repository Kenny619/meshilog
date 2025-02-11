export type SelectorKeys =
	| "locationURLs"
	| "locationNames"
	| "searchResultScore"
	| "searchResultURL"
	| "restaurant";
export type Selector = {
	[key in SelectorKeys]: string;
};
export const selectors: Selector = {
	locationURLs:
		"#tabs-panel-balloon-pref-area > div > ul a, #js-leftnavi-area-scroll > div > ul > li > a",
	locationNames:
		"#tabs-panel-balloon-pref-area > div > ul span:not(.list-balloon__nolink), #js-leftnavi-area-scroll > div > ul > li > a > span:not(.list-balloon__nolink)",
	searchResultScore: "span.list-rst__rating-val",
	searchResultURL: "a.list-rst__rst-name-target",
	restaurant: "#list-area-list > ul > li > a",
};
