import { Hono } from "hono";
import { getAreaCities } from "./utils/endPoint/getAreaCities";
import { fixPrefectures } from "./utils/endPoint/fixPrefectures";
import { getRestaurants } from "./utils/endPoint/getRestaurants";
import { fixAreaCities } from "./utils/endPoint/fixAreaCities";
import { debugLocations } from "./utils/debug/debugLocations";
import { lastUpdated } from "./utils/endPoint/lastUpdated";
const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", async (c) => await fixPrefectures(c));
app.get("/lastUpdated", async (c) => await lastUpdated(c));
app.get("/areacity", async (c) => await getAreaCities(c));
app.get("/restaurant", async (c) => await getRestaurants(c));
app.get("/fixareacity", async (c) => await fixAreaCities(c));
app.get(
	"/debug/:mode",
	async (c) =>
		await debugLocations(
			c,
			c.req.param("mode") as "prefectures" | "cities" | "restaurants",
		),
);
export default app;

/*

STRUCTURE
1 scraper
2 updater
3 remover
4 notifier

DESCRIPTION

1. crawler - automatically scrapes tabelog site

- crawl pages based on prefecture and city
- start from the KV list of prefectures and their URLs
- extract the city list and their URLs
- crawl each city page and extract the restaurant list and their URLs

scrape only the pages that matches the search condition
store the scraped data into a database
return done signal to the user

crawling process
1. get prefectures from KV
2. Run Promise.all to get all the cities from prefectures
3. iterate over the cities.  Run Promise.all to get all the restaurants from the cities

data structure
id - last digits of the URL
url - the URL
homepage - the homepage URL
name - shortened name
fullname - full name including the parentheses

prefecture - the prefecture name
area - the area name used in tabelog
city - the city name
station - the station name
distance - the distance to the restaurant from the station

award - the award received years (array)
genre - the genre of the restaurant (array)
budget-lunch - the budget range (array)
budget-dinner - the budget range (array)

phone - the phone number
address - the address
reservable - the reservable flag
hours - the hours of operation
card-payment - the card payment flag
e-payment - the e-payment flag
qrcode-payment - the QR code payment flag

seats - the number of seats
rooms - the number of rooms
smoking - the smoking flag
notes - the notes
*irregulars

1.5. scraper - manually scrapes tabelog site and gets restaurant data
receive search string from a user as a parameter
start scraping from the search result page
scrape only the pages that matches the search condition
store the scraped data into a database
return done signal to the user


2. updater
update the restaurant data in the database
receive restaurant id from a user as a parameter
scrape the restaurant data from the page
update the restaurant data in the database
return done signal to the user

*irregulars
- if the restaurant data is not found, return error signal to the user

3. remover
remove the restaurant data from the database
receive restaurant id from a user as a parameter
remove the restaurant data from the database
return done signal to the user

4. notifier
notify the user when the restaurant data is updated or removed

*/
