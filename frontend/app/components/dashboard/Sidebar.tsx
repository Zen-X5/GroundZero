"use client";

import {
    Activity,
    AlertTriangle,
    Bot,
    LayoutDashboard,
    Network,
    Users,
} from "lucide-react";

const navigation = [
    {
        name: "Command",
        icon: LayoutDashboard,
        active: true,
    },
    {
        name: "Swarm",
        icon: Bot,
        active: false,
    },
    {
        name: "Survivors",
        icon: Users,
        active: false,
    },
    {
        name: "Hazards",
        icon: AlertTriangle,
        active: false,
    },
    {
        name: "Network",
        icon: Network,
        active: false,
    },
    {
        name: "Analytics",
        icon: Activity,
        active: false,
    },
];

export function Sidebar() {
    return (
        <aside className="hidden w-[250px] shrink-0 border-r border-white/[0.06] bg-black/20 lg:flex lg:flex-col">
            {/* Brand */}
            <div className="flex h-[72px] items-center border-b border-white/[0.06] px-6">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />

                        <span className="text-sm font-bold tracking-[0.2em] text-white">
                            GROUND ZERO
                        </span>
                    </div>

                    <p className="mt-1 text-[9px] tracking-[0.18em] text-white/35">
                        AUTONOMOUS RESPONSE SYSTEM
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                <p className="mb-3 px-3 text-[9px] font-medium tracking-[0.2em] text-white/25">
                    OPERATIONS
                </p>

                {navigation.map((item) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.name}
                            className={[
                                "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all",
                                item.active
                                    ? "border border-white/[0.08] bg-white/[0.06] text-white"
                                    : "text-white/40 hover:bg-white/[0.035] hover:text-white/80",
                            ].join(" ")}
                        >
                            <Icon
                                size={17}
                                strokeWidth={1.7}
                                className={
                                    item.active
                                        ? "text-cyan-400"
                                        : "text-white/35 group-hover:text-white/60"
                                }
                            />

                            <span className="text-xs font-medium">
                                {item.name}
                            </span>

                            {item.active && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-white/[0.06] p-4">
                <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-3">
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                        <span className="text-[10px] font-medium tracking-wider text-emerald-400">
                            SYSTEM OPERATIONAL
                        </span>
                    </div>

                    <p className="mt-2 font-mono text-[9px] text-white/20">
                        GZ-CORE v0.1.0
                    </p>
                </div>
            </div>
        </aside>
    );
}