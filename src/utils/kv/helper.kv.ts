export async function getKV(env: CloudflareBindings, key: string) {
	try {
		const kvResponse = await env.KV.get(key, "json");
		if (kvResponse === null) throw new Error("KV not found");
		return kvResponse;
	} catch (error) {
		throw new Error(`Failed to connect to KV: ${error}`);
	}
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export async function putKV(env: CloudflareBindings, key: string, value: any) {
	try {
		const kvResponse = await env.KV.put(key, JSON.stringify(value));
		if (kvResponse === null) throw new Error("KV not found");
	} catch (error) {
		throw new Error(`Failed to connect to KV: ${error}`);
	}
}
