import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALPHACODE_SYSTEM_PROMPT = `Você é o Agente AlphaCode Supremacy — executor de conteúdo de alto impacto para Instagram.

📚 REFERÊNCIAS DE COPYWRITING (CANON OFICIAL)
Opere com os princípios de: Joe Karbo, Claude Hopkins, David Ogilvy, Victor O. Schwab, John Caples, Gary Halbert, Eugene Schwartz, Lillian Eichler, Joseph Sugarman, Dan Kennedy, Robert Collier, Jay Abraham, John Carlton, Gary Bencivenga, Jim Rutz.

⚠️ Referência serve para elevar, nunca para copiar. Proibido replicar frases ou estruturas literais.

🎯 OBJETIVO
Gerar conteúdos de alto impacto emocional baseados nos PILARES DE CONTEÚDO e TOM DE VOZ específicos do perfil.

❌ Sem clichê, improviso, motivação genérica.

REGRAS DE GERAÇÃO:

1️⃣ TEXTO POR IMAGEM
- Cada imagem recebe exatamente 1 frase
- Formato: "texto N - frase"
- Usar hífen simples (-), nunca traço longo
- Sem emojis, títulos ou explicações

2️⃣ REGRA DAS 06:00
Se horário = 06:00, o PRIMEIRO texto deve ter:
- Entonação de bom dia, fé, gratidão
- Linguagem simples (quase oração)
- Exemplos de tom: "Ei Deus, obrigado por hoje", "Outro dia, outra chance"
- Os demais textos seguem o padrão normal

3️⃣ LEGENDAS - GERAR 6 VARIAÇÕES
- Legenda 1 e 2: curtas (1 frase)
- Legenda 3 e 4: médias (2 frases)
- Legenda 5 e 6: longas (3+ frases)

4️⃣ ESTRUTURA DE CADA LEGENDA
[Texto da legenda]

Segue @[handle]

[hashtags]
🎵 Música sugerida: "[música]" – [artista]

5️⃣ BASE MUSICAL (6 músicas diferentes por carrossel)
Estilos: Hip-hop, Rap, Trap, Reggae rock brasileiro, Rock alternativo, Electronic/EDM, Synth-pop, Indie eletrônico, Atmosférico

6️⃣ REFERÊNCIAS BÍBLICAS
- Permitidas apenas no texto da imagem
- Máximo 2 por carrossel
- Formato: "Texto. Livro capítulo:versículo."

RESPONDA SEMPRE EM JSON com esta estrutura exata:
{
  "textos": [
    { "numero": 1, "frase": "..." },
    { "numero": 2, "frase": "..." }
  ],
  "referencias": [
    { "numero": 1, "descricao": "..." }
  ],
  "legendas": [
    {
      "tipo": "curta",
      "texto": "...",
      "musica": { "nome": "...", "artista": "..." }
    }
  ]
}`;

interface ImageDescription {
  id: string;
  description: string;
}

interface PostReference {
  example: string;
  tone: string;
  notes: string;
  allowedLanguage?: string;
  prohibitedLanguage?: string;
  isSpecialHour?: boolean;
}

interface CaptionConfig {
  variationCount: number;
  maxLength: "curta" | "media" | "longa" | "mista";
  useFixedHashtags: boolean;
}

interface MusicPreset {
  styles: string[];
}

interface BrandSettings {
  handle: string;
  profileName?: string;
  centralTheme?: string;
  contentPillars?: string[];
  voiceTones?: string[];
  customVoiceTones?: string[];
  cta: string;
  ctaList?: string[];
  hashtags: string;
  voiceStyle: string;
  favoriteMusics?: string;
  biblicalReferencesEnabled?: boolean;
  biblicalReferencesFilter?: string[];
  biblicalReferences?: string;
  postReferences?: Record<string, PostReference>;
  specialHours?: string[];
  captionConfig?: CaptionConfig;
  musicPreset?: MusicPreset;
}

// Voice tone descriptions for the AI
const VOICE_TONE_DESCRIPTIONS: Record<string, string> = {
  direto: "Comunicação sem rodeios, objetiva, estoica. Vai direto ao ponto sem enrolação.",
  espiritual: "Linguagem de fé, humilde, simples. Como uma oração ou reflexão espiritual.",
  provocativo: "Desafia, questiona, incomoda. Tira da zona de conforto com verdades duras.",
  reflexivo: "Convida à introspecção e pensamento profundo. Faz pausar e pensar.",
  educacional: "Ensina, explica, orienta. Tom de quem compartilha conhecimento.",
  autoridade: "Tom de especialista, confiante. Fala com propriedade e experiência.",
  minimalista: "Menos é mais. Essência pura, sem palavras desnecessárias.",
  imperativo: "Ordens diretas, comandos. Não sugere, ordena.",
};

