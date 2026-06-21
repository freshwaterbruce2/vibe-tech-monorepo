import { NextResponse } from "next/server";
import { generateScript } from "@/lib/gemini";

export async function POST(request: Request) {
  const { topic, system, targetDurationSeconds } = (await request.json()) as {
    topic?: string;
    system?: string;
    targetDurationSeconds?: number;
  };

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  try {
    const script = await generateScript(topic, system, targetDurationSeconds);
    return NextResponse.json(script);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
