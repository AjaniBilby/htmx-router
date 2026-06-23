import { assertEquals, assertExists } from "jsr:@std/assert@1";

import { IsResourceFresh, AssertResourceFresh, GenerateETag } from "../source/etag.ts";

/**
 * Helper to capture the Response thrown by AssertResourceFresh
 */
async function getThrownResponse(fn: () => void): Promise<Response> {
	try {
		fn();
	} catch (e) {
		if (e instanceof Response) return e;
		throw e;
	}
	throw new Error("Expected function to throw a Response");
}

Deno.test("IsResourceFresh logic branch verification", async (t) => {
	const etag = "v1";
	const options = { etag };

	await t.step("returns true when no conditional headers are provided", () => {
		const req = new Request("http://localhost", { method: "GET" });
		const headers = new Headers();
		assertEquals(IsResourceFresh(req, headers, options), true);
	});

	await t.step("returns false (STALE) when If-None-Match matches the current ETag", () => {
		const req = new Request("http://localhost", {
			headers: new Headers({ "if-none-match": `"v1"` }),
		});
		const headers = new Headers();
		assertEquals(IsResourceFresh(req, headers, options), false);
	});

	await t.step("returns false (PRECONDITION FAILED) when If-Match does not match", () => {
		const req = new Request("http://localhost", {
			headers: new Headers({ "if-match": `"v2-wrong"` }),
		});
		const headers = new Headers();
		assertEquals(IsResourceFresh(req, headers, options), false);
	});

	await t.step("returns false (STALE) when resource is not modified since If-Modified-Since", () => {
		const lastMod = new Date("2023-01-01T12:00:00Z");
		const req = new Request("http://localhost", {
			headers: new Headers({ "if-modified-since": "Wed, 01 Jan 2023 12:00:00 GMT" }),
		});
		const headers = new Headers();
		assertEquals(IsResourceFresh(req, headers, { lastModified: lastMod }), false);
	});

	await t.step("returns true when resource is newer than If-Modified-Since", () => {
		const lastMod = new Date("2023-01-01T12:00:00Z");
		const req = new Request("http://localhost", {
			headers: new Headers({ "if-modified-since": "Wed, 01 Jan 2023 11:00:00 GMT" }),
		});
		const headers = new Headers();
		assertEquals(IsResourceFresh(req, headers, { lastModified: lastMod }), true);
	});
});

Deno.test("Resource Freshness - Positive/Success Cases", async (t) => {
	await t.step("ETag: If-Match succeeds when the ETag is an exact match", () => {
		const etag = "v1.2.3";
		const options = { etag };
		const req = new Request("http://localhost", {
			headers: new Headers({ "if-match": etag }),
		});
		const headers = new Headers();

		// IsResourceFresh should return true because the precondition is met
		assertEquals(IsResourceFresh(req, headers, options), true);

		// AssertResourceFresh should NOT throw because the client's condition is satisfied
		AssertResourceFresh(req, headers, options);
	});

	await t.step("Date: Resource is newer than If-Modified-Since (Update required)", () => {
		// The resource was updated on Jan 10th
		const lastModified = new Date("2023-01-10T12:00:00Z");
		const options = { lastModified };

		// The client says "only give it to me if it changed since Jan 1st"
		// Since Jan 10 > Jan 1, the resource IS modified/fresh for the client
		const req = new Request("http://localhost", {
			headers: new Headers({ "if-modified-since": "Wed, 01 Jan 2023 12:00:00 GMT" }),
		});
		const headers = new Headers();

		assertEquals(IsResourceFresh(req, headers, options), true);
		AssertResourceFresh(req, headers, options);
	});

	await t.step("Date: Resource is older than If-Unmodified-Since (Precondition met)", () => {
		// The resource was last changed on Jan 1st
		const lastModified = new Date("2023-01-01T12:00:00Z");
		const options = { lastModified };

		// The client says "only perform this action if the resource hasn't changed since Jan 10th"
		// Since Jan 1 < Jan 10, the resource IS unmodified. Condition met.
		const req = new Request("http://localhost", {
			headers: new Headers({ "if-unmodified-since": "Wed, 10 Jan 2023 12:00:00 GMT" }),
		});
		const headers = new Headers();

		assertEquals(IsResourceFresh(req, headers, options), true);
		AssertResourceFresh(req, headers, options);
	});

	await t.step("ETag: If-None-Match is absent (Standard request)", () => {
		// If the client provides no conditional headers, the resource is always fresh/valid
		const options = { etag: "v1" };
		const req = new Request("http://localhost", { method: "GET" });
		const headers = new Headers();

		assertEquals(IsResourceFresh(req, headers, options), true);
		AssertResourceFresh(req, headers, options);
	});
});

Deno.test("AssertResourceFresh HTTP Method handling", async (t) => {
	const etag = "v1";
	const options = { etag };

	await t.step("GET returns 304 Not Modified when ETag matches", async () => {
		const req = new Request("http://localhost", {
			method: "GET",
			headers: new Headers({ "if-none-match": `"v1"` }),
		});
		const res = await getThrownResponse(() => AssertResourceFresh(req, new Headers(), options));
		assertEquals(res.status, 304);
	});

	await t.step("POST returns 412 Precondition Failed when ETag matches (not 304)", async () => {
		const req = new Request("http://localhost", {
			method: "POST",
			headers: new Headers({ "if-none-match": `"v1"` }),
		});
		const res = await getThrownResponse(() => AssertResourceFresh(req, new Headers(), options));
		assertEquals(res.status, 412, "POST should trigger 412 for matching ETag to prevent non-idempotent 304s");
	});

	await t.step("PUT returns 412 Precondition Failed when ETag matches", async () => {
		const req = new Request("http://localhost", {
			method: "PUT",
			headers: new Headers({ "if-none-match": `"v1"` }),
		});
		const res = await getThrownResponse(() => AssertResourceFresh(req, new Headers(), options));
		assertEquals(res.status, 412);
	});

	await t.step("DELETE returns 412 Precondition Failed when ETag matches", async () => {
		const req = new Request("http://localhost", {
			method: "DELETE",
			headers: new Headers({ "if-none-match": `"v1"` }),
		});
		const res = await getThrownResponse(() => AssertResourceFresh(req, new Headers(), options));
		assertEquals(res.status, 412);
	});

	await t.step("Any method returns 412 when If-Match fails (Mismatch)", async () => {
		const req = new Request("http://localhost", {
			method: "GET",
			headers: new Headers({ "if-match": `"v-wrong"` }),
		});
		const res = await getThrownResponse(() => AssertResourceFresh(req, new Headers(), options));
		assertEquals(res.status, 412);
	});

	await t.step("Successful execution (no throw) when conditions are met (Happy Path)", () => {
		const req = new Request("http://localhost", { method: "GET" });
		// This should not throw an error
		AssertResourceFresh(req, new Headers(), options);
	});
});