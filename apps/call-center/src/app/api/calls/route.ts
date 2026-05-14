import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST — Register a call
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, outcome, notes, follow_up_at, call_source = "phone" } = body;

    if (!client_id || !outcome) {
      return NextResponse.json({ error: "client_id and outcome required" }, { status: 400 });
    }

    // 1. Insert into calls table
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        client_id,
        notes: notes || "",
        type: "outbound",
        outcome,
        follow_up_at: follow_up_at || null,
        call_source,
      })
      .select()
      .single();

    if (callError) {
      console.error("Error inserting call:", callError);
      return NextResponse.json({ error: callError.message }, { status: 500 });
    }

    // 2. Update client status/tags based on outcome
    const { data: client } = await supabase
      .from("clients")
      .select("status, tags, metadata, follow_up_date")
      .eq("id", client_id)
      .single();

    if (client) {
      const currentTags: string[] = client.tags || [];
      const currentMeta = (client.metadata || {}) as Record<string, unknown>;
      let newStatus = client.status;
      let newTags = [...currentTags];

      switch (outcome) {
        case "interesado":
          newStatus = "contactado";
          if (!newTags.includes("interesado")) newTags.push("interesado");
          newTags = newTags.filter((t) => t !== "nuevo" && t !== "pendiente");
          break;
        case "seguimiento":
          newStatus = "contactado";
          if (!newTags.includes("recontactar")) newTags.push("recontactar");
          newTags = newTags.filter((t) => t !== "nuevo");
          break;
        case "no_interesado":
          newStatus = "perdido";
          break;
        case "no_contesta":
          if (!newTags.includes("pendiente")) newTags.push("pendiente");
          break;
        case "equivocado":
          newStatus = "perdido";
          if (!newTags.includes("invalido")) newTags.push("invalido");
          break;
      }

      await supabase
        .from("clients")
        .update({
          status: newStatus,
          tags: newTags,
          follow_up_date: follow_up_at || client.follow_up_date,
          metadata: { ...currentMeta, last_call_at: new Date().toISOString() },
        })
        .eq("id", client_id);
    }

    return NextResponse.json({ success: true, call });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET — Get calls for a client
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json({ error: "client_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ calls: data });
}
