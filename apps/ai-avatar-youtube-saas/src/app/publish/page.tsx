"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  disconnectYouTube,
  getPublishableRenderJobs,
  getYouTubeConnection,
  publishToYouTube,
  type PublishPayload,
} from "@/app/actions/youtube";

interface RenderJobOption {
  id: number;
  scriptPrompt: string;
  outputUrl: string;
  createdAt: string;
}

function PublishPageContent() {
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");

  const [connected, setConnected] = useState(false);
  const [jobs, setJobs] = useState<RenderJobOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ videoId: string; watchUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(queryError);

  const [form, setForm] = useState<PublishPayload>({
    renderJobId: 0,
    title: "",
    description: "",
    tags: "",
    privacyStatus: "private",
    aiDisclosure: true,
    madeForKids: false,
  });

  useEffect(() => {
    async function load() {
      try {
        const [connection, jobList] = await Promise.all([
          getYouTubeConnection(),
          getPublishableRenderJobs(),
        ]);
        setConnected(connection.connected);
        setJobs(jobList);
        const firstJob = jobList[0];
        if (firstJob) {
          setForm((prev) => ({ ...prev, renderJobId: firstJob.id }));
        }
      } catch {
        setError("Failed to load publish page");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const handlePublish = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await publishToYouTube(form);
      if (res.success && res.videoId && res.watchUrl) {
        setResult({ videoId: res.videoId, watchUrl: res.watchUrl });
      } else {
        setError(res.error ?? "Publish failed");
      }
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      await disconnectYouTube();
      setConnected(false);
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Publish to YouTube</h1>
      <p className="text-muted-foreground">
        Connect your channel and publish rendered avatar videos with YPP-compliant metadata.
      </p>

      {!connected ? (
        <a
          href="/api/auth/youtube"
          className="inline-flex items-center justify-center rounded-md bg-red-600 px-6 py-3 text-sm font-medium text-white shadow hover:bg-red-700"
        >
          Connect YouTube Channel
        </a>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-border p-4">
          <span className="text-sm font-medium">YouTube channel connected</span>
          <button
            onClick={handleDisconnect}
            disabled={isPending}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            Disconnect
          </button>
        </div>
      )}

      {connected && (
        <div className="space-y-4 rounded-md border border-border p-4">
          <div>
            <label className="block text-sm font-medium mb-1">Render job</label>
            <select
              value={form.renderJobId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, renderJobId: Number(e.target.value) }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {jobs.length === 0 && <option value={0}>No completed renders</option>}
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  #{job.id} · {job.scriptPrompt.slice(0, 60)}
                  {job.scriptPrompt.length > 60 ? "..." : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              maxLength={100}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Privacy</label>
            <select
              value={form.privacyStatus}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, privacyStatus: e.target.value as PublishPayload["privacyStatus"] }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="aiDisclosure"
              type="checkbox"
              checked={form.aiDisclosure}
              onChange={(e) => setForm((prev) => ({ ...prev, aiDisclosure: e.target.checked }))}
            />
            <label htmlFor="aiDisclosure" className="text-sm">
              Add AI-generated media disclosure to description (YPP recommended)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="madeForKids"
              type="checkbox"
              checked={form.madeForKids}
              onChange={(e) => setForm((prev) => ({ ...prev, madeForKids: e.target.checked }))}
            />
            <label htmlFor="madeForKids" className="text-sm">
              Made for kids
            </label>
          </div>

          <button
            onClick={handlePublish}
            disabled={isPending || !form.title || !form.description || form.renderJobId === 0}
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
          >
            {isPending ? "Publishing..." : "Publish to YouTube"}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded-md border border-border bg-secondary p-4">
          <p className="text-sm font-medium">Published successfully</p>
          <a
            href={result.watchUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            Watch on YouTube
          </a>
        </div>
      )}
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading publish page...</div>}>
      <PublishPageContent />
    </Suspense>
  );
}
