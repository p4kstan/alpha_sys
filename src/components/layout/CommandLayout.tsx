import { ReactNode, forwardRef } from "react";
import CommandHeader from "./CommandHeader";

interface CommandLayoutProps {
  children: ReactNode;
}

const CommandLayout = forwardRef<HTMLDivElement, CommandLayoutProps>(
  ({ children }, ref) => {
    return (
      <div ref={ref} className="min-h-screen bg-background grid-overlay relative">
        {/* Ambient glow effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-secondary/5 rounded-full blur-[120px]" />
        </div>
        
        <CommandHeader />
        
        <main className="relative z-10 pt-14 md:pt-16">
          {children}
        </main>
      </div>
    );
  }
);

CommandLayout.displayName = "CommandLayout";

export default CommandLayout;