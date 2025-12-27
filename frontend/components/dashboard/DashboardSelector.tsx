"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutDashboard, MoreVertical, Edit3, Trash2, Plus } from "lucide-react";

interface Dashboard {
    id: string;
    name: string;
    description?: string;
}

interface DashboardSelectorProps {
    dashboards: Dashboard[];
    currentDashboardId: string | null;
    onDashboardChange: (dashboardId: string) => void;
    onCreateDashboard: () => void;
    onEditDashboard: (dashboard: Dashboard) => void;
    onDeleteDashboard: (dashboard: Dashboard) => void;
}

export function DashboardSelector({
    dashboards,
    currentDashboardId,
    onDashboardChange,
    onCreateDashboard,
    onEditDashboard,
    onDeleteDashboard
}: DashboardSelectorProps) {
    const currentDashboard = dashboards.find(d => d.id === currentDashboardId);

    return (
        <div className="flex items-center gap-3">
            {/* Dashboard Icon */}


            {/* Dashboard Selector */}
            <div className="flex-1 min-w-[200px] max-w-[350px]">
                <Select value={currentDashboardId || undefined} onValueChange={onDashboardChange}>
                    <SelectTrigger className="h-10 bg-background/50 backdrop-blur border-primary/20 hover:border-primary/40 transition-colors">
                        <SelectValue placeholder="Seleccionar Dashboard">
                            {currentDashboard && (
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                                    <span className="font-semibold truncate">{currentDashboard.name}</span>
                                </div>
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {dashboards.map((dashboard) => (
                            <SelectItem key={dashboard.id} value={dashboard.id}>
                                <div className="flex flex-col py-1">
                                    <span className="font-medium">{dashboard.name}</span>
                                    {dashboard.description && (
                                        <span className="text-xs text-muted-foreground truncate max-w-[250px]">
                                            {dashboard.description}
                                        </span>
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Create Dashboard Button */}
            <Button
                onClick={onCreateDashboard}
                size="icon"
                className="h-10 w-10 dark:text-white cursor-pointer"
                title="Crear Nuevo Dashboard"
            >
                <Plus className="h-4 w-4" />
            </Button>

            {/* Dashboard Actions */}
            {currentDashboard && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onEditDashboard(currentDashboard)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Editar Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDeleteDashboard(currentDashboard)}
                            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar Dashboard
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
