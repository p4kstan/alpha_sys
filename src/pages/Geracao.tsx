import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Copy, 
  Check,
  BookOpen,
  MessageSquare,
  Hash,
  ArrowRight,
  Clock,
  AlertTriangle,
  RefreshCw,
  Music
} from "lucide-react";
import CommandLayout from "@/components/layout/CommandLayout";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface AnalyzedAsset {
  id: string;
  description: string;
  type: "image" | "video";
  preview: string;
}

interface LocationState {
  assets: AnalyzedAsset[];
  horario: string;
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
  captionConfig?: CaptionConfig;
  musicPreset?: MusicPreset;
  specialHours?: string[];
}

interface TextoGerado {
  numero: number;
  frase: string;
}

interface ReferenciaImagem {
  numero: number;
  descricao: string;
}

interface Legenda {
  tipo: string;
  texto: string;
  musica: {
    nome: string;
    artista: string;
  };
}

interface GeneratedContent {
  textos: TextoGerado[];
  referencias: ReferenciaImagem[];
  legendas: Legenda[];
}

const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  handle: "@alphacode.supremacy",
  cta: "Siga @alphacode.supremacy",
  hashtags: "#motivation #deus #motivação #foco #instagood",
  voiceStyle: "masculino, liderança, estoico, high value",
  favoriteMusics: "",
  biblicalReferencesEnabled: true,
  biblicalReferencesFilter: ["06:00"],
  biblicalReferences: "",
  captionConfig: {
    variationCount: 6,
    maxLength: "mista",
    useFixedHashtags: true,
  },
  musicPreset: {
    styles: ["Rap", "Indie", "Atmosférico", "Synth-pop"],
  },
};

