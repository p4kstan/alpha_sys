import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { slotIds, brandSettings } = await req.json();

    if (!slotIds || slotIds.length === 0) {
      throw new Error("No slots provided");
    }

    // Fetch the slots
    const { data: slots, error: slotsError } = await supabase
      .from("scheduled_slots")
      .select("*")
      .in("id", slotIds)
      .eq("user_id", user.id);

    if (slotsError) throw slotsError;
    if (!slots || slots.length === 0) throw new Error("No slots found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const results: { slotId: string; success: boolean; error?: string }[] = [];

    // Process each slot sequentially to avoid rate limits
    for (const slot of slots) {
      try {
        // Mark as processing
        await supabase
          .from("scheduled_slots")
          .update({ status: "processing" })
          .eq("id", slot.id);

        if (!slot.image_urls || slot.image_urls.length === 0) {
          await supabase
            .from("scheduled_slots")
            .update({ status: "failed", error_message: "Nenhuma imagem enviada" })
            .eq("id", slot.id);
          results.push({ slotId: slot.id, success: false, error: "No images" });
          continue;
        }

        // Build image descriptions for the generate-content function
        const images = slot.image_urls.map((url: string, i: number) => ({
          id: `img-${i}`,
          description: `Imagem ${i + 1} do carrossel para ${slot.slot_time}`,
        }));

        // Call the existing generate-content function
        const genResponse = await fetch(`${supabaseUrl}/functions/v1/generate-content`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            images,
            horario: slot.slot_time,
            brandSettings,
          }),
        });

        if (!genResponse.ok) {
          const errText = await genResponse.text();
          throw new Error(`Generate failed: ${genResponse.status} - ${errText}`);
        }

        const genData = await genResponse.json();

        // Save generated content
        await supabase
          .from("scheduled_slots")
          .update({
            status: "generated",
            generated_content: genData.content,
            error_message: null,
          })
          .eq("id", slot.id);

        results.push({ slotId: slot.id, success: true });

        // Small delay between slots to avoid rate limits
        await new Promise((r) => setTimeout(r, 1000));
      } catch (slotError) {
        const msg = slotError instanceof Error ? slotError.message : "Unknown error";
        await supabase
          .from("scheduled_slots")
          .update({ status: "failed", error_message: msg })
          .eq("id", slot.id);
        results.push({ slotId: slot.id, success: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Batch process error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
