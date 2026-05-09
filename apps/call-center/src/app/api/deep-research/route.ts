import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Path to the scrapper Python environment
const SCRAPPER_DIR = path.resolve(process.cwd(), "../scrapper");
const PYTHON = path.join(SCRAPPER_DIR, "venv", "bin", "python");
const SCRIPT = path.join(SCRAPPER_DIR, "src", "deep_research.py");
const OUTPUT_DIR = "/tmp/deep_research";

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
    const websiteUrl = (metadata.website_url as string) || "";

    if (!listingUrl) {
      return NextResponse.json(
        { error: "No listing URL found for this client" },
        { status: 400 }
      );
    }

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const outputFile = path.join(OUTPUT_DIR, `${client_id}.json`);

    // Check if Python and script exist
    if (!fs.existsSync(PYTHON)) {
      // Fallback: try system python
      const fallbackPython = "python3";
      try {
        const args = [
          SCRIPT,
          "--listing-url", listingUrl,
          ...(websiteUrl ? ["--website-url", websiteUrl] : []),
          "--output", outputFile,
          "--output-dir", OUTPUT_DIR,
        ];

        await execFileAsync(fallbackPython, args, {
          timeout: 60000,
          cwd: SCRAPPER_DIR,
        });
      } catch (execError) {
        console.error("Deep research execution failed:", execError);
        return NextResponse.json(
          { error: "Deep research execution failed. Python or dependencies may be missing." },
          { status: 500 }
        );
      }
    } else {
      // Use venv python
      try {
        const args = [
          SCRIPT,
          "--listing-url", listingUrl,
          ...(websiteUrl ? ["--website-url", websiteUrl] : []),
          "--output", outputFile,
          "--output-dir", OUTPUT_DIR,
        ];

        await execFileAsync(PYTHON, args, {
          timeout: 60000,
          cwd: SCRAPPER_DIR,
        });
      } catch (execError) {
        console.error("Deep research execution failed:", execError);
        return NextResponse.json(
          { error: "Deep research script failed" },
          { status: 500 }
        );
      }
    }

    // Read result
    if (!fs.existsSync(outputFile)) {
      return NextResponse.json({ error: "No output file generated" }, { status: 500 });
    }

    const resultJson = JSON.parse(fs.readFileSync(outputFile, "utf-8"));

    // Save to client metadata
    await supabase
      .from("clients")
      .update({
        metadata: { ...metadata, deep_research: resultJson },
      })
      .eq("id", client_id);

    return NextResponse.json({ cached: false, data: resultJson });

  } catch (err) {
    console.error("Deep research API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
