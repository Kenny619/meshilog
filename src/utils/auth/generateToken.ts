import { Hono } from "hono";
import { sign } from "hono/jwt";

const app = new Hono();

app.post("/login", async (c) => {
	const { username, password } = await c.req.json();

	// Example user auth check — replace with real logic
	if (username === "demo" && password === "secret") {
		const token = await sign(
			{ sub: "user_id_123", role: "user" }, // payload
			c.env.JWT_SECRET, // secret
			{ expiresIn: "1h" }, // optional expiry
		);
		return c.json({ token });
	}

	return c.text("Unauthorized", 401);
});
