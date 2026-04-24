import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Upload,
  Zap,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
} from "lucide-react";
import CommandLayout from "@/components/layout/CommandLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeSlot {
  value: string;
  description: string;
}

interface SlotData {
  id?: string;
  images: File[];
  imageUrls: string[];
  status: "empty" | "pending" | "processing" | "generated" | "failed";
  generatedContent?: any;
  errorMessage?: string;
}

const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { value: "06:00", description: "Manhã" },
  { value: "09:00", description: "Foco" },
  { value: "12:00", description: "Reflexão" },
  { value: "18:00", description: "Conquista" },
  { value: "21:00", description: "Noite" },
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const statusIcon = (status: SlotData["status"]) => {
  switch (status) {
    case "processing":
      return <Loader2 className="w-3 h-3 animate-spin text-warning" />;
    case "generated":
      return <CheckCircle2 className="w-3 h-3 text-success" />;
    case "failed":
      return <AlertTriangle className="w-3 h-3 text-destructive" />;
    default:
      return null;
  }
};

const Agendamento = () => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS);
  const [imagesPerSlot, setImagesPerSlot] = useState(5);
  const [slotsData, setSlotsData] = useState<Record<string, SlotData>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewSlot, setPreviewSlot] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load time slots from localStorage (same as BrandSettings)
  useEffect(() => {
    const saved = localStorage.getItem("brandSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.timeSlots?.length > 0) {
          setTimeSlots(parsed.timeSlots);
        }
      } catch {}
    }
    toast({
      title: "Agendamento em Massa",
      description: "Faça upload das fotos e processe tudo com um clique.",
    });
  }, []);

  // Get days for current view
  const getDays = useCallback((): Date[] => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [viewMode, currentDate]);

  const days = getDays();

  const getSlotKey = (date: Date, time: string) =>
    `${format(date, "yyyy-MM-dd")}_${time}`;

  const getSlot = (date: Date, time: string): SlotData => {
    const key = getSlotKey(date, time);
    return slotsData[key] || { images: [], imageUrls: [], status: "empty" };
  };

  const handleFileSelect = (date: Date, time: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const key = getSlotKey(date, time);
    const current = getSlot(date, time);
    const newFiles = Array.from(files).slice(0, imagesPerSlot - current.images.length);
    const newUrls = newFiles.map((f) => URL.createObjectURL(f));

    setSlotsData((prev) => ({
      ...prev,
      [key]: {
        ...current,
        images: [...current.images, ...newFiles],
        imageUrls: [...current.imageUrls, ...newUrls],
        status: "pending",
      },
    }));
  };

  const removeImage = (date: Date, time: string, index: number) => {
    const key = getSlotKey(date, time);
    const current = getSlot(date, time);
    const newImages = current.images.filter((_, i) => i !== index);
    const newUrls = current.imageUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(current.imageUrls[index]);

    setSlotsData((prev) => ({
      ...prev,
      [key]: {
        ...current,
        images: newImages,
        imageUrls: newUrls,
        status: newImages.length > 0 ? "pending" : "empty",
      },
    }));
  };

  const navigate = (direction: "prev" | "next") => {
    if (viewMode === "week") {
      setCurrentDate((d) => (direction === "next" ? addWeeks(d, 1) : subWeeks(d, 1)));
    } else {
      setCurrentDate((d) => (direction === "next" ? addMonths(d, 1) : subMonths(d, 1)));
    }
  };

  // Count slots with content
  const filledSlots = Object.values(slotsData).filter(
    (s) => s.images.length > 0
  ).length;

  const processAll = async () => {
    const pendingEntries = Object.entries(slotsData).filter(
      ([, s]) => s.images.length > 0 && (s.status === "pending" || s.status === "failed")
    );

    if (pendingEntries.length === 0) {
      toast({ title: "Nenhum conteúdo para processar", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // Load brand settings
      const saved = localStorage.getItem("brandSettings");
      if (!saved) {
        toast({ title: "Configure sua marca primeiro", variant: "destructive" });
        setIsProcessing(false);
        return;
      }
      const brandSettings = JSON.parse(saved);

      // Upload images and create slots
      const slotIds: string[] = [];

      for (const [key, slot] of pendingEntries) {
        const [dateStr, time] = key.split("_");

        // Update status to processing
        setSlotsData((prev) => ({
          ...prev,
          [key]: { ...prev[key], status: "processing" },
        }));

        // Upload images to storage
        const uploadedUrls: string[] = [];
        for (let i = 0; i < slot.images.length; i++) {
          const file = slot.images[i];
          const filePath = `${dateStr}/${time}/${Date.now()}_${i}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("scheduled-content")
            .upload(filePath, file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from("scheduled-content")
            .getPublicUrl(filePath);
          uploadedUrls.push(urlData.publicUrl);
        }

        // Upsert slot in database
        const { data: slotRow, error: dbError } = await supabase
          .from("scheduled_slots")
          .upsert(
            {
              user_id: (await supabase.auth.getUser()).data.user?.id,
              slot_date: dateStr,
              slot_time: time,
              images_count: uploadedUrls.length,
              image_urls: uploadedUrls,
              status: "pending",
            } as any,
            { onConflict: "user_id,slot_date,slot_time" }
          )
          .select()
          .single();

        if (dbError) {
          console.error("DB error:", dbError);
          setSlotsData((prev) => ({
            ...prev,
            [key]: { ...prev[key], status: "failed", errorMessage: dbError.message },
          }));
          continue;
        }

        slotIds.push((slotRow as any).id);
        setSlotsData((prev) => ({
          ...prev,
          [key]: { ...prev[key], id: (slotRow as any).id },
        }));
      }

      if (slotIds.length === 0) {
        toast({ title: "Nenhum slot criado", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      // Call batch process function
      const { data, error } = await supabase.functions.invoke("batch-process", {
        body: { slotIds, brandSettings },
      });

      if (error) throw error;

      // Update statuses based on results
      const results = data?.results || [];
      for (const result of results) {
        const entry = Object.entries(slotsData).find(
          ([, s]) => s.id === result.slotId
        );
        if (entry) {
          setSlotsData((prev) => ({
            ...prev,
            [entry[0]]: {
              ...prev[entry[0]],
              status: result.success ? "generated" : "failed",
              errorMessage: result.error,
            },
          }));
        }
      }

      // Reload generated content
      const { data: updatedSlots } = await supabase
        .from("scheduled_slots")
        .select("*")
        .in("id", slotIds);

      if (updatedSlots) {
        for (const us of updatedSlots) {
          const key = `${us.slot_date}_${us.slot_time}`;
          setSlotsData((prev) => ({
            ...prev,
            [key]: {
              ...prev[key],
              status: (us as any).status,
              generatedContent: (us as any).generated_content,
              errorMessage: (us as any).error_message,
            },
          }));
        }
      }

      const successCount = results.filter((r: any) => r.success).length;
      toast({
        title: `${successCount}/${results.length} slots processados`,
        description: "Conteúdo gerado com sucesso!",
      });
    } catch (err) {
      console.error("Process error:", err);
      toast({
        title: "Erro no processamento",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <CommandLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-card-foreground flex items-center gap-3">
                <CalendarDays className="w-7 h-7 text-primary" />
                Agendamento em Massa
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Organize e processe todo o conteúdo da semana/mês com um clique
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">
                  Fotos/slot:
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={imagesPerSlot}
                  onChange={(e) => setImagesPerSlot(Number(e.target.value) || 1)}
                  className="w-16 h-8 text-sm bg-muted/50"
                />
              </div>

              <Badge variant="outline" className="border-primary/30 text-primary">
                {filledSlots} slots preenchidos
              </Badge>
            </div>
          </div>
        </motion.section>

        {/* Controls */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("prev")}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-card-foreground min-w-[180px] text-center capitalize">
              {viewMode === "week"
                ? `${format(days[0], "dd MMM", { locale: ptBR })} — ${format(
                    days[days.length - 1],
                    "dd MMM yyyy",
                    { locale: ptBR }
                  )}`
                : format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("next")}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "week" | "month")}
            >
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs px-3">
                  Semana
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3">
                  Mês
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="command"
              onClick={processAll}
              disabled={isProcessing || filledSlots === 0}
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isProcessing ? "Processando..." : "Processar Tudo"}
            </Button>
          </div>
        </motion.section>

        {/* Grid */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {viewMode === "week" ? (
            // Weekly view - full grid
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Header row */}
                <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
                  <div className="p-2" />
                  {days.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={`p-2 text-center rounded-t-lg ${
                        isToday(day) ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
                      }`}
                    >
                      <div className="text-[10px] uppercase text-muted-foreground">
                        {DAY_NAMES[day.getDay()]}
                      </div>
                      <div
                        className={`text-sm font-mono font-semibold ${
                          isToday(day) ? "text-primary" : "text-card-foreground"
                        }`}
                      >
                        {format(day, "dd")}
                      </div>
                    </div>
                  ))}

                  {/* Time slot rows */}
                  {timeSlots.map((ts) => (
                    <>
                      <div
                        key={`label-${ts.value}`}
                        className="flex items-center justify-center p-2"
                      >
                        <div className="text-center">
                          <div className="text-xs font-mono text-primary">
                            {ts.value}
                          </div>
                          <div className="text-[9px] text-muted-foreground">
                            {ts.description}
                          </div>
                        </div>
                      </div>
                      {days.map((day) => {
                        const slot = getSlot(day, ts.value);
                        const key = getSlotKey(day, ts.value);
                        return (
                          <SlotCell
                            key={key}
                            slot={slot}
                            slotKey={key}
                            maxImages={imagesPerSlot}
                            onFileSelect={(files) =>
                              handleFileSelect(day, ts.value, files)
                            }
                            onRemoveImage={(i) =>
                              removeImage(day, ts.value, i)
                            }
                            onPreview={() => setPreviewSlot(key)}
                            fileInputRef={(el) => {
                              fileInputRefs.current[key] = el;
                            }}
                          />
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Monthly view - compact calendar
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] uppercase text-muted-foreground py-1"
                  >
                    {d}
                  </div>
                ))}
                {/* Pad start */}
                {Array.from({
                  length: (days[0].getDay() + 6) % 7,
                }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {days.map((day) => {
                  const daySlots = timeSlots.filter(
                    (ts) => getSlot(day, ts.value).images.length > 0
                  );
                  const allGenerated = daySlots.length > 0 && daySlots.every(
                    (ts) => getSlot(day, ts.value).status === "generated"
                  );
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-1.5 rounded-lg border min-h-[70px] ${
                        isToday(day)
                          ? "border-primary/50 bg-primary/5"
                          : !isSameMonth(day, currentDate)
                          ? "opacity-40 border-border/50"
                          : "border-border hover:border-primary/30"
                      } transition-colors`}
                    >
                      <div
                        className={`text-xs font-mono mb-1 ${
                          isToday(day)
                            ? "text-primary font-bold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(day, "dd")}
                      </div>
                      <div className="flex flex-wrap gap-0.5">
                        {timeSlots.map((ts) => {
                          const slot = getSlot(day, ts.value);
                          if (slot.images.length === 0) return null;
                          return (
                            <div
                              key={ts.value}
                              className="flex items-center gap-0.5"
                              title={`${ts.value} - ${slot.images.length} fotos`}
                            >
                              <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                              {statusIcon(slot.status)}
                            </div>
                          );
                        })}
                      </div>
                      {daySlots.length > 0 && (
                        <div className="text-[9px] text-muted-foreground mt-0.5">
                          {daySlots.length}/{timeSlots.length} slots
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expanded day slots for month view */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {days.map((day) => (
                  <MonthDayCard
                    key={day.toISOString()}
                    day={day}
                    timeSlots={timeSlots}
                    maxImages={imagesPerSlot}
                    getSlot={(ts) => getSlot(day, ts)}
                    onFileSelect={(ts, files) => handleFileSelect(day, ts, files)}
                    onRemoveImage={(ts, i) => removeImage(day, ts, i)}
                    onPreview={(ts) => setPreviewSlot(getSlotKey(day, ts))}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.section>

        {/* Preview Dialog */}
        <Dialog
          open={!!previewSlot}
          onOpenChange={() => setPreviewSlot(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-card-foreground">
                Conteúdo Gerado
              </DialogTitle>
            </DialogHeader>
            {previewSlot && slotsData[previewSlot]?.generatedContent ? (
              <ScrollArea className="max-h-[60vh]">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap p-4 bg-muted/30 rounded-lg">
                  {JSON.stringify(
                    slotsData[previewSlot].generatedContent,
                    null,
                    2
                  )}
                </pre>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground p-4">
                Nenhum conteúdo gerado ainda.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </CommandLayout>
  );
};

// Slot cell component for week view
interface SlotCellProps {
  slot: SlotData;
  slotKey: string;
  maxImages: number;
  onFileSelect: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  onPreview: () => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
}

const SlotCell = ({
  slot,
  slotKey,
  maxImages,
  onFileSelect,
  onRemoveImage,
  onPreview,
  fileInputRef,
}: SlotCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={`border rounded-lg p-1.5 min-h-[80px] transition-colors ${
        slot.status === "generated"
          ? "border-success/40 bg-success/5"
          : slot.status === "processing"
          ? "border-warning/40 bg-warning/5"
          : slot.status === "failed"
          ? "border-destructive/40 bg-destructive/5"
          : slot.images.length > 0
          ? "border-primary/30 bg-primary/5"
          : "border-border/50 hover:border-primary/20"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        ref={(el) => {
          inputRef.current = el;
          fileInputRef(el);
        }}
        onChange={(e) => onFileSelect(e.target.files)}
      />

      {slot.images.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-full min-h-[60px] flex flex-col items-center justify-center gap-1 text-muted-foreground/50 hover:text-primary/60 transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
          <span className="text-[8px]">Upload</span>
        </button>
      ) : (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-0.5">
            {slot.imageUrls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative w-7 h-7 rounded overflow-hidden group">
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => onRemoveImage(i)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {slot.images.length > 4 && (
              <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center text-[9px] text-muted-foreground">
                +{slot.images.length - 4}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">
                {slot.images.length}/{maxImages}
              </span>
              {statusIcon(slot.status)}
            </div>
            <div className="flex gap-0.5">
              {slot.images.length < maxImages && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="p-0.5 rounded hover:bg-muted transition-colors"
                >
                  <Upload className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              )}
              {slot.status === "generated" && (
                <button
                  onClick={onPreview}
                  className="p-0.5 rounded hover:bg-muted transition-colors"
                >
                  <Eye className="w-2.5 h-2.5 text-success" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Month day card - expandable
interface MonthDayCardProps {
  day: Date;
  timeSlots: TimeSlot[];
  maxImages: number;
  getSlot: (time: string) => SlotData;
  onFileSelect: (time: string, files: FileList | null) => void;
  onRemoveImage: (time: string, index: number) => void;
  onPreview: (time: string) => void;
}

const MonthDayCard = ({
  day,
  timeSlots,
  maxImages,
  getSlot,
  onFileSelect,
  onRemoveImage,
  onPreview,
}: MonthDayCardProps) => {
  const hasContent = timeSlots.some((ts) => getSlot(ts.value).images.length > 0);

  return (
    <div
      className={`command-card p-3 ${
        isToday(day) ? "border-primary/40" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-sm font-mono ${
            isToday(day) ? "text-primary font-bold" : "text-card-foreground"
          }`}
        >
          {format(day, "EEE dd/MM", { locale: ptBR })}
        </span>
      </div>

      <div className="space-y-1.5">
        {timeSlots.map((ts) => {
          const slot = getSlot(ts.value);
          return (
            <div
              key={ts.value}
              className="flex items-center gap-2 p-1.5 rounded border border-border/50 hover:border-primary/20 transition-colors"
            >
              <span className="text-[10px] font-mono text-primary w-10">
                {ts.value}
              </span>
              {slot.images.length > 0 ? (
                <div className="flex items-center gap-1 flex-1">
                  <div className="flex gap-0.5">
                    {slot.imageUrls.slice(0, 3).map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="w-5 h-5 rounded object-cover"
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {slot.images.length} fotos
                  </span>
                  {statusIcon(slot.status)}
                </div>
              ) : (
                <label className="flex items-center gap-1 cursor-pointer text-muted-foreground/50 hover:text-primary/60 transition-colors flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onFileSelect(ts.value, e.target.files)}
                  />
                  <ImagePlus className="w-3 h-3" />
                  <span className="text-[9px]">Adicionar</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Agendamento;
