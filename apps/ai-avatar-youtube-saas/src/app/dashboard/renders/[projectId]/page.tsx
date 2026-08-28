import { Suspense } from "react";
import { cookies, headers } from "next/headers";

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function ProjectPage({
  params,
  searchParams,
}: PageProps) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Project Workspace</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading project...</p>}>
        <ProjectDetails params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProjectDetails({
  params,
  searchParams,
}: PageProps) {
  const { projectId } = await params;
  const query = await searchParams;

  const cookieStore = await cookies();
  const requestHeaders = await headers();

  const sessionToken = cookieStore.get("session_token")?.value;
  const requestId = requestHeaders.get("x-request-id") ?? "n/a";

  return (
    <>
      <p className="text-lg font-medium">Project: {projectId}</p>
      <p className="text-muted-foreground">
        Session State: {sessionToken ? "Authenticated" : "Unauthenticated"}
      </p>
      <p className="text-muted-foreground">Request ID: {requestId}</p>
      <pre className="mt-4 rounded-md border border-border bg-secondary p-4 text-sm">
        {JSON.stringify(query, null, 2)}
      </pre>
    </>
  );
}
