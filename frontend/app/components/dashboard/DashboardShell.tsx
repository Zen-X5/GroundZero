import {
    Activity,
    Radio,
    ShieldAlert,
    Users,
} from "lucide-react";

import { GlassCard } from "./GlassCard";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { StatCard } from "./StatCard";
import { SystemStatus } from "./SystemStatus";
import { DigitalTwinPanel } from "./DigitalTwinPanel";
import { RecentDetections } from "./RecentDetaction";
import { PrioritySurvivors } from "./PritoritySurvivors";

export function DashboardShell() {
    return (
        <div className="flex h-screen overflow-hidden bg-[#05070A] text-white">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <TopBar />

                <main className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-[1800px] p-4 md:p-6">
                        {/* Mobile brand */}
                        <div className="mb-5 flex items-center justify-between lg:hidden">
                            <div>
                                <p className="text-xs font-bold tracking-[0.2em]">
                                    GROUND ZERO
                                </p>

                                <p className="mt-1 text-[8px] tracking-widest text-white/25">
                                    AUTONOMOUS RESPONSE SYSTEM
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                                <span className="text-[8px] tracking-wider text-emerald-400">
                                    ONLINE
                                </span>
                            </div>
                        </div>

                        {/* Stats */}
                        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                            <StatCard
                                label="ACTIVE DRONES"
                                value="08"
                                description="8 / 8 operational"
                                icon={Radio}
                            />

                            <StatCard
                                label="SURVIVORS"
                                value="12"
                                description="tracked entities"
                                icon={Users}
                            />

                            <StatCard
                                label="CRITICAL"
                                value="03"
                                description="immediate attention"
                                icon={ShieldAlert}
                                status="critical"
                            />

                            <StatCard
                                label="AREA COVERAGE"
                                value="68%"
                                description="search coverage"
                                icon={Activity}
                            />

                            <StatCard
                                label="MESH HEALTH"
                                value="92%"
                                description="network integrity"
                                icon={Radio}
                            />
                        </section>

                        {/* Main operational area */}
                        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                            <DigitalTwinPanel />

                            <SystemStatus />
                        </section>

                        {/* Bottom information */}
                        <section className="mt-4 grid gap-4 xl:grid-cols-2">
                            <RecentDetections />

                            <PrioritySurvivors />
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
}