"use client";

import ChartBuilder from "@/components/ChartBuilder";
import { DashboardBadge } from "@/components/dashboard/DashboardBadge";

export default function AnalyticsPage() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in slide-in-from-left duration-500">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold">
                        Analytics & Visualización
                    </h1>
                    <p className="text-muted-foreground">
                        Crea gráficos interactivos dinámicamente a partir de tus datasets.
                    </p>
                </div>
                <DashboardBadge />
            </div>

            <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
                <ChartBuilder />
            </div>
        </div>
    );
}
