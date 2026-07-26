import { cn } from "@/lib/utils";

export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8", className)}
      {...props}
    />
  );
}
