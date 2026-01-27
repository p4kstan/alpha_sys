import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompt for image analysis
const SYSTEM_PROMPT = `Você é um analisador de imagens para Instagram. Sua função é descrever OBJETIVAMENTE o que você vê na imagem em uma frase curta e direta (máximo 15 palavras).

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
- "homem em escritório olhando para laptop"`;

// Provider adapters
interface AnalysisRequest {
  imageBase64: string;
  mimeType?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  testConnection?: boolean;
}

interface ProviderResponse {
  description: string;
}

// Lovable AI (default)
async function analyzeLovable(imageBase64: string, mimeType: string, model: string): Promise<ProviderResponse> {
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
      model: model || "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Descreva objetivamente o que você vê nesta imagem:" },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("Rate limit exceeded");
    if (status === 402) throw new Error("Payment required");
    throw new Error(`Lovable AI error: ${status}`);
  }

  const data = await response.json();
  return { description: data.choices?.[0]?.message?.content || "Não foi possível analisar a imagem" };
}

// OpenAI GPT-4 Vision
async function analyzeOpenAI(imageBase64: string, mimeType: string, model: string, apiKey: string): Promise<ProviderResponse> {
  if (!apiKey) throw new Error("OpenAI API key is required");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Descreva objetivamente o que você vê nesta imagem:" },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` }
            }
          ]
        }
      ],
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return { description: data.choices?.[0]?.message?.content || "Não foi possível analisar a imagem" };
}

// Google Gemini
async function analyzeGoogle(imageBase64: string, mimeType: string, model: string, apiKey: string): Promise<ProviderResponse> {
  if (!apiKey) throw new Error("Google API key is required");

  const modelName = model || "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        parts: [
          { text: "Descreva objetivamente o que você vê nesta imagem:" },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 100,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Google error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return { description: text || "Não foi possível analisar a imagem" };
}

// Anthropic Claude
async function analyzeAnthropic(imageBase64: string, mimeType: string, model: string, apiKey: string): Promise<ProviderResponse> {
  if (!apiKey) throw new Error("Anthropic API key is required");

  // Convert mimeType to Anthropic format
  const mediaType = mimeType.replace("image/", "") as "jpeg" | "png" | "gif" | "webp";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "claude-3-5-sonnet-latest",
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: imageBase64
            }
          },
          { type: "text", text: "Descreva objetivamente o que você vê nesta imagem:" }
        ]
      }]
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Anthropic error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  return { description: text || "Não foi possível analisar a imagem" };
}

// Test connection for each provider
async function testConnection(provider: string, model: string, apiKey: string): Promise<boolean> {
  switch (provider) {
    case "lovable":
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      return !!LOVABLE_API_KEY;
    case "openai":
      if (!apiKey) return false;
      const openaiRes = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      return openaiRes.ok;
    case "google":
      if (!apiKey) return false;
      const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return googleRes.ok;
    case "anthropic":
      if (!apiKey) return false;
      // Anthropic doesn't have a simple test endpoint, so we just verify key format
      return apiKey.startsWith("sk-ant-");
    default:
      return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: AnalysisRequest = await req.json();
    const { imageBase64, mimeType = "image/jpeg", provider = "lovable", model, apiKey, testConnection: isTest } = body;

    // Handle test connection request
    if (isTest) {
      const isValid = await testConnection(provider, model || "", apiKey || "");
      if (isValid) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ error: "Connection test failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Require image for analysis
    if (!imageBase64) {
      throw new Error("imageBase64 is required");
    }

    console.log(`Analyzing image with provider: ${provider}, model: ${model || "default"}`);

    let result: ProviderResponse;

    switch (provider) {
      case "openai":
        result = await analyzeOpenAI(imageBase64, mimeType, model || "gpt-4o", apiKey || "");
        break;
      case "google":
        result = await analyzeGoogle(imageBase64, mimeType, model || "gemini-2.0-flash", apiKey || "");
        break;
      case "anthropic":
        result = await analyzeAnthropic(imageBase64, mimeType, model || "claude-3-5-sonnet-latest", apiKey || "");
        break;
      case "lovable":
      default:
        result = await analyzeLovable(imageBase64, mimeType, model || "google/gemini-2.5-flash");
        break;
    }

    return new Response(JSON.stringify({ description: result.description.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    let status = 500;
    
    if (errorMessage.includes("Rate limit")) status = 429;
    if (errorMessage.includes("Payment required")) status = 402;
    if (errorMessage.includes("API key")) status = 401;
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
