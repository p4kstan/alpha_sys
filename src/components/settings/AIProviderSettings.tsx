import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Brain, 
  Key, 
  Check, 
  Eye, 
  EyeOff,
  AlertTriangle,
  Sparkles,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export interface AIProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  models: string[];
  requiresApiKey: boolean;
  supportsVision: boolean;
}

export interface AIProviderConfig {
  selectedProvider: string;
  selectedModel: string;
  apiKey: string;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: "lovable",
    name: "Lovable AI",
    icon: "💜",
    description: "IA integrada - sem necessidade de API key",
    models: ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "google/gemini-3-flash-preview"],
    requiresApiKey: false,
    supportsVision: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "🤖",
    description: "GPT-4 Vision para análise de imagens",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    requiresApiKey: true,
    supportsVision: true,
  },
  {
    id: "google",
    name: "Google Gemini",
    icon: "✨",
    description: "Gemini Pro Vision para análise avançada",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
    requiresApiKey: true,
    supportsVision: true,
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    icon: "🧠",
    description: "Claude 3 com capacidade de visão",
    models: ["claude-3-5-sonnet-latest", "claude-3-haiku-20240307"],
    requiresApiKey: true,
    supportsVision: true,
  },
];

const STORAGE_KEY = "alphacode-ai-provider-config";

const AIProviderSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<AIProviderConfig>({
    selectedProvider: "lovable",
    selectedModel: "google/gemini-2.5-flash",
    apiKey: "",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
      } catch (e) {
        console.error("Error loading AI config:", e);
      }
    }
  }, []);

  // Save config when changed
  const saveConfig = (newConfig: AIProviderConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  };

  const selectedProviderData = AI_PROVIDERS.find(p => p.id === config.selectedProvider);

  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      saveConfig({
        ...config,
        selectedProvider: providerId,
        selectedModel: provider.models[0],
        apiKey: providerId === "lovable" ? "" : config.apiKey,
      });
      setTestResult(null);
    }
  };

  const handleModelChange = (model: string) => {
    saveConfig({ ...config, selectedModel: model });
  };

  const handleApiKeyChange = (apiKey: string) => {
    saveConfig({ ...config, apiKey });
    setTestResult(null);
  };

  const testConnection = async () => {
    if (selectedProviderData?.requiresApiKey && !config.apiKey) {
      toast({
        title: "API Key necessária",
        description: "Por favor, insira sua API key para testar a conexão.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          testConnection: true,
          provider: config.selectedProvider,
          model: config.selectedModel,
          apiKey: config.apiKey,
        }),
      });

      if (response.ok) {
        setTestResult("success");
        toast({
          title: "Conexão bem-sucedida!",
          description: `${selectedProviderData?.name} está configurado corretamente.`,
        });
      } else {
        const error = await response.json();
        setTestResult("error");
        toast({
          title: "Falha na conexão",
          description: error.error || "Verifique sua API key e tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setTestResult("error");
      toast({
        title: "Erro de conexão",
        description: "Não foi possível testar a conexão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="command-card"
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div className="p-2 md:p-2.5 rounded-lg bg-primary/20">
          <Brain className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-base font-semibold text-card-foreground mb-1">
            Provedor de IA para Análise
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-4">
            Escolha qual IA será usada para analisar suas imagens
          </p>

          {/* Provider Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-4">
            {AI_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border transition-all text-left
                  ${config.selectedProvider === provider.id
                    ? "bg-primary/10 border-primary"
                    : "border-border hover:border-primary/50"
                  }
                `}
              >
                <span className="text-xl">{provider.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-card-foreground">
                      {provider.name}
                    </span>
                    {config.selectedProvider === provider.id && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {provider.description}
                  </p>
                  {!provider.requiresApiKey && (
                    <Badge variant="outline" className="mt-1.5 text-[9px] bg-success/10 text-success border-success/30">
                      <Zap className="w-2.5 h-2.5 mr-1" />
                      Sem API Key
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Model Selection */}
          {selectedProviderData && (
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                Modelo
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedProviderData.models.map((model) => (
                  <button
                    key={model}
                    onClick={() => handleModelChange(model)}
                    className={`
                      px-2.5 py-1.5 text-xs rounded-md border transition-all
                      ${config.selectedModel === model
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                      }
                    `}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Key Input */}
          {selectedProviderData?.requiresApiKey && (
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-2">
                <Key className="w-3.5 h-3.5" />
                API Key - {selectedProviderData.name}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={config.apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder={`Insira sua ${selectedProviderData.name} API Key`}
                    className="bg-muted/50 border-border pr-10 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Security Notice */}
              <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-warning/10 border border-warning/20">
                <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-warning">
                  Sua API key é armazenada localmente no navegador e enviada de forma segura para o servidor.
                </p>
              </div>
            </div>
          )}

          {/* Test Connection Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="stealth"
              size="sm"
              onClick={testConnection}
              disabled={isTesting || (selectedProviderData?.requiresApiKey && !config.apiKey)}
              className="text-xs"
            >
              {isTesting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                  Testando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>
            
            {testResult === "success" && (
              <Badge className="bg-success/20 text-success border-success/30">
                <Check className="w-3 h-3 mr-1" />
                Conectado
              </Badge>
            )}
            
            {testResult === "error" && (
              <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Erro
              </Badge>
            )}
          </div>

          {/* Current Config Summary */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Configuração atual:</p>
            <div className="flex items-center gap-2">
              <span className="text-sm">{selectedProviderData?.icon}</span>
              <span className="text-sm font-medium text-card-foreground">
                {selectedProviderData?.name}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-mono text-muted-foreground">
                {config.selectedModel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AIProviderSettings;
export { AI_PROVIDERS, STORAGE_KEY as AI_CONFIG_STORAGE_KEY };
