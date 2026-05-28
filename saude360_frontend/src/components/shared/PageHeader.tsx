import { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ eyebrow, title, description, actions }: PageHeaderProps) => (
  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 lg:mb-8">
    <div>
      {eyebrow && <span className="section-eyebrow mb-2">{eyebrow}</span>}
      <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon?: ReactNode;
  accent?: "primary" | "success" | "warning" | "info";
}

export const StatCard = ({ label, value, trend, trendDirection = "neutral", icon, accent = "primary" }: StatCardProps) => {
  const accentMap = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
  };
  const trendColor = trendDirection === "up" ? "text-success" : trendDirection === "down" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="card-elevated p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl lg:text-[28px] font-semibold mt-2 text-foreground">{value}</p>
          {trend && <p className={`text-xs mt-1.5 font-medium ${trendColor}`}>{trend}</p>}
        </div>
        {icon && <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accentMap[accent]}`}>{icon}</div>}
      </div>
    </div>
  );
};

interface ChipProps {
  children: ReactNode;
  variant?: "primary" | "success" | "warning" | "info" | "destructive" | "muted";
}
export const Chip = ({ children, variant = "muted" }: ChipProps) => {
  const v = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    info: "bg-info-soft text-info",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-subtle-foreground",
  }[variant];
  return <span className={`chip ${v}`}>{children}</span>;
};
