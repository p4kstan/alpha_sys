import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Shield, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  BookOpen,
  Mic,
  Hash,
  MessageSquare,
  Zap
} from "lucide-react";
import CommandLayout from "@/components/layout/CommandLayout";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
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

// Mapeamento de tom de comunicação por horário
const VOICE_BY_TIME: Record<string, string> = {
  "06:00": "Trava Absoluta — Fé, gratidão, oração simples",
  "09:00": "Foco & Execução — Produtividade, disciplina",
  "12:00": "Mentalidade Alpha — Liderança, estratégia",
  "18:00": "Reflexão — Estoicismo, aprendizado",
  "21:00": "Encerramento — Agradecimento, propósito",
};

const Confirmacao = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(null);

  const assets = state?.assets || [];
  const horario = state?.horario || "";

  useEffect(() => {
    // Show system active toast on mount
    toast({
      title: "Sistema Ativo",
      description: "Lovable Cloud conectado e operacional.",
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("alphacode-brand-settings");
    if (saved) {
      try {
        setBrandSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading brand settings:", e);
      }
    }
  }, []);

  // Verificar se referências bíblicas estão ativadas para o horário selecionado
  const isBibleEnabledForTime = brandSettings?.biblicalReferencesEnabled && 
    brandSettings?.biblicalReferencesFilter?.includes(horario);

  const handleConfirm = async () => {
    setIsConfirming(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsConfirmed(true);
    setIsConfirming(false);
    
    // Auto-navigate after confirmation
    setTimeout(() => {
      navigate("/geracao", { state: { assets, horario } });
    }, 1000);
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
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
              TELA 2
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground">•</span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-primary">
              CONFIRMAÇÃO
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-card-foreground">
            Confirmar Ordem
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Revise e confirme os dados antes da geração.
          </p>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="command-card mb-6 md:mb-8"
        >
          <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-border">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <h3 className="text-base md:text-lg font-semibold text-card-foreground">
              Resumo da Ordem
            </h3>
          </div>

          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between py-2 md:py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Ativos</span>
              <span className="font-mono text-sm text-card-foreground">
                {assets.length} {assets.length === 1 ? "arquivo" : "arquivos"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 md:py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">Horário</span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-mono text-sm text-card-foreground">{horario}</span>
              </div>
            </div>
            
            {/* Tom de Comunicação */}
            <div className="flex items-start justify-between py-2 md:py-3 border-b border-border gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                <Mic className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tom</span>
              </div>
              <span className="text-xs md:text-sm text-card-foreground text-right max-w-[180px] md:max-w-[200px]">
                {VOICE_BY_TIME[horario] || "Padrão"}
              </span>
            </div>

            {/* Referências Bíblicas */}
            <div className="flex items-center justify-between py-2 md:py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Versículos</span>
              </div>
              <span className={`text-xs md:text-sm font-medium ${isBibleEnabledForTime ? "text-success" : "text-muted-foreground"}`}>
                {isBibleEnabledForTime ? "Ativado" : "Desativado"}
              </span>
            </div>

            {/* Estilo de Voz */}
            {brandSettings?.voiceStyle && (
              <div className="flex items-start justify-between py-2 md:py-3 border-b border-border gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Estilo</span>
                </div>
                <span className="text-xs md:text-sm text-card-foreground text-right max-w-[180px] md:max-w-[200px]">
                  {brandSettings.voiceStyle}
                </span>
              </div>
            )}

            {/* Hashtags */}
            {brandSettings?.hashtags && (
              <div className="flex items-start justify-between py-2 md:py-3 border-b border-border gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Hashtags</span>
                </div>
                <div className="text-right max-w-[180px] md:max-w-[220px]">
                  <span className="text-[10px] md:text-xs text-primary font-mono leading-relaxed break-all">
                    {brandSettings.hashtags}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-2 md:py-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="flex items-center gap-2 text-warning text-xs md:text-sm">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                Aguardando confirmação
              </span>
            </div>
          </div>
        </motion.div>

        {/* Confirmation Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center"
        >
          {!isConfirmed ? (
            <Button
              variant="command"
              size="xl"
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full max-w-md h-16 md:h-20 text-base md:text-xl"
            >
              {isConfirming ? (
                <>
                  <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                  ORDEM CONFIRMADA
                </>
              )}
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 md:gap-4"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-success" />
              </div>
              <div className="text-center">
                <p className="text-base md:text-lg font-semibold text-card-foreground">
                  Ordem Registrada
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Preparando geração...
                </p>
              </div>
            </motion.div>
          )}

          {!isConfirmed && (
            <p className="text-[10px] md:text-xs text-muted-foreground mt-3 md:mt-4 text-center max-w-sm px-4">
              Ao confirmar, você autoriza a geração de conteúdo baseado nos 
              ativos analisados.
            </p>
          )}
        </motion.div>
      </div>
    </CommandLayout>
  );
};

export default Confirmacao;
