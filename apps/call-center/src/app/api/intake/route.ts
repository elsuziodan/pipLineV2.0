import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST — Create or update intake form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, ...formData } = body;

    if (!client_id) {
      return NextResponse.json({ error: "client_id required" }, { status: 400 });
    }

    // Check if intake already exists
    const { data: existing } = await supabase
      .from("intake_forms")
      .select("id")
      .eq("client_id", client_id)
      .single();

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from("intake_forms")
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq("client_id", client_id)
        .select()
        .single();

      if (error) {
        // If table doesn't exist, save to metadata instead
        if (error.code === "42P01") {
          return saveToMetadata(client_id, formData);
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, intake: data });
    } else {
      // Insert
      const { data, error } = await supabase
        .from("intake_forms")
        .insert({ client_id, ...formData })
        .select()
        .single();

      if (error) {
        // If table doesn't exist, save to metadata instead
        if (error.code === "42P01") {
          return saveToMetadata(client_id, formData);
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Update client status
      await supabase
        .from("clients")
        .update({ status: "negociacion" })
        .eq("id", client_id);

      return NextResponse.json({ success: true, intake: data });
    }
  } catch (err) {
    console.error("Intake API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Fallback: save intake to client metadata if table doesn't exist
async function saveToMetadata(clientId: string, formData: Record<string, unknown>) {
  const { data: client } = await supabase
    .from("clients")
    .select("metadata")
    .eq("id", clientId)
    .single();

  const currentMeta = (client?.metadata || {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("clients")
    .update({
      status: "negociacion",
      metadata: {
        ...currentMeta,
        intake_form: { ...formData, saved_at: new Date().toISOString() },
      },
    })
    .eq("id", clientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, fallback: "metadata" });
}

// GET — Get intake for a client
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  // Try the intake_forms table first
  const { data, error } = await supabase
    .from("intake_forms")
    .select("*")
    .eq("client_id", clientId)
    .single();

  if (error) {
    // Fall back to metadata
    const { data: client } = await supabase
      .from("clients")
      .select("metadata")
      .eq("id", clientId)
      .single();

    const intake = (client?.metadata as Record<string, unknown>)?.intake_form;
    return NextResponse.json({ intake: intake || null, source: "metadata" });
  }

  return NextResponse.json({ intake: data, source: "table" });
}
