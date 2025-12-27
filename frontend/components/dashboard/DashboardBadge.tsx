"use client";

import { useDashboard } from "@/contexts/DashboardContext";
import { LayoutDashboard } from "lucide-react";

export function DashboardBadge() {
    const { currentDashboard, isLoading } = useDashboard();

    if (isLoading || !currentDashboard) {
        return null;
    }

    return (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium">Dashboard Activo</span>
                <span className="text-sm font-semibold text-foreground">{currentDashboard.name}</span>
            </div>
        </div>
    );
}
