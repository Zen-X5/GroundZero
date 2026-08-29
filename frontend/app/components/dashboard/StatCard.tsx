import { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface StatCardProps {
    label: string;
    value: string;
    description: string;
    icon: LucideIcon;
    status?: "normal" | "warning" | "critical";
}

export function StatCard({
    label,
    value,
    description,
    icon: Icon,
    status = "normal",
}: StatCardProps) {
    const statusClass = {
        normal: "text-cyan-400",
        warning: "text-amber-400",
        critical: "text-red-400",
    }[status];

    return (
        <GlassCard className="relative overflow-hidden p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[9px] font-medium tracking-[0.16em] text-white/35">
                        {label}
                    </p>

                    <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-white">
                        {value}
                    </p>

                    <p className="mt-1 text-[9px] text-white/25">
                        {description}
                    </p>
                </div>

                <div
                    className={`rounded-lg bg-white/[0.04] p-2 ${statusClass}`}
                >
                    <Icon size={16} strokeWidth={1.6} />
                </div>
            </div>
        </GlassCard>
    );
}