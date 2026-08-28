"use client";

import React, { useState } from "react";
import { getDpopChallenge } from "@/app/actions/challenge";
import { uploadAvatarAsset } from "@/app/actions/upload";

export default function AvatarCapturePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ url: string; path: string } | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("avatar") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setStatus("uploading");
    try {
      const challenge = await getDpopChallenge();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dpop_nonce", challenge.nonce);
      formData.append("dpop_proof", challenge.proof);

      const res = await uploadAvatarAsset(formData);
      if (!res.success || !res.url) throw new Error(res.error ?? "Upload failed");
      setResult({ url: res.url, path: res.path });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="p-6 flex flex-col items-center max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Avatar Studio</h1>
      <form onSubmit={(e) => void handleSubmit(e)} className="w-full space-y-4">
        <input
          id="avatar"
          name="avatar"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
        />
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="mt-4 rounded-lg max-w-xs shadow-lg"
          />
        )}
        <button
          type="submit"
          disabled={status === "uploading" || !preview}
          className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {status === "uploading" ? "Uploading..." : "Upload Avatar"}
        </button>
      </form>
      {status === "done" && result && (
        <p className="mt-4 text-sm text-green-600">Uploaded to {result.path}</p>
      )}
      {status === "error" && (
        <p className="mt-4 text-sm text-red-600">Upload failed. Please try again.</p>
      )}
    </div>
  );
}
