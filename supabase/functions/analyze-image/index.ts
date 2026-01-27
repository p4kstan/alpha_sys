import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();
    
    if (!imageBase64) {
      throw new Error("imageBase64 is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um analisador de imagens para Instagram. Sua função é descrever OBJETIVAMENTE o que você vê na imagem em uma frase curta e direta (máximo 15 palavras).

REGRAS:
- Descreva EXATAMENTE o que aparece na imagem
- Use linguagem objetiva, sem interpretação poética
- Mencione pessoas, objetos, cenários, texto visível
- Se houver texto na imagem, mencione o que está escrito
- Se houver dinheiro, mencione "segurando dinheiro" ou "notas de dólar"
- Se for retrato, descreva a pessoa e o que está fazendo
- Não use metáforas ou simbolismos
- Responda APENAS com a descrição, sem introduções

Exemplos de boas descrições:
- "homem de terno segurando maço de dólares"
- "criança sentada em cadeira fazendo gesto com as mãos"
- "mulher correndo em esteira na academia"
- "texto na tela: 2020 é nosso, fim de papo"
- "homem em escritório olhando para laptop"`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Descreva objetivamente o que você vê nesta imagem:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || "Não foi possível analisar a imagem";

    return new Response(JSON.stringify({ description: description.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
