import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        VibeTech AI Avatar Studio
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mb-8">
        Upload an avatar, craft a script, preview the lip-sync, and publish to
        YouTube — all from the browser.
      </p>
      <div className="flex gap-4">
        <Link
          href="/upload"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Capture Avatar
        </Link>
        <Link
          href="/preview"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent"
        >
          Preview
        </Link>
      </div>
    </div>
  );
}
