import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-white/[0.08] bg-white/[0.05] text-slate-200",
        outline: "border-white/[0.12] text-slate-300",
        start:
          "border-[#00F59B]/30 bg-[#00F59B]/12 text-[#047857]",
        tossup:
          "border-[#FFB800]/30 bg-[#FFB800]/12 text-[#B45309]",
        sit: "border-[#FF3366]/30 bg-[#FF3366]/12 text-[#E11D48]",
        bet: "border-[#00E5FF]/30 bg-[#00E5FF]/12 text-[#0e7490]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
