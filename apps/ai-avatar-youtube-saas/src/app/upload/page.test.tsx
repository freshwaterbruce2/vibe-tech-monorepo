import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AvatarCapturePage from "./page";

describe("AvatarCapturePage", () => {
  it("renders the capture input", () => {
    render(<AvatarCapturePage />);
    expect(screen.getByText("Avatar Studio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload avatar/i })).toBeInTheDocument();
  });
});
