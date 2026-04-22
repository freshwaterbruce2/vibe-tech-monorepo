import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsModal } from "../../components/settings/SettingsModal";

beforeEach(() => localStorage.clear());

describe("SettingsModal — CRITICAL #10 fix", () => {
  it("does not expose any api-key input", () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    const inputs = screen.queryAllByLabelText(/api.?key/i);
    expect(inputs).toHaveLength(0);
  });

  it("does not write vibe_api_key to localStorage under any interaction", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem");
    render(<SettingsModal open={true} onClose={() => {}} />);
    const saves = screen.queryAllByRole("button", { name: /save/i });
    saves.forEach((b) => fireEvent.click(b));
    const calls = setSpy.mock.calls.filter(([k]) => k === "vibe_api_key");
    expect(calls).toHaveLength(0);
  });

  it("rejects javascript: scheme in Ollama URL", async () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    const input = screen.queryByLabelText(/ollama.*url/i);
    if (!input) return;
    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.blur(input);
    expect(screen.getByText(/must be http/i)).toBeInTheDocument();
  });
});
