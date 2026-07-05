type PageHeaderProps = {
  subtitle?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  count?: number;
};

export function PageHeader({ subtitle, title, description, actions, count }: PageHeaderProps) {
  return (
    <div className="mb-6 pt-2">
      {subtitle ? (
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4ff00]">{subtitle}</p>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="mt-1 text-3xl font-extrabold text-foreground">{title}</h1>
        {count !== undefined && (
          <span className="rounded-full border-2 border-[#d4ff00] bg-[#d4ff00]/10 px-2.5 py-0.5 text-sm font-semibold text-[#d4ff00] shadow-[0_0_10px_rgba(212,255,0,0.3)]">
            {count}
          </span>
        )}
      </div>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
