import { NextResponse } from "next/server";
import { productionEnvironmentProblems } from "../../lib/env";
import { readGardenPosts } from "../../lib/server-content";

export const dynamic = "force-dynamic";

export async function GET() {
  const environmentProblems = productionEnvironmentProblems();
  try {
    const { posts } = await readGardenPosts({ live: false });
    if (!posts.length) throw new Error("No content files were found.");
    if (environmentProblems.length) {
      console.error("[health:environment]", environmentProblems.join("; "));
      return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[health:content]", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
