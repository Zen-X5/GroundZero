import { ScanSearch } from "lucide-react";

import { GlassCard } from "./GlassCard";

const detections = [
    {
        id: "D-104",
        type: "PERSON",
        confidence: "94%",
        drone: "D04",
        sector: "S03",
        time: "16:30:21",
    },
    {
        id: "D-103",
        type: "PERSON",
        confidence: "88%",
        drone: "D02",
        sector: "S02",
        time: "16:29:58",
    },
    {
        id: "D-102",
        type: "PERSON",
        confidence: "91%",
        drone: "D01",
        sector: "S01",
        time: "16:29:42",
    },
    {
        id: "D-101",
        type: "DEBRIS",
        confidence: "83%",
        drone: "D05",
        sector: "S04",
        time: "16:29:19",
    },
];

export function RecentDetections() {
    return (
        <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div>
                    <p className="text-[9px] font-medium tracking-[0.18em] text-white/50">
                        RECENT DETECTIONS
                    </p>

                    <p className="mt-1 text-[8px] text-white/20">
                        AI SENSOR EVENTS
                    </p>
                </div>

                <ScanSearch
                    size={15}
                    className="text-white/20"
                />
            </div>

            <div className="divide-y divide-white/[0.04]">
                {detections.map((detection) => (
                    <div
                        key={detection.id}
                        className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.025]"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                            <span className="font-mono text-[8px] text-white/40">
                                {detection.id.replace("D-", "")}
                            </span>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-medium text-white/70">
                                    {detection.type}
                                </span>

                                <span className="rounded bg-cyan-400/[0.08] px-1.5 py-0.5 font-mono text-[8px] text-cyan-400">
                                    {detection.confidence}
                                </span>
                            </div>

                            <p className="mt-1 font-mono text-[8px] text-white/25">
                                {detection.drone} / {detection.sector}
                            </p>
                        </div>

                        <span className="font-mono text-[8px] text-white/20">
                            {detection.time}
                        </span>
                    </div>
                ))}
            </div>
        </GlassCard>
    );
}