import { describe, expect, it } from "vitest";

describe("Example Test Suite", () => {
	it("should pass a basic test", () => {
		expect(1 + 1).toBe(2);
	});

	it("should handle arrays", () => {
		const fruits = ["apple", "banana", "orange"];
		expect(fruits).toHaveLength(3);
		expect(fruits).toContain("banana");
	});

	it("should handle objects", () => {
		const user = {
			name: "John Doe",
			email: "john@example.com",
			age: 30,
		};

		expect(user).toHaveProperty("name");
		expect(user.age).toBeGreaterThan(18);
	});
});
