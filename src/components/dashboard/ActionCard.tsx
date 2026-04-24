import { LucideIcon, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { forwardRef } from "react";

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  variant?: "primary" | "secondary";
}

const ActionCard = forwardRef<HTMLAnchorElement, ActionCardProps>(
  ({ icon: Icon, title, description, to, variant = "primary" }, ref) => {
    const isPrimary = variant === "primary";

    return (
      <Link to={to} className="block" ref={ref}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`
            relative overflow-hidden rounded-lg p-4 md:p-6 cursor-pointer
            border transition-all duration-300 group
            ${isPrimary 
              ? "bg-gradient-to-br from-primary/10 via-card to-card border-primary/30 hover:border-primary/60" 
              : "bg-card border-border hover:border-muted-foreground/30"
            }
          `}
        >
          {/* Glow effect */}
          {isPrimary && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          )}

          <div className="relative flex items-start justify-between">
            <div className="flex flex-col gap-2 md:gap-3 min-w-0">
              <div className={`
                p-2 md:p-3 rounded-lg w-fit
                ${isPrimary 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground group-hover:text-foreground"
                }
              `}>
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h3 className={`
                  text-sm md:text-base font-semibold tracking-wide mb-0.5 md:mb-1
                  ${isPrimary ? "text-foreground" : "text-card-foreground"}
                `}>
                  {title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                  {description}
                </p>
              </div>
            </div>
            <ChevronRight className={`
              w-4 h-4 md:w-5 md:h-5 transition-transform duration-200 group-hover:translate-x-1 flex-shrink-0
              ${isPrimary ? "text-primary" : "text-muted-foreground"}
            `} />
          </div>
        </motion.div>
      </Link>
    );
  }
);

ActionCard.displayName = "ActionCard";

export default ActionCard;