const Geracao = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = location.state as LocationState | null;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);

  const assets = state?.assets || [];
  const horario = state?.horario || "";

  useEffect(() => {
    // Load brand settings
    const saved = localStorage.getItem("alphacode-brand-settings");
    if (saved) {
      try {
        setBrandSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading brand settings:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (state && assets.length > 0) {
      generateContent();
    }
  }, [brandSettings]);

  const generateContent = async () => {
    if (assets.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          images: assets.map(a => ({ id: a.id, description: a.description })),
          horario,
          brandSettings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate content");
      }

      const data = await response.json();
      setGeneratedContent(data.content);
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar o conteúdo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyAllTexts = () => {
    if (!generatedContent) return;
    const allTexts = generatedContent.textos
      .map(t => `texto ${t.numero} - ${t.frase}`)
      .join("\n\n");
    handleCopy(allTexts, "all-texts");
  };

  const copyAllReferences = () => {
    const refs = assets
      .map((a, i) => `texto ${i + 1} = imagem = ${a.description}`)
      .join("\n");
    handleCopy(`📌 REFERÊNCIA DAS IMAGENS\n${refs}`, "all-refs");
  };

  const copyLegenda = (legenda: Legenda, index: number) => {
    const fullLegenda = `${legenda.texto}

Segue ${brandSettings.handle}

${brandSettings.hashtags}
🎵 Música sugerida: "${legenda.musica.nome}" – ${legenda.musica.artista}`;
    handleCopy(fullLegenda, `legenda-${index}`);
  };

  if (!state) {
    return (
      <CommandLayout>
        <div className="container mx-auto px-6 py-8 max-w-2xl">
          <div className="command-card text-center py-12">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-card-foreground mb-2">
              Nenhum dado encontrado
            </h2>
            <p className="text-muted-foreground mb-6">
              Retorne à triagem para iniciar o processo.
            </p>
            <Button variant="tactical" onClick={() => navigate("/triagem")}>
              Ir para Triagem
            </Button>
          </div>
        </div>
      </CommandLayout>
    );
  }

  return (
    <CommandLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
              TELA 3
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground">•</span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-primary">
              GERAÇÃO ALPHACODE
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-card-foreground">
                Conteúdo Gerado
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <Clock className="w-4 h-4" />
                Horário: <span className="font-mono text-primary">{horario}</span>
                {horario === "06:00" && (
                  <span className="px-2 py-0.5 text-[10px] md:text-xs rounded-full bg-primary/20 text-primary">
                    + Versículo
                  </span>
                )}
              </p>
            </div>
            <Button 
              variant="stealth" 
              size="sm"
              onClick={generateContent}
              disabled={isGenerating}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
              Regenerar
            </Button>
          </div>
        </motion.div>

        {/* Loading State */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="command-card text-center py-12 md:py-16"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 mb-4 md:mb-6">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary animate-pulse" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-card-foreground mb-2">
                Executando protocolo AlphaCode...
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Gerando textos, legendas e referências
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generated Content */}
        <AnimatePresence>
          {!isGenerating && generatedContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 md:space-y-8"
            >
              {/* Referência das Imagens - ANTES dos textos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="command-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                    <h3 className="text-sm md:text-base font-semibold text-card-foreground uppercase tracking-wide">
                      📌 Referência das Imagens
                    </h3>
                  </div>
                  <Button variant="stealth" size="sm" onClick={copyAllReferences} className="w-full sm:w-auto">
                    {copiedId === "all-refs" ? (
                      <Check className="w-4 h-4 mr-1 text-success" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1" />
                    )}
                    Copiar Bloco
                  </Button>
                </div>
                <div className="space-y-2 md:space-y-3">
                  {assets.map((asset, index) => (
                    <div key={index} className="flex items-start gap-3 md:gap-4 p-2 md:p-3 rounded-lg bg-muted/30 border border-border">
                      {/* Thumbnail da imagem */}
                      <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden border border-border bg-card">
                        <img 
                          src={asset.preview} 
                          alt={`Referência ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 font-mono text-xs md:text-sm min-w-0">
                        <p className="text-muted-foreground break-words">
                          texto {index + 1} = imagem = <span className="text-card-foreground">{asset.description}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Textos das Imagens */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="command-card border-tactical"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <h3 className="text-sm md:text-base font-semibold text-card-foreground uppercase tracking-wide">
                      Textos das Imagens
                    </h3>
                  </div>
                  <Button variant="stealth" size="sm" onClick={copyAllTexts} className="w-full sm:w-auto">
                    {copiedId === "all-texts" ? (
                      <Check className="w-4 h-4 mr-1 text-success" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1" />
                    )}
                    Copiar Todos
                  </Button>
                </div>
                <div className="space-y-2 md:space-y-3">
                  {generatedContent.textos.map((texto, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/30 border border-border group"
                    >
                      <span className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/20 flex items-center justify-center text-xs md:text-sm font-mono text-primary">
                        {texto.numero}
                      </span>
                      <p className="flex-1 text-xs md:text-sm text-card-foreground font-medium min-w-0 break-words">
                        texto {texto.numero} - {texto.frase}
                      </p>
                      <button
                        onClick={() => handleCopy(`texto ${texto.numero} - ${texto.frase}`, `texto-${index}`)}
                        className="flex-shrink-0 p-1 md:p-1.5 rounded-md hover:bg-muted transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        {copiedId === `texto-${index}` ? (
                          <Check className="w-3 h-3 md:w-4 md:h-4 text-success" />
                        ) : (
                          <Copy className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Legendas */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="command-card border-tactical"
              >
                <div className="flex items-center gap-2 mb-4 md:mb-6">
                  <Hash className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  <h3 className="text-sm md:text-base font-semibold text-card-foreground uppercase tracking-wide">
                    🔹 Legendas — {brandSettings.captionConfig?.variationCount || 6} Variações
                  </h3>
                </div>
                <div className="grid gap-3 md:gap-4">
                  {generatedContent.legendas.map((legenda, index) => (
                    <div 
                      key={index}
                      className="relative p-3 md:p-4 rounded-lg bg-muted/30 border border-border group"
                    >
                      <div className="flex items-center gap-2 mb-2 md:mb-3">
                        <span className="px-2 py-0.5 text-[10px] md:text-xs rounded-full bg-primary/20 text-primary uppercase">
                          Legenda {index + 1} — {legenda.tipo}
                        </span>
                      </div>
                      <div className="space-y-2 md:space-y-3 pr-10 md:pr-12">
                        <p className="text-xs md:text-sm text-card-foreground whitespace-pre-line break-words">
                          {legenda.texto}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Segue {brandSettings.handle}
                        </p>
                        <p className="text-primary text-[10px] md:text-sm break-all">
                          {brandSettings.hashtags}
                        </p>
                        <p className="text-muted-foreground text-[10px] md:text-sm flex items-center gap-2 flex-wrap">
                          <Music className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                          🎵 Música: "{legenda.musica.nome}" – {legenda.musica.artista}
                        </p>
                      </div>
                      <button
                        onClick={() => copyLegenda(legenda, index)}
                        className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 md:p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        {copiedId === `legenda-${index}` ? (
                          <Check className="w-3 h-3 md:w-4 md:h-4 text-success" />
                        ) : (
                          <Copy className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Back to Dashboard */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center pt-2 md:pt-4"
              >
                <Button
                  variant="tactical"
                  size="lg"
                  onClick={() => navigate("/")}
                  className="w-full sm:w-auto"
                >
                  Voltar ao Dashboard
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CommandLayout>
  );
};

export default Geracao;
