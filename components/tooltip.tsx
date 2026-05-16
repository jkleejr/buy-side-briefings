import { cn } from "@/lib/utils";

type TooltipProps = {
  text: string;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

export default function Tooltip({ text, children, align = "left", className }: TooltipProps) {
  return (
    <span
      className={cn("tip-host", className)}
      tabIndex={0}
      aria-label={text}
    >
      {children}
      <span className={cn("tip-bubble", align === "right" && "tip-bubble--right")}>
        {text}
      </span>
    </span>
  );
}
