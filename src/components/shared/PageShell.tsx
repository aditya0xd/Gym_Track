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
        "mx-auto w-full min-w-0 max-w-6xl px-4 py-4 sm:px-6 sm:py-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
