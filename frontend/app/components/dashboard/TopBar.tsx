import { Radio, Wifi } from "lucide-react";

export function TopBar() {
    return (
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/20 px-5 backdrop-blur-xl lg:px-7">
            <div>
                <h1 className="text-sm font-semibold tracking-[0.16em] text-white">
                    COMMAND CENTER
                </h1>

                <p className="mt-1 text-[9px] tracking-[0.18em] text-white/30">
                    LIVE DISASTER RESPONSE
                </p>
            </div>

            <div className="flex items-center gap-3">
                {/* Mesh */}
                <div className="hidden items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 sm:flex">
                    <Wifi size={13} className="text-cyan-400" />

                    <div>
                        <p className="text-[8px] tracking-widest text-white/30">
                            NETWORK
                        </p>

                        <p className="font-mono text-[10px] text-white/70">
                            MESH ONLINE
                        </p>
                    </div>
                </div>

                {/* System */}
                <div className="flex items-center gap-2 rounded-lg border border-emerald-400/10 bg-emerald-400/[0.025] px-3 py-2">
                    <Radio
                        size={13}
                        className="text-emerald-400"
                    />

                    <span className="text-[9px] font-medium tracking-wider text-emerald-400">
                        OPERATIONAL
                    </span>
                </div>

                <div className="hidden border-l border-white/[0.08] pl-4 font-mono text-[10px] text-white/30 md:block">
                    UTC 16:30:21
                </div>
            </div>
        </header>
    );
}