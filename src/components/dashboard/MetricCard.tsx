import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { forwardRef } from "react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "success" | "warning" | "accent";
}

const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ icon: Icon, label, value, sublabel, variant = "default" }, ref) => {
    const variantStyles = {
      default: "border-border",
      success: "border-success/30",
      warning: "border-warning/30",
      accent: "border-primary/30",
    };

    const iconStyles = {
      default: "text-muted-foreground",
      success: "text-success",
      warning: "text-warning",
      accent: "text-primary",
    };

    return (
      <motion.div
        ref={ref}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`command-card border ${variantStyles[variant]} transition-colors duration-200`}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
            <span className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span className="text-xl md:text-2xl font-bold text-card-foreground">
              {value}
            </span>
            {sublabel && (
              <span className="text-[10px] md:text-xs text-muted-foreground truncate">
                {sublabel}
              </span>
            )}
          </div>
          <div className={`p-1.5 md:p-2 rounded-lg bg-muted/50 ${iconStyles[variant]} flex-shrink-0`}>
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        </div>
      </motion.div>
    );
  }
);

MetricCard.displayName = "MetricCard";

export default MetricCard;
