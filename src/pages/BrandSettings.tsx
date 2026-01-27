import { useState, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  AtSign, 
  MessageSquare, 
  Hash, 
  Mic,
  ArrowLeft,
  Save,
  Check,
  Music,
  BookOpen,
  FileText,
  Clock,
  ChevronDown,
  X,
  Plus,
  User,
  Layers,
  Volume2,
  Sparkles,
  FolderOpen,
  Trash2,
  Copy,
  MoreVertical,
  AlertTriangle,
  Captions,
  Disc3,
  Brain
} from "lucide-react";
import CommandLayout from "@/components/layout/CommandLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AIProviderSettings from "@/components/settings/AIProviderSettings";

interface PostReference {
  example: string;
  tone: string;
  notes: string;
  allowedLanguage?: string;
  prohibitedLanguage?: string;
  isSpecialHour?: boolean;
}

interface TimeSlot {
  value: string;
  description: string;
}

interface CaptionConfig {
  variationCount: number;
  maxLength: "curta" | "media" | "longa" | "mista";
  useFixedHashtags: boolean;
}

interface MusicPreset {
  styles: string[];
}

interface CustomTheme {
  value: string;
  label: string;
  icon: string;
}

interface BrandSettings {
  // CONFIG 1 - Identidade do Perfil
  handle: string;
  profileName: string;
  centralTheme: string;
  customThemes: CustomTheme[];
  
  // CONFIG 2 - Pilares de Conteúdo
  contentPillars: string[];
  
  // CONFIG 3 - Tom de Voz
  voiceTones: string[];
  customVoiceTones: string[];
  
  // CONFIG 4 - Regras de Horário
  specialHours: string[];
  postReferences: Record<string, PostReference>;
  timeSlots: TimeSlot[];
  
  // CONFIG 7 - Legendas
  captionConfig: CaptionConfig;
  ctaList: string[];
  
  // CONFIG 8 - Base Musical
  musicPreset: MusicPreset;
  
  // Configurações Adicionais
  cta: string;
  hashtags: string;
  voiceStyle: string;
  favoriteMusics: string;
  biblicalReferencesEnabled: boolean;
  biblicalReferencesFilter: string[];
  biblicalReferences: string;
}

interface SavedPreset {
  id: string;
  name: string;
  settings: BrandSettings;
  createdAt: string;
}

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { value: "06:00", description: "Manhã - Gratidão e fé" },
  { value: "09:00", description: "Início do dia - Foco" },
  { value: "12:00", description: "Meio-dia - Reflexão" },
  { value: "18:00", description: "Fim do dia - Conquista" },
  { value: "21:00", description: "Noite - Mentalidade" },
];

// Temas centrais disponíveis
const CENTRAL_THEMES = [
  { value: "motivacional", label: "Motivacional", icon: "🔥" },
  { value: "educacional", label: "Educacional", icon: "📚" },
  { value: "autoridade", label: "Autoridade", icon: "👑" },
  { value: "conversao", label: "Conversão", icon: "💰" },
  { value: "lifestyle", label: "Lifestyle", icon: "✨" },
  { value: "fe", label: "Fé", icon: "✝️" },
  { value: "negocios", label: "Negócios", icon: "💼" },
  { value: "estetico", label: "Estético", icon: "🎨" },
];

// Pilares de conteúdo por nicho
const PILLAR_PRESETS: Record<string, string[]> = {
  motivacional: ["Disciplina", "Fé prática", "Silêncio", "Responsabilidade", "Dor real", "Constância", "Verdade dura"],
  fitness: ["Disciplina corporal", "Constância", "Dor do processo", "Autoimagem", "Superação física", "Estética com propósito"],
  negocios: ["Responsabilidade financeira", "Processo", "Decisão difícil", "Foco", "Longo prazo", "Anti-ilusão"],
  fe: ["Gratidão", "Entrega", "Direção divina", "Confiança", "Propósito", "Tempo de Deus"],
  lifestyle: ["Autenticidade", "Liberdade", "Experiências", "Equilíbrio", "Crescimento pessoal"],
  autoridade: ["Expertise", "Resultados", "Método", "Prova social", "Diferenciação"],
  conversao: ["Escassez", "Urgência", "Transformação", "Resultados", "Chamada à ação"],
  educacional: ["Clareza", "Passo a passo", "Desmistificação", "Aplicação prática", "Estrutura"],
  estetico: ["Visual impactante", "Composição", "Minimalismo", "Cores", "Consistência visual"],
};

// Opções de Tom de Voz
const VOICE_TONE_OPTIONS = [
  { value: "direto", label: "Direto / Estoico", description: "Comunicação sem rodeios, objetiva" },
  { value: "espiritual", label: "Espiritual Simples", description: "Linguagem de fé, humilde" },
  { value: "provocativo", label: "Provocativo", description: "Desafia, questiona, incomoda" },
  { value: "reflexivo", label: "Reflexivo", description: "Convida à introspecção" },
  { value: "educacional", label: "Educacional", description: "Ensina, explica, orienta" },
  { value: "autoridade", label: "Autoridade", description: "Tom de especialista, confiante" },
  { value: "minimalista", label: "Minimalista", description: "Menos é mais, essência" },
  { value: "imperativo", label: "Imperativo", description: "Ordens diretas, comandos" },
];

const getDefaultToneForTime = (time: string): string => {
  const hour = parseInt(time.split(":")[0]);
  if (hour >= 5 && hour < 9) return "Gratidão, oração, simplicidade";
  if (hour >= 9 && hour < 12) return "Foco, determinação, energia";
  if (hour >= 12 && hour < 15) return "Reflexão, sabedoria, pausa";
  if (hour >= 15 && hour < 19) return "Conquista, vitória, força";
  return "Mentalidade, introspecção, propósito";
};

const DEFAULT_POST_REFERENCES: Record<string, PostReference> = {
  "06:00": { example: "", tone: "Gratidão, oração, simplicidade", notes: "", allowedLanguage: "oração simples, gratidão", prohibitedLanguage: "guerra, batalha", isSpecialHour: true },
  "09:00": { example: "", tone: "Foco, determinação, energia", notes: "", allowedLanguage: "", prohibitedLanguage: "", isSpecialHour: false },
  "12:00": { example: "", tone: "Reflexão, sabedoria, pausa", notes: "", allowedLanguage: "", prohibitedLanguage: "", isSpecialHour: false },
  "18:00": { example: "", tone: "Conquista, vitória, força", notes: "", allowedLanguage: "", prohibitedLanguage: "", isSpecialHour: false },
  "21:00": { example: "", tone: "Mentalidade, introspecção, propósito", notes: "", allowedLanguage: "", prohibitedLanguage: "", isSpecialHour: false },
};

