export const selectors = {
	locationNewURLs:
		"div#tabs-panel-balloon-pref-area > div.list-balloon__list > ul > li > a, #js-leftnavi-area-scroll > div > ul > li > a",
	locationURLs:
		"div#tabs-panel-balloon-pref-area > div.list-balloon__list > ul > li > a, #js-leftnavi-area-scroll > div > ul > li > a",
	locationNames:
		"div#tabs-panel-balloon-pref-area > div.list-balloon__list > ul span:not(.list-balloon__nolink), #js-leftnavi-area-scroll > div > ul > li > a > span:not(.list-balloon__nolink)",
	// "div#tabs-panel-balloon-pref-area > div.list-balloon__list > ul.list-balloon__list-col > li > a > span:not(.list-balloon__nolink), #js-leftnavi-area-scroll > div > ul > li > a > span:not(.list-balloon__nolink)",
	// "div#tabs-panel-balloon-pref-area > div.list-balloon__list > ul.list-balloon__list-col > li.list-balloon__list-item a.c-link-arrow > span:not(.list-balloon__nolink)",
	searchResultScore: "span.list-rst__rating-val",
	searchResultURL: "a.list-rst__rst-name-target",
	restaurant: "#list-area-list > ul > li > a",
};