// Central theme descriptions
const THEME_DESCRIPTIONS: Record<string, string> = {
  motivacional: "Foco em disciplina, superação, mentalidade forte, estoicismo e verdades duras sobre a vida.",
  educacional: "Compartilha conhecimento, ensina conceitos, desmistifica temas complexos.",
  autoridade: "Posicionamento como especialista, resultados comprovados, método próprio.",
  conversao: "Foco em vendas, escassez, urgência, transformação e chamada à ação.",
  lifestyle: "Autenticidade, liberdade, experiências de vida, equilíbrio pessoal.",
  fe: "Gratidão, entrega a Deus, direção divina, confiança, propósito espiritual.",
  negocios: "Responsabilidade financeira, processos, decisões difíceis, visão de longo prazo.",
  estetico: "Visual impactante, composição, minimalismo, cores e consistência visual.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, horario, brandSettings } = await req.json() as {
      images: ImageDescription[];
      horario: string;
      brandSettings: BrandSettings;
    };

    if (!images || images.length === 0) {
      throw new Error("No images provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const imageList = images.map((img, i) => `Imagem ${i + 1}: ${img.description}`).join("\n");
    
    // Check if biblical references should be included based on filter array
    const filterArray = brandSettings.biblicalReferencesFilter || [];
    const shouldIncludeBible = brandSettings.biblicalReferencesEnabled && 
      brandSettings.biblicalReferences && 
      filterArray.includes(horario);
    
    // Get post reference for this specific time slot (CONFIG 4)
    const postRef = brandSettings.postReferences?.[horario];
    const isSpecialHour = brandSettings.specialHours?.includes(horario) || postRef?.isSpecialHour;
    
    // CONFIG 4 - Build language rules context
    const languageRulesContext = postRef && (postRef.allowedLanguage || postRef.prohibitedLanguage)
      ? `
⚠️ REGRAS DE LINGUAGEM PARA ${horario}:
${postRef.allowedLanguage ? `✅ LINGUAGEM PERMITIDA: ${postRef.allowedLanguage}` : ""}
${postRef.prohibitedLanguage ? `❌ LINGUAGEM PROIBIDA: ${postRef.prohibitedLanguage}` : ""}
${isSpecialHour ? "📌 Este é um HORÁRIO ESPECIAL - siga as regras de linguagem RIGOROSAMENTE." : ""}`
      : "";

    const postReferenceContext = postRef 
      ? `
REFERÊNCIA DE TOM PARA ${horario}:
- Tom específico: ${postRef.tone}
${postRef.example ? `- Exemplo de referência: "${postRef.example}"` : ""}
${postRef.notes ? `- Notas adicionais: ${postRef.notes}` : ""}
${languageRulesContext}`
      : "";

    // Build content pillars context
    const pillarsContext = brandSettings.contentPillars && brandSettings.contentPillars.length > 0
      ? `
🎯 PILARES DE CONTEÚDO DO PERFIL:
Os textos DEVEM orbitar em torno destes pilares temáticos:
${brandSettings.contentPillars.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}

Cada texto deve conectar-se a pelo menos um destes pilares. Eles definem a ESSÊNCIA do conteúdo.`
      : "";

    // Build voice tones context (including custom tones)
    const allVoiceTones = [
      ...(brandSettings.voiceTones || []),
      ...(brandSettings.customVoiceTones || [])
    ];
    const voiceTonesContext = allVoiceTones.length > 0
      ? `
🎤 TOM DE VOZ DO PERFIL:
O conteúdo deve ser escrito com estes tons combinados:
${allVoiceTones.map(tone => {
  const desc = VOICE_TONE_DESCRIPTIONS[tone] || tone;
  return `  • ${tone.toUpperCase()}: ${desc}`;
}).join("\n")}

IMPORTANTE: Combine estes tons na escrita. Por exemplo, se o perfil usa "direto" + "provocativo", seja objetivo E desafiador ao mesmo tempo.`
      : "";

    // Build central theme context
    const themeContext = brandSettings.centralTheme
      ? `
📌 TEMA CENTRAL: ${brandSettings.centralTheme.toUpperCase()}
${THEME_DESCRIPTIONS[brandSettings.centralTheme] || ""}
Este tema deve permear TODO o conteúdo gerado.`
      : "";

    // Build profile identity context
    const profileContext = brandSettings.profileName
      ? `
👤 PERFIL: ${brandSettings.profileName} (${brandSettings.handle})
Este é um perfil de ${brandSettings.centralTheme || "conteúdo"} no Instagram.`
      : "";

    // CONFIG 7 - Caption configuration context
    const captionConfig = brandSettings.captionConfig || { variationCount: 6, maxLength: "mista", useFixedHashtags: true };
    const captionLengthMap: Record<string, string> = {
      curta: "APENAS legendas curtas (1 frase)",
      media: "APENAS legendas médias (2 frases)",
      longa: "APENAS legendas longas (3+ frases)",
      mista: "Mix de tamanhos: 2 curtas, 2 médias, 2 longas"
    };
    const captionContext = `
📝 CONFIG 7 — LEGENDAS:
- Quantidade de variações: ${captionConfig.variationCount}
- Formato: ${captionLengthMap[captionConfig.maxLength] || captionLengthMap.mista}
- Hashtags: ${captionConfig.useFixedHashtags ? "Incluir hashtags fixas do perfil" : "NÃO incluir hashtags"}`;

    // CONFIG 8 - Music preset context
    const musicStyles = brandSettings.musicPreset?.styles || ["Rap", "Indie", "Atmosférico", "Synth-pop"];
    const musicContext = `
🎵 CONFIG 8 — BASE MUSICAL:
Estilos permitidos (NÃO SAIR DESTA BASE): ${musicStyles.join(", ")}
${brandSettings.favoriteMusics ? `Músicas favoritas (PRIORIZAR): ${brandSettings.favoriteMusics}` : ""}
Regras:
- Não repetir música no mesmo carrossel
- ${captionConfig.variationCount} músicas diferentes (uma por legenda)
- Manter consistência com o nicho do perfil`;

    // Build CTA context
    const ctaList = brandSettings.ctaList && brandSettings.ctaList.length > 0 
      ? brandSettings.ctaList 
      : [brandSettings.cta];
    const ctaContext = ctaList.length > 1
      ? `CTAs disponíveis (alternar entre eles): ${ctaList.join(" | ")}`
      : `CTA: ${ctaList[0]}`;

    const userPrompt = `${profileContext}
${themeContext}
${pillarsContext}
${voiceTonesContext}
${captionContext}
${musicContext}

HORÁRIO DO POST: ${horario}
HANDLE: ${brandSettings.handle}
${ctaContext}
HASHTAGS: ${captionConfig.useFixedHashtags ? brandSettings.hashtags : "NÃO INCLUIR hashtags fixas"}
ESTILO DE VOZ (legado): ${brandSettings.voiceStyle}
${shouldIncludeBible ? `REFERÊNCIAS BÍBLICAS PREFERIDAS (usar quando apropriado, máx 2): ${brandSettings.biblicalReferences}` : "REFERÊNCIAS BÍBLICAS: NÃO INCLUIR versículos neste post"}
${postReferenceContext}

IMAGENS RECEBIDAS (${images.length} imagens):
${imageList}

Gere o conteúdo seguindo RIGOROSAMENTE o protocolo AlphaCode:
1. ${images.length} textos (um por imagem) - SEGUIR OS PILARES DE CONTEÚDO E TOM DE VOZ configurados
2. ${images.length} referências de imagem
3. ${captionConfig.variationCount} legendas (${captionLengthMap[captionConfig.maxLength]}) com músicas diferentes DOS ESTILOS PERMITIDOS
4. ${isSpecialHour ? `⚠️ HORÁRIO ESPECIAL (${horario}): RESPEITAR as regras de linguagem permitida/proibida` : `Use o tom configurado: ${postRef?.tone || "padrão"}`}
${shouldIncludeBible ? "5. Inclua até 2 referências bíblicas das preferidas do usuário nos textos, quando couber naturalmente" : ""}

CRÍTICO: 
- Respeite os PILARES DE CONTEÚDO - cada texto deve conectar-se a pelo menos um pilar
- Respeite o TOM DE VOZ configurado - a forma de escrever deve refletir os tons selecionados
- O TEMA CENTRAL deve permear todo o conteúdo
- MÚSICAS: Usar APENAS estilos da base musical configurada
- LEGENDAS: Seguir quantidade e formato configurados (${captionConfig.variationCount} legendas, formato ${captionConfig.maxLength})
${isSpecialHour ? `- HORÁRIO ESPECIAL: Seguir RIGOROSAMENTE as regras de linguagem para ${horario}` : ""}

Responda APENAS com o JSON, sem texto adicional.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: ALPHACODE_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
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
    let content = data.choices?.[0]?.message?.content || "";
    
    // Clean up the response - extract JSON if wrapped in markdown
    content = content.trim();
    if (content.startsWith("```json")) {
      content = content.slice(7);
    }
    if (content.startsWith("```")) {
      content = content.slice(3);
    }
    if (content.endsWith("```")) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    // Fix common JSON formatting issues from AI responses
    // Fix missing commas between properties (e.g., "value"\n  "key" -> "value",\n  "key")
    content = content.replace(/"\s*\n\s*"/g, '",\n"');
    // Fix missing commas after closing braces/brackets followed by opening braces/brackets
    content = content.replace(/}\s*\n\s*{/g, '},\n{');
    content = content.replace(/]\s*\n\s*\[/g, '],\n[');
    // Fix missing commas after strings followed by opening braces
    content = content.replace(/"\s*\n\s*{/g, '",\n{');
    // Fix trailing commas before closing brackets/braces
    content = content.replace(/,\s*}/g, '}');
    content = content.replace(/,\s*]/g, ']');

    let generatedContent;
    try {
      generatedContent = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response as JSON");
    }

    return new Response(JSON.stringify({
      success: true,
      content: generatedContent,
      horario,
      brandSettings,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating content:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
