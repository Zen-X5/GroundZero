import { Crosshair, Navigation } from "lucide-react";

import { GlassCard } from "./GlassCard";

const drones = [
    { id: "D01", x: "22%", y: "30%" },
    { id: "D02", x: "68%", y: "22%" },
    { id: "D03", x: "47%", y: "62%" },
    { id: "D04", x: "78%", y: "72%" },
    { id: "D05", x: "30%", y: "76%" },
];

const survivors = [
    { id: "S17", x: "54%", y: "42%" },
    { id: "S09", x: "36%", y: "55%" },
];

export function DigitalTwinPanel() {
    return (
        <GlassCard className="relative min-h-[480px] overflow-hidden">
            {/* Header */}
            <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-white/[0.06] bg-black/20 px-5 py-3 backdrop-blur-md">
                <div>
                    <p className="text-[9px] font-medium tracking-[0.18em] text-white/60">
                        DIGITAL TWIN
                    </p>

                    <p className="mt-1 text-[8px] tracking-wider text-white/25">
                        LIVE ENVIRONMENT MODEL
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />

                    <span className="font-mono text-[8px] tracking-wider text-cyan-400">
                        SIMULATION
                    </span>
                </div>
            </div>

            {/* Tactical grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* Sector areas */}
            <div className="absolute left-[12%] top-[28%] h-[38%] w-[28%] rounded-xl border border-cyan-400/10 bg-cyan-400/[0.015]" />

            <div className="absolute left-[48%] top-[20%] h-[30%] w-[35%] rounded-xl border border-white/[0.05] bg-white/[0.01]" />

            <div className="absolute left-[40%] top-[55%] h-[25%] w-[38%] rounded-xl border border-amber-400/10 bg-amber-400/[0.015]" />

            {/* Drone markers */}
            {drones.map((drone) => (
                <div
                    key={drone.id}
                    className="absolute z-10"
                    style={{
                        left: drone.x,
                        top: drone.y,
                    }}
                >
                    <div className="relative">
                        <div className="absolute -inset-3 rounded-full border border-cyan-400/10" />

                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.08]">
                            <Navigation
                                size={12}
                                className="text-cyan-400"
                            />
                        </div>

                        <span className="absolute left-8 top-1 font-mono text-[8px] text-cyan-400/70">
                            {drone.id}
                        </span>
                    </div>
                </div>
            ))}

            {/* Survivor markers */}
            {survivors.map((survivor) => (
                <div
                    key={survivor.id}
                    className="absolute z-10"
                    style={{
                        left: survivor.x,
                        top: survivor.y,
                    }}
                >
                    <div className="relative flex items-center justify-center">
                        <div className="absolute h-10 w-10 animate-pulse rounded-full border border-red-400/20" />

                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-red-400/50 bg-red-400/10">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        </div>

                        <span className="absolute left-8 whitespace-nowrap font-mono text-[8px] text-red-400">
                            {survivor.id}
                        </span>
                    </div>
                </div>
            ))}

            {/* Crosshair */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
                <Crosshair size={80} strokeWidth={0.8} />
            </div>

            {/* Coordinates */}
            <div className="absolute bottom-4 left-5 rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2 backdrop-blur-md">
                <div className="flex gap-4 font-mono text-[8px] text-white/30">
                    <span>WORLD FRAME</span>
                    <span>X 42.20</span>
                    <span>Y -17.42</span>
                    <span>Z 18.40</span>
                </div>
            </div>

            {/* North */}
            <div className="absolute bottom-4 right-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/30">
                <span className="font-mono text-[9px] text-white/50">
                    N
                </span>
            </div>
        </GlassCard>
    );
}