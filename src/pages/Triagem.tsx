import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  X, 
  Clock,
  AlertTriangle,
  ArrowRight,
  FileCheck
} from "lucide-react";
import CommandLayout from "@/components/layout/CommandLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
}

interface AnalyzedAsset {
  id: string;
  description: string;
  type: "image" | "video";
  preview: string;
}

const DEFAULT_HORARIOS = [
  "06:00", "09:00", "12:00", "18:00", "21:00"
];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const Triagem = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedHorario, setSelectedHorario] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedAssets, setAnalyzedAssets] = useState<AnalyzedAsset[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [horarios, setHorarios] = useState<string[]>(DEFAULT_HORARIOS);

  // Load configured time slots from brand settings
  useEffect(() => {
    const saved = localStorage.getItem("alphacode-brand-settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.timeSlots && settings.timeSlots.length > 0) {
          setHorarios(settings.timeSlots.map((s: { value: string }) => s.value));
        }
      } catch (e) {
        console.error("Error loading brand settings:", e);
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      processFiles(files);
    }
  };

  const processFiles = (files: File[]) => {
    const newAssets: Asset[] = files
      .filter(file => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        type: file.type.startsWith("image/") ? "image" : "video",
      }));
    
    setAssets(prev => [...prev, ...newAssets]);
  };

  const removeAsset = (id: string) => {
    setAssets(prev => {
      const asset = prev.find(a => a.id === id);
      if (asset) URL.revokeObjectURL(asset.preview);
      return prev.filter(a => a.id !== id);
    });
  };

  const handleAnalyze = async () => {
    if (assets.length === 0 || !selectedHorario) return;
    
    setIsAnalyzing(true);
    
    try {
      const analyzed: AnalyzedAsset[] = [];
      
      for (const asset of assets) {
        if (asset.type === "image") {
          try {
            const base64 = await fileToBase64(asset.file);
            
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                imageBase64: base64,
                mimeType: asset.file.type,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to analyze image");
            }

            const data = await response.json();
            analyzed.push({
              id: asset.id,
              description: data.description,
              type: asset.type,
              preview: asset.preview,
            });
          } catch (error) {
            console.error("Error analyzing image:", error);
            analyzed.push({
              id: asset.id,
              description: "Erro ao analisar imagem",
              type: asset.type,
              preview: asset.preview,
            });
          }
        } else {
          analyzed.push({
            id: asset.id,
            description: "Vídeo - análise manual necessária",
            type: asset.type,
            preview: asset.preview,
          });
        }
      }
      
      setAnalyzedAssets(analyzed);
    } catch (error) {
      console.error("Error during analysis:", error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível analisar os ativos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isReadyToAnalyze = assets.length > 0 && selectedHorario !== "";
  const isAnalysisComplete = analyzedAssets.length > 0;

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
              TELA 1
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground">•</span>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-primary">
              TRIAGEM
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-card-foreground">
            Input de Ativos
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Faça upload dos seus ativos e selecione o horário de publicação.
          </p>
        </motion.div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 md:mb-8"
        >
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 md:p-12
              transition-all duration-200 cursor-pointer
              ${isDragOver 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-muted-foreground"
              }
            `}
          >
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-3 md:gap-4 text-center">
              <div className={`
                p-3 md:p-4 rounded-full transition-colors duration-200
                ${isDragOver ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
              `}>
                <Upload className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <p className="text-sm md:text-base text-card-foreground font-medium mb-1">
                  Arraste seus arquivos aqui
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  ou clique para selecionar — imagens e vídeos
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Asset Preview Grid */}
        <AnimatePresence>
          {assets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <h3 className="text-sm font-medium text-card-foreground mb-4 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                {assets.length} ativo{assets.length > 1 ? "s" : ""} selecionado{assets.length > 1 ? "s" : ""}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {assets.map((asset, index) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-card"
                  >
                    {asset.type === "image" ? (
                      <img 
                        src={asset.preview} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Video className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => removeAsset(asset.id)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-card/80 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2">
                      <span className="text-xs font-mono bg-card/80 px-2 py-1 rounded text-muted-foreground">
                        {index + 1}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Time Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <h3 className="text-xs md:text-sm font-medium text-card-foreground mb-3 md:mb-4 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            Horário de Publicação
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
            {horarios.map((horario) => (
              <button
                key={horario}
                onClick={() => setSelectedHorario(horario)}
                className={`
                  py-2.5 md:py-3 px-2 md:px-4 rounded-lg border text-center font-mono text-xs md:text-sm
                  transition-all duration-200
                  ${selectedHorario === horario
                    ? "border-primary bg-primary/10 text-primary glow-primary"
                    : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-card-foreground"
                  }
                `}
              >
                {horario}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Analyze Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 md:mb-8"
        >
          <Button
            variant="tactical"
            size="xl"
            onClick={handleAnalyze}
            disabled={!isReadyToAnalyze || isAnalyzing}
            className="w-full text-sm md:text-base"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Analisando Ativos...
              </>
            ) : (
              <>
                Analisar Ativos
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-2" />
              </>
            )}
          </Button>
        </motion.div>

        {/* Analysis Results */}
        <AnimatePresence>
          {isAnalysisComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="command-card border-tactical">
                <h3 className="text-sm font-semibold text-card-foreground mb-4 tracking-wide uppercase">
                  Análise Concluída
                </h3>
                <div className="space-y-4">
                  {analyzedAssets.map((asset, index) => (
                    <motion.div
                      key={asset.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 py-3 border-b border-border last:border-0"
                    >
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-mono text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {asset.type === "image" ? (
                            <ImageIcon className="w-4 h-4 text-primary" />
                          ) : (
                            <Video className="w-4 h-4 text-primary" />
                          )}
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">
                            {asset.type === "image" ? "Imagem" : "Vídeo"}
                          </span>
                        </div>
                        <p className="text-sm text-card-foreground">
                          {asset.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Confirmation Warning */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-4 p-4 rounded-lg border border-warning/30 bg-warning/5"
              >
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                <p className="text-sm text-card-foreground">
                  <span className="font-semibold">⚠️ ORDEM CONFIRMADA</span>
                  {" "} — Revise os ativos acima antes de prosseguir para a geração.
                </p>
              </motion.div>

              {/* Proceed Button */}
              <Button
                variant="command"
                size="xl"
                onClick={() => navigate("/confirmacao", { 
                  state: { 
                    assets: analyzedAssets, 
                    horario: selectedHorario 
                  } 
                })}
                className="w-full"
              >
                Prosseguir para Confirmação
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CommandLayout>
  );
};

export default Triagem;
