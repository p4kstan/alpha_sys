import { motion, type Easing } from "framer-motion";
import { 
  Target, 
  FileImage, 
  Clock, 
  CheckCircle2,
  Activity,
  Layers,
  Settings,
  CalendarDays
} from "lucide-react";
import CommandLayout from "@/components/layout/CommandLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import ActionCard from "@/components/dashboard/ActionCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as Easing }
    },
  };

  return (
    <CommandLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 md:mb-12"
        >
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="space-y-2 md:space-y-3">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-card-foreground">
                Centro de Comando
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-md">
                A vitória exige silêncio e estratégia. Transforme seus ativos em 
                conteúdo de alto impacto.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <Button 
                variant="stealth" 
                size="lg"
                onClick={() => navigate("/configuracoes")}
                className="w-full sm:w-auto text-sm md:text-base"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Configurar Marca
              </Button>
              <Button 
                variant="command" 
                size="lg"
                onClick={() => navigate("/triagem")}
                className="w-full sm:w-auto text-sm md:text-base"
              >
                <Target className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                Iniciar Novo Job
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Metrics Grid */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-8 md:mb-12"
        >
          <motion.div variants={itemVariants}>
            <MetricCard
              icon={Layers}
              label="Jobs Hoje"
              value="12"
              sublabel="+3 vs ontem"
              variant="accent"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              icon={FileImage}
              label="Ativos Processados"
              value="48"
              sublabel="Esta semana"
              variant="default"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              icon={CheckCircle2}
              label="Taxa de Conclusão"
              value="94%"
              sublabel="Último mês"
              variant="success"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <MetricCard
              icon={Clock}
              label="Tempo Médio"
              value="2.3m"
              sublabel="Por job"
              variant="default"
            />
          </motion.div>
        </motion.section>

        {/* Actions Grid */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3 md:space-y-4"
        >
          <motion.h2 
            variants={itemVariants}
            className="text-base md:text-lg font-semibold text-card-foreground tracking-wide"
          >
            Ações Rápidas
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <motion.div variants={itemVariants}>
              <ActionCard
                icon={Target}
                title="Nova Triagem"
                description="Inicie o processo de análise e geração de conteúdo"
                to="/triagem"
                variant="primary"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <ActionCard
                icon={CalendarDays}
                title="Agendamento em Massa"
                description="Organize e processe conteúdo da semana/mês inteiro"
                to="/agendamento"
                variant="primary"
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <ActionCard
                icon={Settings}
                title="Configurações"
                description="Personalize identidade e tom de voz da marca"
                to="/configuracoes"
                variant="secondary"
              />
            </motion.div>
          </div>
        </motion.section>

        {/* Recent Activity */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-8 md:mt-12"
        >
          <h2 className="text-base md:text-lg font-semibold text-card-foreground tracking-wide mb-3 md:mb-4">
            Atividade Recente
          </h2>
          
          <div className="command-card space-y-3 md:space-y-4">
            {[
              { time: "14:32", action: "Job #127 concluído", status: "success" },
              { time: "13:45", action: "Triagem iniciada — 8 ativos", status: "active" },
              { time: "11:20", action: "Job #126 aprovado", status: "success" },
            ].map((item, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 md:gap-4 py-2 md:py-3 border-b border-border last:border-0"
              >
                <div className={`status-dot ${item.status === 'success' ? 'active' : 'warning'}`} />
                <span className="text-[10px] md:text-xs font-mono text-muted-foreground w-12 md:w-14">
                  {item.time}
                </span>
                <span className="text-xs md:text-sm text-card-foreground">
                  {item.action}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </CommandLayout>
  );
};

export default Dashboard;
