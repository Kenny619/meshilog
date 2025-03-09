import type { Context } from "hono";
import type { Prefecture, Restaurant, Shops } from "../type";
import { getKV, putKV } from "../utils/kv/helper.kv";
import { findOldestUpdatedRestaurant } from "../utils/lib/findOldest";
import { getMoyori } from "../utils/station/moyori";
// import type { OutputRestaurant } from "../crawler/helper.crawler";

export async function updateShops(env: CloudflareBindings) {
	const errMsgPrefix = "updateShops failed.";

	//get PREFECTURES
	let prefs: Prefecture | null = null;
	try {
		prefs = (await getKV(env, "PREFECTURES")) as Prefecture;
	} catch (e) {
		throw new Error(`${errMsgPrefix}. key:PREFECTURES do not exist.`);
	}

	//get restaurant with the smallest updated time value or no updated value
	const target = findOldestUpdatedRestaurant(prefs);
	if (!target) throw new Error("invalid targetRestaurants");

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const metaData: Record<string, any> = {};
	metaData.url = target.restaurant.url;

	// const res: string[] = Array(18).fill("");
	const res: string[] = Array(18).fill("");
	let warning = "";
	const gmapText: string[] = [];

	try {
		const response = await fetch(target.restaurant.url);
		if (!response.ok) throw new Error(response.statusText);

		const rewriter = new HTMLRewriter()
			.on("img.rstinfo-table__map-image", new ElementHandler(gmapText))
			.on("a.rst-status-badge-red__text", {
				text({ text }) {
					warning = text;
				},
			})
			.on(tSelector(2, 1), {
				text({ text }) {
					res[0] += text;
				},
			})
			.on(tSelector(2, 2), {
				text({ text }) {
					res[1] += text;
				},
			})
			.on(tSelector(2, 3), {
				text({ text }) {
					res[2] += text;
				},
			})
			.on(tSelector(2, 4), {
				text({ text }) {
					res[3] += text;
				},
			})
			.on(tSelector(2, 5), {
				text({ text }) {
					res[4] += text;
				},
			})
			.on(tSelector(2, 6), {
				text({ text }) {
					res[5] += text;
				},
			})
			.on(tSelector(2, 7), {
				text({ text }) {
					res[6] += text;
				},
			})
			.on(tSelector(2, 8), {
				text({ text }) {
					res[7] += text;
				},
			})
			.on(tSelector(2, 9), {
				text({ text }) {
					res[8] += text;
				},
			})
			.on(tSelector(2, 10), {
				text({ text }) {
					res[9] += text;
				},
			})
			.on(tSelector(2, 11), {
				text({ text }) {
					res[10] += text;
				},
			})
			.on(tSelector(4, 1), {
				text({ text }) {
					res[11] += text;
				},
			})
			.on(tSelector(4, 2), {
				text({ text }) {
					res[12] += text;
				},
			})
			.on(tSelector(4, 3), {
				text({ text }) {
					res[13] += text;
				},
			})
			.on(tSelector(4, 4), {
				text({ text }) {
					res[14] += text;
				},
			})
			.on(tSelector(4, 5), {
				text({ text }) {
					res[15] += text;
				},
			})
			.on(
				"dl.rdheader-subinfo__item.rdheader-subinfo__item--station > dd > div > div.linktree__childbox > div > ul > li:nth-child(1)",
				{
					text({ text }) {
						res[16] += text;
					},
				},
			)
			.on("span.rdheader-rating__score-val-dtl", {
				text({ text }) {
					res[17] += text;
				},
			});

		await rewriter.transform(response).arrayBuffer();
	} catch (e) {
		throw new Error(`${errMsgPrefix}. ${e}`);
	}

	metaData.warning = warning ? warning : null;

	for (const str of res) {
		extractor(str, metaData);
	}

	metaData.coord = getCoordinates(gmapText[0]);
	metaData.stations = await getMoyori(
		env,
		metaData.coord.lng,
		metaData.coord.lat,
	);

	//update restaurant update time
	for (const restaurant of prefs[target.prefecture].areas?.[target.area]
		.cities?.[target.city].restaurants || []) {
		if (restaurant.id === target.restaurant.id) {
			restaurant.updated = Date.now();
		}
	}

	try {
		await putKV(env, "PREFECTURES", prefs);

		const curShops = (await getKV(env, "SHOPS")) as Shops;
		const addedShops = { ...curShops, [target.restaurant.id]: metaData };
		await putKV(env, "SHOPS", addedShops);
		return `[update-shopDetail] Success: ${target.prefecture}/${target.area}/${target.city} ${target.restaurant.id}`;
	} catch (e) {
		throw new Error(`${errMsgPrefix}. ${e}`);
	}
}
function getCoordinates(gmapText: string) {
	const gt = decodeURIComponent(gmapText).replace(/&amp;/g, "&");
	const urlParams = new URLSearchParams(new URL(gt).search);
	const coordStr = urlParams.get("center");
	if (coordStr) {
		const coords = coordStr.split(",");
		return { lat: coords[0], lng: coords[1] };
	}
	return { lat: null, lng: null };
}
function tSelector(tableNum: number, row: number) {
	return `#rst-data-head > table:nth-child(${tableNum.toString()}) > tbody > tr:nth-child(${row.toString()})`;
}
// function uSelector(row: number) {
// 	return `#rst-data-head > table:nth-child(4) > tbody > tr:nth-child(${row.toString()})`;
// }
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function extractor(text: string, metaData: Record<string, any>) {
	const trimmedText = text.replace(/[\n\r\t]/g, "").replace(/\s+/g, " ");
	if (/店名/.test(trimmedText)) {
		metaData.name = trimmedText.replace("店名", "").trim();
	}
	if (/受賞/.test(trimmedText)) {
		const awardText = trimmedText
			.replace(/受賞・|選出歴/g, "")
			.replace(/\s*/g, "")
			.trim();

		for (let y = new Date().getFullYear() + 1; y >= 2000; y--) {
			if (awardText.includes(y.toString())) {
				metaData.award = y;
				break;
			}
		}
	}
	if (/ジャンル/.test(trimmedText)) {
		metaData.genre = trimmedText.replace("ジャンル", "").trim();
	}
	if (/お問い合わせ\s*\d{2,4}-\d{2,4}-\d{2,4}/.test(trimmedText)) {
		metaData.phone = trimmedText.replace(/お問い合わせ|予約・/g, "").trim();
	}
	if (/予約可否/.test(trimmedText)) {
		const reserve = trimmedText.replace("予約可否", "").trim();
		if (/予約可/.test(reserve)) {
			metaData.reserve = "可";
		} else if (/予約不可/.test(reserve)) {
			metaData.reservation = "不可";
		} else if (/完全予約制/.test(reserve)) {
			metaData.reservation = "完全予約制";
		} else {
			metaData.reservation = "不明";
		}
	}
	if (/住所/.test(trimmedText)) {
		metaData.address = trimmedText
			.replace(/住所|大きな地図を見る|周辺のお店を探す/g, "")
			.trim();
	}
	if (/交通手段/.test(trimmedText)) {
		metaData.access = trimmedText.replace("交通手段", "").trim();
	}
	if (/営業時間/.test(trimmedText)) {
		//２４時間営業
		//営業時間・定休日は変更となる場合がございますので、ご来店前に店舗にご確認ください。
		const trimmedHours = trimmedText
			.replace(/営業時間/, "")
			.replace(/\s*L\.O\. \d{2}:\d{2} /g, " ")
			.replace(
				/営業時間・定休日は変更となる場合がございますので、ご来店前に店舗にご確認ください。/,
				"",
			)
			.trim();
		const closedMatch = trimmedHours.match(/定休日(.*)/);
		if (closedMatch) {
			metaData.closed = closedMatch[1];
		}
		// 24hours
		if (/24時間営業/.test(trimmedHours)) {
			metaData.hours = {
				mo: [{ o: "00:00", c: "24:00" }],
				tu: [{ o: "00:00", c: "24:00" }],
				we: [{ o: "00:00", c: "24:00" }],
				th: [{ o: "00:00", c: "24:00" }],
				fr: [{ o: "00:00", c: "24:00" }],
				sa: [{ o: "00:00", c: "24:00" }],
				su: [{ o: "00:00", c: "24:00" }],
				hol: [{ o: "00:00", c: "24:00" }],
				bef: [{ o: "00:00", c: "24:00" }],
				aft: [{ o: "00:00", c: "24:00" }],
			};
		}
		// day and hours
		else if (/(.+?)(\d{2}:\d{2} - \d{2}:\d{2}\s*){1,5}/g.test(trimmedHours)) {
			const matchedHours = trimmedHours.match(
				/(.+?)(\d{2}:\d{2} - \d{2}:\d{2}\s*){1,5}/g,
			);
			if (matchedHours) {
				metaData.hours = getBusinessHours(matchedHours);
			}
			// hours only
		} else if (/(\s*\d{2}:\d{2} - \d{2}:\d{2}\s*){1,5}/g.test(trimmedHours)) {
			const hours = trimmedHours.match(/\s*\d{2}:\d{2} - \d{2}:\d{2}\s*/g);
			if (hours) {
				metaData.hours = getBusinessHours(hours);
			}
		}
	}
	if (/口コミ集計/.test(trimmedText)) {
		const budgetText = trimmedText
			.replace(/予算|（口コミ集計）|利用金額分布を見る/g, "")
			.trim();
		metaData.budget = getBudget(budgetText);
	}
	if (/支払い方法/.test(trimmedText)) {
		const paymentText = trimmedText.replace("支払い方法", "").trim();
		metaData.pay = {
			card: [],
			emoney: [],
			qr: [],
		};
		if (/カード可/.test(paymentText)) {
			const card = paymentText.match(/カード可 （(.*?)） /);
			metaData.pay.card = card ? card[1].trim().split("、") : [];
		}

		if (/電子マネー可/.test(paymentText)) {
			const emoney = paymentText.match(/電子マネー可 （(.*?)） /);
			metaData.pay.emoney = emoney?.[1] ? emoney[1].trim().split("、") : [];
		}

		if (/QRコード決済可/.test(paymentText)) {
			const qr = paymentText.match(/QRコード決済可 （(.*?)）/);
			metaData.pay.qr = qr?.[1] ? qr[1].trim().split("、") : [];
		}
	}
	if (/席数/.test(trimmedText)) {
		const seatCounts = trimmedText.match(/\d+/);
		if (seatCounts) {
			metaData.seats = seatCounts[0];
		} else {
			metaData.seats = "不明";
		}
	}
	if (/個室/.test(trimmedText)) {
		if (/有/.test(trimmedText)) {
			metaData.room = "有";
		} else if (/無/.test(trimmedText)) {
			metaData.room = "無";
		} else {
			metaData.room = "不明";
		}
	}
	if (/貸切/.test(trimmedText)) {
		metaData.rentOut = trimmedText.replace("貸切", "").trim();
	}
	if (/禁煙/.test(trimmedText)) {
		if (/全席禁煙/.test(trimmedText)) {
			metaData.smoking = "禁煙";
		} else if (/全席喫煙可/.test(trimmedText)) {
			metaData.smoking = "喫煙";
		} else if (/分煙/.test(trimmedText)) {
			metaData.smoking = "分煙";
		} else {
			metaData.smoking = "不明";
		}
	}
	if (/駐車場/.test(trimmedText)) {
		if (/有/.test(trimmedText)) {
			metaData.parking = "有";
		} else if (/無/.test(trimmedText)) {
			metaData.parking = "無";
		} else {
			metaData.parking = "不明";
		}
	}
	if (/×/.test(trimmedText)) {
		metaData.station = trimmedText.split("×")[0].trim();
	}
	if (/undefined\d\.\d{2}/.test(trimmedText)) {
		metaData.score = trimmedText.replace("undefined", "").trim();
	}
}

