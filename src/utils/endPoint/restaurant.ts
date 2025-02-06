import type { Context } from "hono";

export async function getRestaurant(c: Context, url: string) {
	const res = await fetch(url);
	const html = await res.text();

	// Parse the string into a DOM structure
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");

	// Query the DOM
	const extractedElement =
		doc.querySelector("h1")?.outerHTML || "Element not found";
}
