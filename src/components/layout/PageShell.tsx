import { cn } from "@/lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

/** Main content width + mobile-first padding (375px-first). */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-background px-4 pt-4 pb-24",
        className,
      )}
    >
      {children}
    </div>
  );
}
