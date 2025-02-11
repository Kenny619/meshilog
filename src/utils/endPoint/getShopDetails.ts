import type { Context } from "hono";
import { getKV, putKV } from "../kv/helper.kv";
// import type { OutputRestaurant } from "../crawler/helper.crawler";
import { decodeBase64Url } from "hono/utils/encode";

export async function getShopDetails(c: Context) {
	const restaurants = await getKV(c.env, "restaurants");
	if (!restaurants) throw new Error("key:restaurants do not exist.");

	//get pref with lowest time value = oldest update time
	const targetRestaurant = lastUpdatedRestaurant(restaurants);
	if (!targetRestaurant) throw new Error("invalid targetRestaurants");

	// const restaurantURL = targetRestaurant.restaurants.url;
	const restaurantURL = "https://tabelog.com/hokkaido/A0101/A010101/1060249/";
	// const restaurantURL = "https://tabelog.com/tokyo/A1304/A130401/13146954/";
	// const restaurantURL = "https://tabelog.com/tokyo/A1301/A130103/13200392/";
	// const restaurantURL = "https://tabelog.com/hokkaido/A0101/A010101/1004335/";
	// const restaurantURL = "https://tabelog.com/hokkaido/A0101/A010101/1046364/";

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const metaData: Record<string, any> = {};
	const id = restaurantURL.match(/([^\/]+)(?=\/?$)/)?.[0];
	metaData.url = restaurantURL;

	const res: string[] = Array(17).fill("");
	let gmapText = "";
	const response = await fetch(restaurantURL);
	if (!response.ok) throw new Error(response.statusText);

	await new HTMLRewriter()
		.on("img.rstinfo-table__map-image", {
			element(element) {
				gmapText += element.getAttribute("data-original") as string;
			},
		})
		.on(tSelector(1), {
			text({ text }) {
				res[0] += text;
			},
		})
		.on(tSelector(2), {
			text({ text }) {
				res[1] += text;
			},
		})
		.on(tSelector(3), {
			text({ text }) {
				res[2] += text;
			},
		})
		.on(tSelector(4), {
			text({ text }) {
				res[3] += text;
			},
		})
		.on(tSelector(5), {
			text({ text }) {
				res[4] += text;
			},
		})
		.on(tSelector(6), {
			text({ text }) {
				res[5] += text;
			},
		})
		.on(tSelector(7), {
			text({ text }) {
				res[6] += text;
			},
		})
		.on(tSelector(8), {
			text({ text }) {
				res[7] += text;
			},
		})
		.on(tSelector(9), {
			text({ text }) {
				res[8] += text;
			},
		})
		.on(tSelector(10), {
			text({ text }) {
				res[9] += text;
			},
		})
		.on(tSelector(11), {
			text({ text }) {
				res[10] += text;
			},
		})
		.on(uSelector(1), {
			text({ text }) {
				res[11] += text;
			},
		})
		.on(uSelector(2), {
			text({ text }) {
				res[12] += text;
			},
		})
		.on(uSelector(3), {
			text({ text }) {
				res[13] += text;
			},
		})
		.on(uSelector(4), {
			text({ text }) {
				res[14] += text;
			},
		})
		.on(uSelector(5), {
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
		})
		.transform(response)
		.arrayBuffer();

	for (const str of res) {
		extractor(str, metaData);
	}
	const gmap: Record<string, string> = {};
	const gt = decodeURIComponent(gmapText).replace(/&amp;/g, "&");
	const urlParams = new URLSearchParams(new URL(gt).search);
	const coord = urlParams.get("center");
	if (coord) metaData.coord = coord.split(",");
	console.log(JSON.stringify(metaData, null, 2));
	return c.json({ [id as string]: metaData });

	// await putKV(c.env, "restaurants", updatedRestaurants);
	// return c.json(updatedRestaurants);
}

function tSelector(row: number) {
	return `#rst-data-head > table:nth-child(2) > tbody > tr:nth-child(${row.toString()})`;
}
function uSelector(row: number) {
	return `#rst-data-head > table:nth-child(4) > tbody > tr:nth-child(${row.toString()})`;
}
function lastUpdatedRestaurant(restaurants: OutputRestaurant[]) {
	const undefinedTime = restaurants.find((city) =>
		city.restaurants.find((r) => r.time === undefined),
	);
	if (undefinedTime) {
		return {
			...undefinedTime,
			restaurants: undefinedTime.restaurants.find(
				(r) => r.time === undefined,
			) as { score: string; url: string },
		};
	}

	const lastUpdatedTime = Math.min(
		...restaurants
			.flatMap((r) => r.restaurants)
			.map((v) => Number.parseInt(v.time as string)),
	);

	for (const city of restaurants) {
		for (const restaurant of city.restaurants) {
			if (lastUpdatedTime === Number.parseInt(restaurant.time as string)) {
				return {
					...city,
					restaurants: {
						score: restaurant.score,
						url: restaurant.url,
					},
				};
			}
		}
	}
}

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
