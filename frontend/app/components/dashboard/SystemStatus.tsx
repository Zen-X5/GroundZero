import {
    BrainCircuit,
    Database,
    Network,
    Plane,
} from "lucide-react";

import { GlassCard } from "./GlassCard";

const systems = [
    {
        name: "AI SERVICE",
        value: "ONLINE",
        icon: BrainCircuit,
    },
    {
        name: "MESH NETWORK",
        value: "ONLINE",
        icon: Network,
    },
    {
        name: "DRONE FLEET",
        value: "8 / 8",
        icon: Plane,
    },
    {
        name: "DATABASE",
        value: "ONLINE",
        icon: Database,
    },
];

export function SystemStatus() {
    return (
        <GlassCard className="p-4">
            <div className="mb-4">
                <p className="text-[9px] font-medium tracking-[0.18em] text-white/35">
                    SYSTEM STATUS
                </p>
            </div>

            <div className="space-y-3">
                {systems.map((system) => {
                    const Icon = system.icon;

                    return (
                        <div
                            key={system.name}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2.5">
                                <Icon
                                    size={14}
                                    className="text-white/30"
                                    strokeWidth={1.6}
                                />

                                <span className="text-[9px] tracking-wider text-white/45">
                                    {system.name}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />

                                <span className="font-mono text-[9px] text-emerald-400">
                                    {system.value}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </GlassCard>
    );
}