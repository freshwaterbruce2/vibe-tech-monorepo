import { describe, expect, it } from "vitest";

describe("Simple Test", () => {
	it("should pass", () => {
		expect(1 + 1).toBe(2);
	});

	it("should have environment variables", () => {
		expect(process.env.NODE_ENV).toBe("test");
		expect(process.env.LOCAL_SQLITE).toBe("true");
	});
});
