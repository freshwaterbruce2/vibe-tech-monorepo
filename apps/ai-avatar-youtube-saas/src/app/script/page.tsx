"use client";

import React, { useState } from "react";
import { createRenderTask } from "@/app/actions/render";
import { createScript, type GeneratedScript } from "@/app/actions/script";

const SYSTEM_PROMPT = `You are a YouTube storyteller for a branded AI avatar channel.
Create an original, creative narrative from a unique perspective.
Avoid factual regurgitation. Include personality-driven humor and a clear point of view.
This content must comply with the YouTube Partner Program and disclose realistic synthetic media.`;

export default function ScriptPage() {
  const [topic, setTopic] = useState("");
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");

  const generate = async () => {
    setStatus("generating");
    try {
      const data = await createScript(topic, SYSTEM_PROMPT, 60);
      setScript(data);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const fullNarration = script?.scenes.map((s) => s.narration).join(" ") ?? "";

  const queueRender = async () => {
    if (!script) return;
    const res = await createRenderTask({
      scriptPrompt: fullNarration,
      voiceId: process.env.NEXT_PUBLIC_DEFAULT_VOICE_ID ?? "default",
      audioSampleRate: 48000,
      assetPaths: [],
    });
    if (res.success) {
      alert(`Render queued. Job ID: ${res.jobId}`);
    } else {
      alert(res.error ?? "Render failed");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Script Engine</h1>
      <p className="text-muted-foreground">
        Generate YPP-compliant scene-by-scene scripts using Gemini 2.5 Flash.
      </p>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Video topic or premise"
        className="w-full rounded-md border border-input bg-background px-3 py-2"
      />
      <button
        onClick={() => void generate()}
        disabled={status === "generating" || !topic}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {status === "generating" ? "Generating..." : "Generate Script"}
      </button>

      {script && (
        <>
          <div className="rounded-md border border-border p-4 space-y-4">
            <h2 className="text-lg font-semibold">{script.title}</h2>
            <p className="text-sm text-muted-foreground">
              Total duration: {script.totalDurationSeconds}s
            </p>
            <ul className="space-y-4">
              {script.scenes.map((scene, index) => (
                <li key={index} className="rounded-md bg-secondary p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Scene {index + 1} · {scene.durationSeconds}s
                    </span>
                  </div>
                  <textarea
                    value={scene.narration}
                    onChange={(e) => {
                      setScript((prev) =>
                        prev
                          ? {
                              ...prev,
                              scenes: prev.scenes.map((s, i) =>
                                i === index ? { ...s, narration: e.target.value } : s,
                              ),
                            }
                          : prev,
                      );
                    }}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <input
                    value={scene.visualKeywords}
                    onChange={(e) => {
                      setScript((prev) =>
                        prev
                          ? {
                              ...prev,
                              scenes: prev.scenes.map((s, i) =>
                                i === index ? { ...s, visualKeywords: e.target.value } : s,
                              ),
                            }
                          : prev,
                      );
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-border p-4">
            <h3 className="text-sm font-medium mb-2">Full narration (sent to render worker)</h3>
            <textarea
              value={fullNarration}
              readOnly
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={() => void queueRender()}
            className="rounded-md border border-input bg-background px-4 py-2"
          >
            Queue Render
          </button>
        </>
      )}

      {status === "error" && (
        <p className="text-sm text-red-600">Generation failed. Please try again.</p>
      )}
    </div>
  );
}