// Presets de música por nicho
const MUSIC_PRESETS: Record<string, string[]> = {
  motivacional: ["Rap", "Indie", "Atmosférico", "Synth-pop", "Electronic"],
  fitness: ["Trap", "EDM", "Hip-hop", "Electronic"],
  fe: ["Instrumental", "Atmosférico", "Acoustic", "Gospel"],
  negocios: ["Lo-fi", "Indie eletrônico", "Minimal", "Ambient"],
  lifestyle: ["Indie", "Pop alternativo", "R&B", "Lo-fi"],
  autoridade: ["Hip-hop", "Trap", "Electronic", "Cinematic"],
  conversao: ["EDM", "Pop", "Hip-hop", "Energético"],
  educacional: ["Lo-fi", "Ambient", "Instrumental", "Acoustic"],
  estetico: ["Synth-pop", "Indie", "Electronic", "Minimal"],
};

const DEFAULT_SETTINGS: BrandSettings = {
  handle: "",
  profileName: "",
  centralTheme: "motivacional",
  customThemes: [],
  contentPillars: ["Disciplina", "Fé prática", "Silêncio", "Responsabilidade", "Constância"],
  voiceTones: ["direto", "provocativo"],
  customVoiceTones: [],
  specialHours: ["06:00"],
  captionConfig: {
    variationCount: 6,
    maxLength: "mista",
    useFixedHashtags: true,
  },
  ctaList: ["Siga @alphacode.supremacy"],
  musicPreset: {
    styles: ["Rap", "Indie", "Atmosférico", "Synth-pop"],
  },
  cta: "Siga @alphacode.supremacy",
  hashtags: "#motivation #deus #motivação #foco #instagood",
  voiceStyle: "masculino, liderança, estoico, high value",
  favoriteMusics: "",
  biblicalReferencesEnabled: true,
  biblicalReferencesFilter: ["06:00"],
  biblicalReferences: "",
  postReferences: DEFAULT_POST_REFERENCES,
  timeSlots: DEFAULT_TIME_SLOTS,
};

const MUSIC_SUGGESTIONS = [
  "Money Trees - Kendrick Lamar",
  "Crew Love - Drake",
  "Do I Wanna Know? - Arctic Monkeys",
  "Midnight City - M83",
  "Location - Khalid",
  "Awake - Tycho",
];

const BIBLE_SUGGESTIONS = [
  "Salmo 37:5",
  "Provérbios 16:3",
  "Filipenses 4:13",
  "Isaías 41:10",
  "Romanos 8:28",
  "Mateus 6:33",
];

// Componente minimalista para referências de posts
interface PostReferencesSectionProps {
  settings: BrandSettings;
  setSettings: React.Dispatch<React.SetStateAction<BrandSettings>>;
}

