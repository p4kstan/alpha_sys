import { Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface CommandHeaderProps {
  title?: string;
  subtitle?: string;
}

const CommandHeader = ({ 
  title = "ALPHACODE SUPREMACY", 
  subtitle = "CONTENT ENGINE" 
}: CommandHeaderProps) => {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative flex-shrink-0">
            <Shield className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            <div className="absolute inset-0 blur-sm bg-primary/30 -z-10" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs md:text-sm font-bold tracking-[0.1em] md:tracking-[0.2em] text-foreground truncate">
              {title}
            </span>
            <span className="text-[10px] md:text-xs tracking-[0.1em] md:tracking-[0.15em] text-muted-foreground truncate">
              {subtitle}
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden sm:flex items-center gap-2">
            <div className="status-dot active" />
            <span className="text-xs tracking-wide text-muted-foreground uppercase">
              Sistema Operacional
            </span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-md bg-muted/50 border border-border">
            <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 text-secondary" />
            <span className="text-[10px] md:text-xs font-medium text-secondary">ATIVO</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default CommandHeader;