import { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
}

export function GlassCard({
    children,
    className = "",
}: GlassCardProps) {
    return (
        <div
            className={[
                "rounded-2xl",
                "border border-white/[0.08]",
                "bg-white/[0.035]",
                "backdrop-blur-xl",
                "shadow-[0_8px_40px_rgba(0,0,0,0.25)]",
                className,
            ].join(" ")}
        >
            {children}
        </div>
    );
}