const PostReferencesSection = forwardRef<HTMLDivElement, PostReferencesSectionProps>(
  ({ settings, setSettings }, ref) => {
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const timeSlots = settings.timeSlots || DEFAULT_TIME_SLOTS;

  const toggleSlot = (value: string) => {
    setExpandedSlot(prev => prev === value ? null : value);
  };

  const hasContent = (value: string) => {
    const ref = settings.postReferences?.[value];
    const defaultTone = getDefaultToneForTime(value);
    return ref && (ref.example || ref.notes || ref.tone !== defaultTone);
  };

  return (
    <div ref={ref} className="space-y-4">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="p-2 md:p-2.5 rounded-lg bg-primary/20">
          <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-semibold text-card-foreground mb-1">
            Referências por Horário
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            Clique em um horário para configurar tom e referências
          </p>
          
          {/* Time Slot Buttons */}
          <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
            {timeSlots.map((horario) => {
              const isExpanded = expandedSlot === horario.value;
              const hasData = hasContent(horario.value);
              return (
                <button
                  key={horario.value}
                  onClick={() => toggleSlot(horario.value)}
                  className={`
                    flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border transition-all text-xs md:text-sm
                    ${isExpanded 
                      ? "bg-primary/20 border-primary text-primary" 
                      : hasData
                        ? "bg-success/10 border-success/30 text-success"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-card-foreground"
                    }
                  `}
                >
                  <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  <span className="font-mono">{horario.value}</span>
                  {hasData && !isExpanded && (
                    <Check className="w-3 h-3" />
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
              );
            })}
          </div>

          {/* Expanded Form */}
          <AnimatePresence mode="wait">
            {expandedSlot && (
              <motion.div
                key={expandedSlot}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {(() => {
                  const horario = timeSlots.find(h => h.value === expandedSlot);
                  if (!horario) return null;
                  const defaultTone = getDefaultToneForTime(horario.value);
                  const ref = settings.postReferences?.[horario.value] || { example: "", tone: defaultTone, notes: "" };
                  return (
                    <div className="border border-primary/30 rounded-lg p-4 bg-primary/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-primary">{horario.value}</span>
                          <span className="text-xs text-muted-foreground">— {horario.description}</span>
                        </div>
                        <button
                          onClick={() => setExpandedSlot(null)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Tom de Voz
                          </Label>
                          <Input
                            value={ref.tone}
                            onChange={(e) => {
                              setSettings(prev => ({
                                ...prev,
                                postReferences: {
                                  ...prev.postReferences,
                                  [horario.value]: { ...ref, tone: e.target.value }
                                }
                              }));
                            }}
                            placeholder="Ex: Gratidão, oração, simplicidade"
                            className="bg-muted/50 border-border"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Exemplo de referência
                          </Label>
                          <Textarea
                            value={ref.example}
                            onChange={(e) => {
                              setSettings(prev => ({
                                ...prev,
                                postReferences: {
                                  ...prev.postReferences,
                                  [horario.value]: { ...ref, example: e.target.value }
                                }
                              }));
                            }}
                            placeholder="Cole um texto de exemplo..."
                            className="bg-muted/50 border-border resize-none"
                            rows={2}
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs text-muted-foreground mb-2 block">
                            Notas
                          </Label>
                          <Input
                            value={ref.notes}
                            onChange={(e) => {
                              setSettings(prev => ({
                                ...prev,
                                postReferences: {
                                  ...prev.postReferences,
                                  [horario.value]: { ...ref, notes: e.target.value }
                                }
                              }));
                            }}
                            placeholder="Ex: Evitar guerra/batalha"
                            className="bg-muted/50 border-border"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

PostReferencesSection.displayName = "PostReferencesSection";

const BrandSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<BrandSettings>(DEFAULT_SETTINGS);
  const [isSaved, setIsSaved] = useState(false);
  const [customPillar, setCustomPillar] = useState("");
  
  // Presets state
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);

  // Additional state for custom inputs
  const [customThemeInput, setCustomThemeInput] = useState("");
  const [customVoiceToneInput, setCustomVoiceToneInput] = useState("");
  const [customCtaInput, setCustomCtaInput] = useState("");
  const [customMusicStyleInput, setCustomMusicStyleInput] = useState("");

  // Progress calculation for each tab
  const calculateIdentidadeProgress = () => {
    let filled = 0;
    let total = 4;
    if (settings.profileName?.trim()) filled++;
    if (settings.handle?.trim()) filled++;
    if (settings.centralTheme) filled++;
    if (settings.contentPillars?.length > 0) filled++;
    return { filled, total, percentage: Math.round((filled / total) * 100) };
  };

  const calculateRegrasProgress = () => {
    let filled = 0;
    let total = 3;
    if (settings.timeSlots?.length > 0) filled++;
    if (settings.specialHours?.length > 0) filled++;
    if (settings.biblicalReferencesEnabled !== undefined) filled++;
    return { filled, total, percentage: Math.round((filled / total) * 100) };
  };

  const calculateMidiaProgress = () => {
    let filled = 0;
    let total = 3;
    if (settings.captionConfig?.variationCount) filled++;
    if (settings.musicPreset?.styles?.length > 0) filled++;
    if (settings.ctaList?.length > 0) filled++;
    return { filled, total, percentage: Math.round((filled / total) * 100) };
  };

  const identidadeProgress = calculateIdentidadeProgress();
  const regrasProgress = calculateRegrasProgress();
  const midiaProgress = calculateMidiaProgress();

  useEffect(() => {
    // Load current settings
    const saved = localStorage.getItem("alphacode-brand-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          contentPillars: parsed.contentPillars || DEFAULT_SETTINGS.contentPillars,
          voiceTones: parsed.voiceTones || DEFAULT_SETTINGS.voiceTones,
          customVoiceTones: parsed.customVoiceTones || [],
          customThemes: parsed.customThemes || [],
          profileName: parsed.profileName || "",
          centralTheme: parsed.centralTheme || DEFAULT_SETTINGS.centralTheme,
          specialHours: parsed.specialHours || DEFAULT_SETTINGS.specialHours,
          captionConfig: parsed.captionConfig || DEFAULT_SETTINGS.captionConfig,
          ctaList: parsed.ctaList || DEFAULT_SETTINGS.ctaList,
          musicPreset: parsed.musicPreset || DEFAULT_SETTINGS.musicPreset,
        });
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    }
    
    // Load presets
    const savedPresets = localStorage.getItem("alphacode-presets");
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error("Error loading presets:", e);
      }
    }
    
    // Load active preset ID
    const activeId = localStorage.getItem("alphacode-active-preset");
    if (activeId) {
      setActivePresetId(activeId);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("alphacode-brand-settings", JSON.stringify(settings));
    setIsSaved(true);
    
    // If there's an active preset, update it too
    if (activePresetId) {
      const updatedPresets = presets.map(p => 
        p.id === activePresetId ? { ...p, settings } : p
      );
      setPresets(updatedPresets);
      localStorage.setItem("alphacode-presets", JSON.stringify(updatedPresets));
    }
    
    toast({
      title: "Configurações salvas",
      description: activePresetId 
        ? `Preset "${presets.find(p => p.id === activePresetId)?.name}" atualizado.`
        : "Suas configurações de marca foram atualizadas.",
    });
    setTimeout(() => setIsSaved(false), 2000);
  };

  const saveAsNewPreset = () => {
    if (!newPresetName.trim()) return;
    
    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      settings: { ...settings },
      createdAt: new Date().toISOString(),
    };
    
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem("alphacode-presets", JSON.stringify(updatedPresets));
    setActivePresetId(newPreset.id);
    localStorage.setItem("alphacode-active-preset", newPreset.id);
    localStorage.setItem("alphacode-brand-settings", JSON.stringify(settings));
    
    setNewPresetName("");
    setShowSavePresetDialog(false);
    
    toast({
      title: "Preset salvo",
      description: `"${newPreset.name}" foi salvo com sucesso.`,
    });
  };

  const loadPreset = (preset: SavedPreset) => {
    setSettings(preset.settings);
    setActivePresetId(preset.id);
    localStorage.setItem("alphacode-active-preset", preset.id);
    localStorage.setItem("alphacode-brand-settings", JSON.stringify(preset.settings));
    
    toast({
      title: "Preset carregado",
      description: `"${preset.name}" está ativo.`,
    });
  };

  const deletePreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    const updatedPresets = presets.filter(p => p.id !== presetId);
    setPresets(updatedPresets);
    localStorage.setItem("alphacode-presets", JSON.stringify(updatedPresets));
    
    if (activePresetId === presetId) {
      setActivePresetId(null);
      localStorage.removeItem("alphacode-active-preset");
    }
    
    toast({
      title: "Preset removido",
      description: `"${preset?.name}" foi excluído.`,
    });
  };

  const duplicatePreset = (preset: SavedPreset) => {
    const newPreset: SavedPreset = {
      id: Date.now().toString(),
      name: `${preset.name} (cópia)`,
      settings: { ...preset.settings },
      createdAt: new Date().toISOString(),
    };
    
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem("alphacode-presets", JSON.stringify(updatedPresets));
    
    toast({
      title: "Preset duplicado",
      description: `"${newPreset.name}" foi criado.`,
    });
  };

  const updateField = (field: keyof BrandSettings, value: string | string[] | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const togglePillar = (pillar: string) => {
    setSettings(prev => {
      const current = prev.contentPillars || [];
      if (current.includes(pillar)) {
        return { ...prev, contentPillars: current.filter(p => p !== pillar) };
      }
      return { ...prev, contentPillars: [...current, pillar] };
    });
  };

  const addCustomPillar = () => {
    if (customPillar.trim() && !settings.contentPillars.includes(customPillar.trim())) {
      setSettings(prev => ({
        ...prev,
        contentPillars: [...prev.contentPillars, customPillar.trim()]
      }));
      setCustomPillar("");
    }
  };

  const toggleVoiceTone = (tone: string) => {
    setSettings(prev => {
      const current = prev.voiceTones || [];
      if (current.includes(tone)) {
        return { ...prev, voiceTones: current.filter(t => t !== tone) };
      }
      return { ...prev, voiceTones: [...current, tone] };
    });
  };

  const loadPresetPillars = (theme: string) => {
    const presetKey = theme === "fe" ? "fe" : theme;
    const preset = PILLAR_PRESETS[presetKey] || PILLAR_PRESETS.motivacional;
    setSettings(prev => ({ ...prev, contentPillars: preset }));
  };

  // Get suggested pillars based on theme
  const getSuggestedPillars = () => {
    const theme = settings.centralTheme || "motivacional";
    return PILLAR_PRESETS[theme] || PILLAR_PRESETS.motivacional;
  };

  const activePreset = presets.find(p => p.id === activePresetId);

  return (
    <CommandLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-3xl">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 md:mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs md:text-sm">Voltar ao Content Engine</span>
        </motion.button>

        {/* Header with Preset Selector */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 md:mb-8"
        >
          <div className="flex items-start gap-3 md:gap-4">
            <div className="p-2 md:p-3 rounded-xl bg-warning/20">
              <Settings className="w-5 h-5 md:w-6 md:h-6 text-warning" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-card-foreground">
                Configuração de Perfil
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activePreset ? (
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    Preset ativo: <span className="text-primary font-medium">{activePreset.name}</span>
                  </span>
                ) : (
                  "Cada nicho vira um preset exclusivo"
                )}
              </p>
            </div>
          </div>

          {/* Preset Actions */}
          <div className="flex items-center gap-2">
            {/* Preset Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="stealth" size="sm" className="gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Presets
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-card border-border">
                {presets.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                      Nenhum preset salvo ainda
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Salve suas configurações como preset para alternar rapidamente
                    </p>
                  </div>
                ) : (
                  <>
                    {presets.map((preset) => (
                      <div key={preset.id} className="flex items-center">
                        <DropdownMenuItem 
                          className="flex-1 cursor-pointer"
                          onClick={() => loadPreset(preset)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {activePresetId === preset.id && (
                              <Check className="w-3 h-3 text-success" />
                            )}
                            <span className={activePresetId === preset.id ? "text-success font-medium" : ""}>
                              {preset.name}
                            </span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-muted rounded mr-1">
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem onClick={() => duplicatePreset(preset)}>
                              <Copy className="w-3 h-3 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deletePreset(preset.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => setShowSavePresetDialog(true)}>
                  <Plus className="w-3 h-3 mr-2" />
                  Salvar como novo preset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Save Preset Dialog */}
        <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Salvar Preset</DialogTitle>
              <DialogDescription>
                Dê um nome para este preset. Você poderá alternar entre diferentes perfis rapidamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="preset-name" className="text-sm">
                  Nome do Preset
                </Label>
                <Input
                  id="preset-name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Ex: AlphaCode Fitness"
                  className="mt-2 bg-muted/50 border-border"
                  onKeyDown={(e) => e.key === "Enter" && saveAsNewPreset()}
                />
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">Este preset incluirá:</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {settings.profileName}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {settings.handle}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {settings.contentPillars.length} pilares
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {settings.voiceTones.length} tons
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="stealth" onClick={() => setShowSavePresetDialog(false)}>
                Cancelar
              </Button>
              <Button variant="tactical" onClick={saveAsNewPreset} disabled={!newPresetName.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tabbed Settings */}
        <Tabs defaultValue="identidade" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1">
            <TabsTrigger value="identidade" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary flex flex-col gap-0.5 py-2">
              <div className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                Identidade
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${identidadeProgress.percentage}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{identidadeProgress.filled}/{identidadeProgress.total}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="regras" className="text-xs data-[state=active]:bg-warning/20 data-[state=active]:text-warning flex flex-col gap-0.5 py-2">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Regras
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-warning transition-all duration-300" 
                    style={{ width: `${regrasProgress.percentage}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{regrasProgress.filled}/{regrasProgress.total}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="midia" className="text-xs data-[state=active]:bg-secondary/20 data-[state=active]:text-secondary flex flex-col gap-0.5 py-2">
              <div className="flex items-center">
                <Music className="w-3 h-3 mr-1" />
                Mídia
              </div>
              <div className="flex items-center gap-1">
                <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-secondary transition-all duration-300" 
                    style={{ width: `${midiaProgress.percentage}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{midiaProgress.filled}/{midiaProgress.total}</span>
              </div>
            </TabsTrigger>
            <TabsTrigger value="ia" className="text-xs data-[state=active]:bg-accent/20 data-[state=active]:text-accent-foreground flex flex-col gap-0.5 py-2">
              <div className="flex items-center">
                <Brain className="w-3 h-3 mr-1" />
                IA
              </div>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: IDENTIDADE */}
          <TabsContent value="identidade" className="space-y-4 md:space-y-6">
            {/* CONFIG 1 - Identidade do Perfil */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="command-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  Identidade do Perfil
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define a base de todas as decisões
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Nome do Perfil */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Nome do Perfil
                </Label>
                <Input
                  value={settings.profileName}
                  onChange={(e) => updateField("profileName", e.target.value)}
                  placeholder="Ex: AlphaCode Supremacy"
                  className="bg-muted/50 border-border"
                />
              </div>

              {/* Handle do Instagram */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                  <AtSign className="w-3 h-3" />
                  Handle do Instagram
                </Label>
                <Input
                  value={settings.handle}
                  onChange={(e) => updateField("handle", e.target.value)}
                  placeholder="@seu.handle"
                  className="bg-muted/50 border-border"
                />
              </div>

              {/* Tema Central */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Tema Central
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {[...CENTRAL_THEMES, ...settings.customThemes].map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => {
                        updateField("centralTheme", theme.value);
                        loadPresetPillars(theme.value);
                      }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-left ${
                        settings.centralTheme === theme.value
                          ? "bg-warning/20 border-warning text-warning"
                          : "border-border text-muted-foreground hover:border-warning/50 hover:text-card-foreground"
                      }`}
                    >
                      <span>{theme.icon}</span>
                      <span className="text-xs font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>
                {/* Add custom theme */}
                <div className="flex gap-2 mt-2">
                  <Input
                    value={customThemeInput}
                    onChange={(e) => setCustomThemeInput(e.target.value)}
                    placeholder="Adicionar tema personalizado"
                    className="bg-muted/50 border-border flex-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customThemeInput.trim()) {
                        const newTheme: CustomTheme = {
                          value: customThemeInput.toLowerCase().replace(/\s+/g, "_"),
                          label: customThemeInput.trim(),
                          icon: "⚡",
                        };
                        setSettings(prev => ({
                          ...prev,
                          customThemes: [...prev.customThemes, newTheme],
                        }));
                        setCustomThemeInput("");
                      }
                    }}
                  />
                  <Button
                    variant="stealth"
                    size="sm"
                    onClick={() => {
                      if (customThemeInput.trim()) {
                        const newTheme: CustomTheme = {
                          value: customThemeInput.toLowerCase().replace(/\s+/g, "_"),
                          label: customThemeInput.trim(),
                          icon: "⚡",
                        };
                        setSettings(prev => ({
                          ...prev,
                          customThemes: [...prev.customThemes, newTheme],
                        }));
                        setCustomThemeInput("");
                      }
                    }}
                    disabled={!customThemeInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  📌 Isso alimenta TODAS as decisões de conteúdo
                </p>
              </div>

              {/* CTAs - Múltiplos */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  Call-to-Actions (CTAs)
                </Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {settings.ctaList.map((cta, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-primary/20 text-primary border-primary/30 cursor-pointer hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 transition-colors"
                      onClick={() => {
                        setSettings(prev => ({
                          ...prev,
                          ctaList: prev.ctaList.filter((_, i) => i !== index),
                        }));
                      }}
                    >
                      {cta}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customCtaInput}
                    onChange={(e) => setCustomCtaInput(e.target.value)}
                    placeholder="Adicionar CTA (ex: Siga @handle)"
                    className="bg-muted/50 border-border flex-1 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customCtaInput.trim()) {
                        setSettings(prev => ({
                          ...prev,
                          ctaList: [...prev.ctaList, customCtaInput.trim()],
                        }));
                        setCustomCtaInput("");
                      }
                    }}
                  />
                  <Button
                    variant="stealth"
                    size="sm"
                    onClick={() => {
                      if (customCtaInput.trim()) {
                        setSettings(prev => ({
                          ...prev,
                          ctaList: [...prev.ctaList, customCtaInput.trim()],
                        }));
                        setCustomCtaInput("");
                      }
                    }}
                    disabled={!customCtaInput.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-2">
                    <Hash className="w-3 h-3" />
                    Hashtags Padrão
                  </Label>
                  <span className={`text-[10px] font-mono ${
                    (settings.hashtags.match(/#\w+/g) || []).length > 5 
                      ? "text-destructive" 
                      : "text-muted-foreground"
                  }`}>
                    {(settings.hashtags.match(/#\w+/g) || []).length}/5
                  </span>
                </div>
                <Textarea
                  value={settings.hashtags}
                  onChange={(e) => {
                    const hashtags = e.target.value.match(/#\w+/g) || [];
                    if (hashtags.length <= 5) {
                      updateField("hashtags", e.target.value);
                    }
                  }}
                  placeholder="#hashtag1 #hashtag2"
                  className="bg-muted/50 border-border resize-none text-xs"
                  rows={2}
                />
              </div>
            </div>
            </motion.div>

            {/* CONFIG 2 - Pilares de Conteúdo */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="command-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-success/20">
                <Layers className="w-4 h-4 text-success" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  Pilares de Conteúdo
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mudam de acordo com o Instagram/nicho
                </p>
              </div>
            </div>

            {/* Current Theme Badge */}
            <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">Tema ativo:</span>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {CENTRAL_THEMES.find(t => t.value === settings.centralTheme)?.icon}{" "}
                {CENTRAL_THEMES.find(t => t.value === settings.centralTheme)?.label || "Motivacional"}
              </Badge>
            </div>

            {/* Selected Pillars */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Pilares selecionados ({settings.contentPillars.length})
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {settings.contentPillars.map((pillar) => (
                  <Badge
                    key={pillar}
                    variant="secondary"
                    className="bg-success/20 text-success border-success/30 cursor-pointer hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 transition-colors"
                    onClick={() => togglePillar(pillar)}
                  >
                    {pillar}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
                {settings.contentPillars.length === 0 && (
                  <span className="text-xs text-muted-foreground italic">
                    Nenhum pilar selecionado
                  </span>
                )}
              </div>
            </div>

            {/* Suggested Pillars */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Sugestões para {CENTRAL_THEMES.find(t => t.value === settings.centralTheme)?.label || "este nicho"}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {getSuggestedPillars().map((pillar) => (
                  <button
                    key={pillar}
                    onClick={() => togglePillar(pillar)}
                    className={`px-2.5 py-1.5 text-xs rounded-md border transition-all ${
                      settings.contentPillars.includes(pillar)
                        ? "bg-success/20 border-success text-success"
                        : "border-border text-muted-foreground hover:border-success/50 hover:text-card-foreground"
                    }`}
                  >
                    {settings.contentPillars.includes(pillar) ? "✓" : "+"} {pillar}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Pillar */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Adicionar pilar personalizado
              </Label>
              <div className="flex gap-2">
                <Input
                  value={customPillar}
                  onChange={(e) => setCustomPillar(e.target.value)}
                  placeholder="Ex: Resiliência"
                  className="bg-muted/50 border-border flex-1"
                  onKeyDown={(e) => e.key === "Enter" && addCustomPillar()}
                />
                <Button
                  variant="stealth"
                  size="sm"
                  onClick={addCustomPillar}
                  disabled={!customPillar.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* CONFIG 3 - Tom de Voz */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="command-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Volume2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  Tom de Voz
                </h3>
                <p className="text-xs text-muted-foreground">
                  Aqui é onde a maioria faz merda
                </p>
              </div>
            </div>

            {/* Voice Tone Selection */}
            <div className="space-y-2 mb-4">
              {VOICE_TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleVoiceTone(option.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                    settings.voiceTones.includes(option.value)
                      ? "bg-primary/20 border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div>
                    <span className={`text-sm font-medium ${
                      settings.voiceTones.includes(option.value)
                        ? "text-primary"
                        : "text-card-foreground"
                    }`}>
                      {option.label}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  {settings.voiceTones.includes(option.value) && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom Voice Tones */}
            {settings.customVoiceTones.length > 0 && (
              <div className="mb-4">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Tons personalizados
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {settings.customVoiceTones.map((tone, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-primary/20 text-primary border-primary/30 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                      onClick={() => {
                        setSettings(prev => ({
                          ...prev,
                          customVoiceTones: prev.customVoiceTones.filter((_, i) => i !== index),
                        }));
                      }}
                    >
                      {tone}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Voice Tone */}
            <div className="flex gap-2 mb-4">
              <Input
                value={customVoiceToneInput}
                onChange={(e) => setCustomVoiceToneInput(e.target.value)}
                placeholder="Adicionar tom personalizado"
                className="bg-muted/50 border-border flex-1 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customVoiceToneInput.trim()) {
                    setSettings(prev => ({
                      ...prev,
                      customVoiceTones: [...prev.customVoiceTones, customVoiceToneInput.trim()],
                    }));
                    setCustomVoiceToneInput("");
                  }
                }}
              />
              <Button
                variant="stealth"
                size="sm"
                onClick={() => {
                  if (customVoiceToneInput.trim()) {
                    setSettings(prev => ({
                      ...prev,
                      customVoiceTones: [...prev.customVoiceTones, customVoiceToneInput.trim()],
                    }));
                    setCustomVoiceToneInput("");
                  }
                }}
                disabled={!customVoiceToneInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Example combinations */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border mb-4">
              <p className="text-xs text-muted-foreground mb-2">📌 Exemplos de combinação:</p>
              <div className="space-y-1 text-xs">
                <p><span className="text-warning">AlphaCode Supremacy</span> → Direto + Estoico + Provocativo</p>
                <p><span className="text-warning">Fé</span> → Espiritual Simples + Reflexivo</p>
                <p><span className="text-warning">Negócios</span> → Autoridade + Direto + Minimalista</p>
              </div>
            </div>

            {/* Voice Style Tags */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                <Mic className="w-3 h-3" />
                Tags de Estilo (Legado)
              </Label>
              <Input
                value={settings.voiceStyle}
                onChange={(e) => updateField("voiceStyle", e.target.value)}
                placeholder="ex: masculino, direto, inspirador"
                className="bg-muted/50 border-border"
              />
            </div>
            </motion.div>
          </TabsContent>

          {/* TAB 2: REGRAS (CONFIG 4-6) */}
          <TabsContent value="regras" className="space-y-4 md:space-y-6">
            {/* CONFIG 4 - Regras Especiais de Horário */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="command-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-warning/20">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  Regras Especiais de Horário
                </h3>
                <p className="text-xs text-muted-foreground">
                  Linguagem permitida/proibida por horário
                </p>
              </div>
            </div>

            {/* Special Hours Selection */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Horários com regra especial
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {(settings.timeSlots || DEFAULT_TIME_SLOTS).map((slot) => {
                  const isSpecial = settings.specialHours.includes(slot.value);
                  return (
                    <button
                      key={slot.value}
                      onClick={() => {
                        setSettings(prev => ({
                          ...prev,
                          specialHours: isSpecial
                            ? prev.specialHours.filter(h => h !== slot.value)
                            : [...prev.specialHours, slot.value],
                          postReferences: {
                            ...prev.postReferences,
                            [slot.value]: {
                              ...prev.postReferences?.[slot.value],
                              isSpecialHour: !isSpecial,
                            },
                          },
                        }));
                      }}
                      className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                        isSpecial
                          ? "bg-warning/20 border-warning text-warning"
                          : "border-border text-muted-foreground hover:border-warning/50"
                      }`}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      {slot.value}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Rules per Special Hour */}
            {settings.specialHours.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">
                  Configurar linguagem por horário especial
                </Label>
                {settings.specialHours.map((hour) => {
                  const ref = settings.postReferences?.[hour] || { allowedLanguage: "", prohibitedLanguage: "" };
                  return (
                    <div key={hour} className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-mono text-warning">{hour}</span>
                        <span className="text-xs text-muted-foreground">— Regra especial</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <Label className="text-[10px] text-success mb-1 block">✓ Linguagem permitida</Label>
                          <Input
                            value={ref.allowedLanguage || ""}
                            onChange={(e) => {
                              const currentRef = settings.postReferences?.[hour] || { example: "", tone: "", notes: "", allowedLanguage: "", prohibitedLanguage: "", isSpecialHour: true };
                              setSettings(prev => ({
                                ...prev,
                                postReferences: {
                                  ...prev.postReferences,
                                  [hour]: { ...currentRef, allowedLanguage: e.target.value },
                                },
                              }));
                            }}
                            placeholder="Ex: oração simples, gratidão"
                            className="bg-background border-border text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-destructive mb-1 block">✗ Linguagem proibida</Label>
                          <Input
                            value={ref.prohibitedLanguage || ""}
                            onChange={(e) => {
                              const currentRef = settings.postReferences?.[hour] || { example: "", tone: "", notes: "", allowedLanguage: "", prohibitedLanguage: "", isSpecialHour: true };
                              setSettings(prev => ({
                                ...prev,
                                postReferences: {
                                  ...prev.postReferences,
                                  [hour]: { ...currentRef, prohibitedLanguage: e.target.value },
                                },
                              }));
                            }}
                            placeholder="Ex: guerra, batalha, confronto"
                            className="bg-background border-border text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* CONFIG 7 - Legendas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="command-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Captions className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  Legendas
                </h3>
                <p className="text-xs text-muted-foreground">
                  Variação por perfil
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Variation Count */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Quantidade de variações
                </Label>
                <div className="flex gap-2">
                  {[3, 5, 6].map((count) => (
                    <button
                      key={count}
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        captionConfig: { ...prev.captionConfig, variationCount: count },
                      }))}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        settings.captionConfig.variationCount === count
                          ? "bg-secondary/20 border-secondary text-secondary"
                          : "border-border text-muted-foreground hover:border-secondary/50"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption Length */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Tamanho permitido
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "curta", label: "Só curtas" },
                    { value: "media", label: "Só médias" },
                    { value: "longa", label: "Só longas" },
                    { value: "mista", label: "Mista (2+2+2)" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        captionConfig: { ...prev.captionConfig, maxLength: option.value as "curta" | "media" | "longa" | "mista" },
                      }))}
                      className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                        settings.captionConfig.maxLength === option.value
                          ? "bg-secondary/20 border-secondary text-secondary"
                          : "border-border text-muted-foreground hover:border-secondary/50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed Hashtags Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div>
                  <p className="text-xs font-medium text-card-foreground">Usar hashtags fixas nas legendas</p>
                  <p className="text-[10px] text-muted-foreground">Inclui as hashtags configuradas em todas as legendas</p>
                </div>
                <Switch
                  checked={settings.captionConfig.useFixedHashtags}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    captionConfig: { ...prev.captionConfig, useFixedHashtags: checked },
                  }))}
                />
              </div>
            </div>
            </motion.div>

            {/* CONFIG 5 - Horários de Publicação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="command-card"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-2.5 rounded-lg bg-secondary/20">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base font-semibold text-card-foreground mb-1">
                    Horários de Publicação
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                    Defina os horários que você posta conteúdo
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                    {(settings.timeSlots || DEFAULT_TIME_SLOTS).map((slot, index) => (
                      <div 
                        key={slot.value} 
                        className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-muted/50 border border-border group"
                      >
                        <Clock className="w-3 h-3 text-secondary" />
                        <span className="text-xs md:text-sm font-mono text-card-foreground">{slot.value}</span>
                        {(settings.timeSlots || DEFAULT_TIME_SLOTS).length > 1 && (
                          <button
                            onClick={() => {
                              setSettings(prev => {
                                const newSlots = [...(prev.timeSlots || DEFAULT_TIME_SLOTS)];
                                newSlots.splice(index, 1);
                                const newFilter = prev.biblicalReferencesFilter.filter(v => v !== slot.value);
                                return { 
                                  ...prev, 
                                  timeSlots: newSlots,
                                  biblicalReferencesFilter: newFilter
                                };
                              });
                            }}
                            className="ml-1 p-0.5 rounded opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-destructive/20 transition-all"
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      id="new-time-slot"
                      className="bg-muted/50 border-border w-28 md:w-32 text-sm"
                    />
                    <Button
                      variant="stealth"
                      size="sm"
                      onClick={() => {
                        const input = document.getElementById("new-time-slot") as HTMLInputElement;
                        const value = input.value;
                        if (value) {
                          const exists = (settings.timeSlots || DEFAULT_TIME_SLOTS).some(s => s.value === value);
                          if (!exists) {
                            const defaultTone = getDefaultToneForTime(value);
                            setSettings(prev => ({
                              ...prev,
                              timeSlots: [
                                ...(prev.timeSlots || DEFAULT_TIME_SLOTS),
                                { value, description: defaultTone }
                              ].sort((a, b) => a.value.localeCompare(b.value)),
                              postReferences: {
                                ...prev.postReferences,
                                [value]: { example: "", tone: defaultTone, notes: "" }
                              }
                            }));
                            input.value = "";
                          }
                        }
                      }}
                      className="text-xs md:text-sm"
                    >
                      <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Referências de Posts por Horário */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="command-card"
            >
              <PostReferencesSection 
                settings={settings}
                setSettings={setSettings}
              />
            </motion.div>

            {/* CONFIG 6 - Referências Bíblicas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="command-card"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-2.5 rounded-lg bg-warning/20">
                  <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 md:mb-4">
                    <div>
                      <h3 className="text-sm md:text-base font-semibold text-card-foreground mb-1">
                        Referências Bíblicas
                      </h3>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        Versículos para usar nos textos (máx. 2)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="bible-toggle" className="text-xs md:text-sm text-muted-foreground">
                        {settings.biblicalReferencesEnabled ? "Ativado" : "Desativado"}
                      </Label>
                      <Switch
                        id="bible-toggle"
                        checked={settings.biblicalReferencesEnabled}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, biblicalReferencesEnabled: checked }))
                        }
                      />
                    </div>
                  </div>
                  
                  {settings.biblicalReferencesEnabled && (
                    <>
                      <div className="mb-3 md:mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs md:text-sm text-muted-foreground">
                            Aplicar versículos em:
                          </Label>
                          <button
                            onClick={() => {
                              const timeSlots = settings.timeSlots || DEFAULT_TIME_SLOTS;
                              const allSelected = settings.biblicalReferencesFilter.length === timeSlots.length;
                              setSettings(prev => ({
                                ...prev,
                                biblicalReferencesFilter: allSelected ? [] : timeSlots.map(o => o.value)
                              }));
                            }}
                            className="text-[10px] md:text-xs text-primary hover:underline"
                          >
                            {settings.biblicalReferencesFilter.length === (settings.timeSlots || DEFAULT_TIME_SLOTS).length ? "Desmarcar" : "Selecionar todos"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                          {(settings.timeSlots || DEFAULT_TIME_SLOTS).map((option) => {
                            const isSelected = settings.biblicalReferencesFilter.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                onClick={() => {
                                  setSettings(prev => ({
                                    ...prev,
                                    biblicalReferencesFilter: isSelected
                                      ? prev.biblicalReferencesFilter.filter(v => v !== option.value)
                                      : [...prev.biblicalReferencesFilter, option.value]
                                  }));
                                }}
                                className={`px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm rounded-lg border transition-colors ${
                                  isSelected
                                    ? "bg-warning/20 border-warning text-warning"
                                    : "border-border text-muted-foreground hover:border-warning/50"
                                }`}
                              >
                                {option.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <Textarea
                        value={settings.biblicalReferences}
                        onChange={(e) => updateField("biblicalReferences", e.target.value)}
                        placeholder="Ex: Salmo 37:5, Provérbios 16:3"
                        className="bg-muted/50 border-border resize-none mb-3 md:mb-4 text-xs md:text-sm"
                        rows={2}
                      />
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {BIBLE_SUGGESTIONS.slice(0, 4).map((ref) => (
                          <button
                            key={ref}
                            onClick={() => {
                              const current = settings.biblicalReferences;
                              if (!current.includes(ref)) {
                                updateField("biblicalReferences", current ? `${current}, ${ref}` : ref);
                              }
                            }}
                            className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-sm rounded-full border border-border text-muted-foreground hover:border-warning hover:text-warning transition-colors"
                          >
                            + {ref}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* TAB 3: MÍDIA (CONFIG 7-8) */}
          <TabsContent value="midia" className="space-y-4 md:space-y-6">
            {/* CONFIG 7 - Legendas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="command-card"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-secondary/20">
                  <Captions className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-card-foreground">
                    Legendas
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Variação por perfil
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Variation Count */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Quantidade de variações
                  </Label>
                  <div className="flex gap-2">
                    {[3, 5, 6].map((count) => (
                      <button
                        key={count}
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          captionConfig: { ...prev.captionConfig, variationCount: count },
                        }))}
                        className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                          settings.captionConfig.variationCount === count
                            ? "bg-secondary/20 border-secondary text-secondary"
                            : "border-border text-muted-foreground hover:border-secondary/50"
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption Length */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Tamanho permitido
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "curta", label: "Só curtas" },
                      { value: "media", label: "Só médias" },
                      { value: "longa", label: "Só longas" },
                      { value: "mista", label: "Mista (2+2+2)" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          captionConfig: { ...prev.captionConfig, maxLength: option.value as "curta" | "media" | "longa" | "mista" },
                        }))}
                        className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                          settings.captionConfig.maxLength === option.value
                            ? "bg-secondary/20 border-secondary text-secondary"
                            : "border-border text-muted-foreground hover:border-secondary/50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fixed Hashtags Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div>
                    <p className="text-xs font-medium text-card-foreground">Usar hashtags fixas nas legendas</p>
                    <p className="text-[10px] text-muted-foreground">Inclui as hashtags configuradas em todas as legendas</p>
                  </div>
                  <Switch
                    checked={settings.captionConfig.useFixedHashtags}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      captionConfig: { ...prev.captionConfig, useFixedHashtags: checked },
                    }))}
                  />
                </div>
              </div>
            </motion.div>

            {/* CONFIG 8 - Base Musical */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="command-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-success/20">
                <Disc3 className="w-4 h-4 text-success" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  Base Musical
                </h3>
                <p className="text-xs text-muted-foreground">
                  Preset por nicho, não improviso
                </p>
              </div>
            </div>

            {/* Current Theme Preset */}
            <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Preset sugerido para {CENTRAL_THEMES.find(t => t.value === settings.centralTheme)?.label || "tema"}:</span>
                <button
                  onClick={() => {
                    const presetStyles = MUSIC_PRESETS[settings.centralTheme] || MUSIC_PRESETS.motivacional;
                    setSettings(prev => ({
                      ...prev,
                      musicPreset: { styles: presetStyles },
                    }));
                  }}
                  className="text-[10px] text-primary hover:underline"
                >
                  Aplicar preset
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(MUSIC_PRESETS[settings.centralTheme] || MUSIC_PRESETS.motivacional).map((style) => (
                  <Badge key={style} variant="outline" className="text-[10px]">
                    {style}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Selected Styles */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Estilos selecionados ({settings.musicPreset.styles.length})
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {settings.musicPreset.styles.map((style, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-success/20 text-success border-success/30 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        musicPreset: {
                          styles: prev.musicPreset.styles.filter((_, i) => i !== index),
                        },
                      }));
                    }}
                  >
                    {style}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* All Available Styles */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Adicionar estilos
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["Rap", "Hip-hop", "Trap", "EDM", "Electronic", "Synth-pop", "Indie", "Lo-fi", "Ambient", "Instrumental", "Acoustic", "R&B", "Reggae rock", "Cinematic", "Minimal", "Gospel"].map((style) => (
                  <button
                    key={style}
                    onClick={() => {
                      if (!settings.musicPreset.styles.includes(style)) {
                        setSettings(prev => ({
                          ...prev,
                          musicPreset: { styles: [...prev.musicPreset.styles, style] },
                        }));
                      }
                    }}
                    className={`px-2 py-1 text-xs rounded-md border transition-all ${
                      settings.musicPreset.styles.includes(style)
                        ? "bg-success/20 border-success text-success"
                        : "border-border text-muted-foreground hover:border-success/50"
                    }`}
                  >
                    {settings.musicPreset.styles.includes(style) ? "✓" : "+"} {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Custom Music Style */}
            <div className="flex gap-2">
              <Input
                value={customMusicStyleInput}
                onChange={(e) => setCustomMusicStyleInput(e.target.value)}
                placeholder="Adicionar estilo personalizado"
                className="bg-muted/50 border-border flex-1 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customMusicStyleInput.trim()) {
                    setSettings(prev => ({
                      ...prev,
                      musicPreset: { styles: [...prev.musicPreset.styles, customMusicStyleInput.trim()] },
                    }));
                    setCustomMusicStyleInput("");
                  }
                }}
              />
              <Button
                variant="stealth"
                size="sm"
                onClick={() => {
                  if (customMusicStyleInput.trim()) {
                    setSettings(prev => ({
                      ...prev,
                      musicPreset: { styles: [...prev.musicPreset.styles, customMusicStyleInput.trim()] },
                    }));
                    setCustomMusicStyleInput("");
                  }
                }}
                disabled={!customMusicStyleInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

              {/* Rules */}
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">📌 Regras globais:</p>
                <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                  <li>• Não repetir música no mesmo carrossel</li>
                  <li>• Não sair da base definida</li>
                  <li>• 6 músicas diferentes por carrossel</li>
                </ul>
              </div>
            </motion.div>

            {/* Músicas Favoritas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="command-card"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-2.5 rounded-lg bg-success/20">
                  <Music className="w-4 h-4 md:w-5 md:h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base font-semibold text-card-foreground mb-1">
                    Músicas Favoritas
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                    Base musical para sugestões nas legendas
                  </p>
                  <Textarea
                    value={settings.favoriteMusics}
                    onChange={(e) => updateField("favoriteMusics", e.target.value)}
                    placeholder="Ex: Money Trees - Kendrick Lamar, Midnight City - M83"
                    className="bg-muted/50 border-border resize-none mb-3 md:mb-4 text-xs md:text-sm"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {MUSIC_SUGGESTIONS.slice(0, 4).map((music) => (
                      <button
                        key={music}
                        onClick={() => {
                          const current = settings.favoriteMusics;
                          if (!current.includes(music)) {
                            updateField("favoriteMusics", current ? `${current}, ${music}` : music);
                          }
                        }}
                        className="px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-sm rounded-full border border-border text-muted-foreground hover:border-success hover:text-success transition-colors"
                      >
                        + {music.split(" - ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* TAB 4: IA */}
          <TabsContent value="ia" className="space-y-4 md:space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-4">
                <h2 className="text-base md:text-lg font-semibold text-card-foreground mb-1">
                  Configurações de IA
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Escolha o provedor de inteligência artificial para análise de imagens
                </p>
              </div>
              <AIProviderSettings />
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 md:mt-8"
        >
          <Button
            variant="tactical"
            size="lg"
            onClick={handleSave}
            className="w-full text-sm md:text-base"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Salvo!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                {activePreset ? `Atualizar "${activePreset.name}"` : "Salvar Configurações"}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </CommandLayout>
  );
};

export default BrandSettings;
