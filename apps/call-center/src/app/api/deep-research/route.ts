import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { client_id } = await request.json();

    if (!client_id) {
      return NextResponse.json({ error: "client_id required" }, { status: 400 });
    }

    // Get client from Supabase
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const metadata = (client.metadata || {}) as Record<string, unknown>;

    // Check cache — if deep_research exists and is < 7 days old, return it
    const deepResearch = metadata.deep_research as Record<string, unknown> | undefined;
    if (deepResearch?.scraped_at) {
      const scrapedAt = new Date(deepResearch.scraped_at as string);
      const now = new Date();
      const daysDiff = (now.getTime() - scrapedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff < 7) {
        return NextResponse.json({ cached: true, data: deepResearch });
      }
    }

    const listingUrl = (metadata.listing_url as string) || "";
    if (!listingUrl) {
      return NextResponse.json(
        { error: "No listing URL found for this client" },
        { status: 400 }
      );
    }

    // Insert job into research_jobs table for the local worker to pick up
    const { data: job, error: jobError } = await supabase
      .from("research_jobs")
      .insert({
        client_id,
        status: 'pending'
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating research job:", jobError);
      return NextResponse.json({ error: "Failed to create research job" }, { status: 500 });
    }

    return NextResponse.json({ cached: false, job_id: job.id });

  } catch (err) {
    console.error("Deep research API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
