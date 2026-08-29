import { ArrowUpRight, Users } from "lucide-react";

import { GlassCard } from "./GlassCard";

const survivors = [
    {
        rank: 1,
        id: "S-017",
        risk: "CRITICAL",
        confidence: "94%",
        sector: "S03",
    },
    {
        rank: 2,
        id: "S-009",
        risk: "HIGH",
        confidence: "91%",
        sector: "S02",
    },
    {
        rank: 3,
        id: "S-021",
        risk: "HIGH",
        confidence: "86%",
        sector: "S04",
    },
];

export function PrioritySurvivors() {
    return (
        <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div>
                    <p className="text-[9px] font-medium tracking-[0.18em] text-white/50">
                        PRIORITY SURVIVORS
                    </p>

                    <p className="mt-1 text-[8px] text-white/20">
                        RESCUE PRIORITY QUEUE
                    </p>
                </div>

                <Users
                    size={15}
                    className="text-white/20"
                />
            </div>

            <div className="divide-y divide-white/[0.04]">
                {survivors.map((survivor) => (
                    <div
                        key={survivor.id}
                        className="flex items-center gap-4 px-5 py-4"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025]">
                            <span className="font-mono text-[10px] text-white/40">
                                #{survivor.rank}
                            </span>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-white/80">
                                    {survivor.id}
                                </span>

                                <span
                                    className={[
                                        "rounded px-1.5 py-0.5 font-mono text-[7px]",
                                        survivor.risk === "CRITICAL"
                                            ? "bg-red-400/10 text-red-400"
                                            : "bg-amber-400/10 text-amber-400",
                                    ].join(" ")}
                                >
                                    {survivor.risk}
                                </span>
                            </div>

                            <p className="mt-1 font-mono text-[8px] text-white/25">
                                {survivor.sector} / CONF {survivor.confidence}
                            </p>
                        </div>

                        <ArrowUpRight
                            size={14}
                            className="text-white/20"
                        />
                    </div>
                ))}
            </div>
        </GlassCard>
    );
}