function getBusinessHours(texts: string[]) {
	const businessHours: Record<string, { o: string; c: string }[]> = {
		mo: [],
		tu: [],
		we: [],
		th: [],
		fr: [],
		sa: [],
		su: [],
		hol: [],
		bef: [],
		aft: [],
	};
	const days = [
		{ jp: /月/, en: "mo" },
		{ jp: /火/, en: "tu" },
		{ jp: /水/, en: "we" },
		{ jp: /木/, en: "th" },
		{ jp: /金/, en: "fr" },
		{ jp: /土/, en: "sa" },
		{ jp: /(?<![祝前後])日/, en: "su" },
		{ jp: /祝日/, en: "hol" },
		{ jp: /祝前日/, en: "bef" },
		{ jp: /祝後日/, en: "aft" },
	];
	for (const text of texts) {
		//days and hours

		if (/(.+)(\s*\d{2}:\d{2} - \d{2}:\d{2}){1,5}/g.test(text)) {
			for (const day of days) {
				if (day.jp.test(text)) {
					const hours = text.match(/\d{2}:\d{2} - \d{2}:\d{2}/g);
					if (hours) {
						for (const hour of hours) {
							const [o, c] = hour.split(" - ");
							businessHours[day.en].push({
								o,
								c,
							});
						}
					}
				}
			}
		}
		//hours only
		else if (/\s*\d{2}:\d{2} - \d{2}:\d{2}/g.test(text)) {
			const hours = text.match(/\d{2}:\d{2} - \d{2}:\d{2}/g);
			if (hours) {
				for (const day of days) {
					for (const hour of hours) {
						const [o, c] = hour.split(" - ");
						businessHours[day.en].push({ o, c });
					}
				}
			}
		}
	}
	return businessHours;
}

function getBudget(text: string) {
	const budget: {
		dinner: { b: string | null; t: string | null };
		lunch: { b: string | null; t: string | null };
	} = {
		dinner: {
			b: null,
			t: null,
		},
		lunch: {
			b: null,
			t: null,
		},
	};
	const budgetText = text.match(/(￥*\d{0,3},*\d{1,3})*～￥*\d{0,3},*\d{1,3}/g);
	if (budgetText) {
		const [b, t] = budgetText[0].split("～");
		if (b.length > 0) {
			budget.dinner.b = b.replace("￥", "").replace(",", "");
		} else {
			budget.dinner.b = "0";
		}
		budget.dinner.t = t.replace("￥", "").replace(",", "");

		if (budgetText.length > 1) {
			const [b, t] = budgetText[1].split("～");
			if (b.length > 0) {
				budget.lunch.b = b.replace("￥", "").replace(",", "");
			} else {
				budget.lunch.b = "0";
			}
			budget.lunch.t = t.replace("￥", "").replace(",", "");
		}
	}
	return budget;
}

class ElementHandler {
	storage: string[];

	constructor(storage: string[]) {
		this.storage = storage;
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	async element(Element: any) {
		this.storage.push((await Element.getAttribute("data-original")) as string);
	}
}
