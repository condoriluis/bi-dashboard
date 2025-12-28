"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Sparkles } from "lucide-react";
import { WidgetBuilder } from "@/components/dashboard/WidgetBuilder";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { DashboardSelector } from "@/components/dashboard/DashboardSelector";
import { DashboardManager } from "@/components/dashboard/DashboardManager";
import { WidgetConfig } from "@/lib/utils";
import { dashboardService } from "@/services/dashboard";
import { useDashboard } from "@/contexts/DashboardContext";

export default function DashboardPage() {
    const {
        dashboards,
        currentDashboardId,
        currentDashboard,
        isLoading: isDashboardLoading,
        setCurrentDashboardId,
        addDashboard,
        updateDashboard,
        removeDashboard,
        updateCurrentDashboardItems,
    } = useDashboard();

    const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);
    const [isWidgetsLoaded, setIsWidgetsLoaded] = useState(false);

    // Dashboard Manager State
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [managerMode, setManagerMode] = useState<'create' | 'edit' | 'delete'>('create');
    const [managingDashboard, setManagingDashboard] = useState<any>(null);

    const skipNextLoadRef = useRef(false);

    // Load widgets when dashboard changes
    useEffect(() => {
        if (!currentDashboardId || isDashboardLoading) return;

        if (skipNextLoadRef.current) {
            skipNextLoadRef.current = false;
            return;
        }

        const loadWidgets = async () => {
            try {
                const fullDashboard = await dashboardService.get(currentDashboardId);
                const loadedWidgets = fullDashboard.items.map((item: any) => ({
                    ...item.config,
                    id: item.id
                }));
                setWidgets(loadedWidgets);
            } catch (error: any) {
                console.error("Error loading widgets", error);

                if (error.response?.status === 404) {
                    setWidgets([]);
                }
            } finally {
                setIsWidgetsLoaded(true);
            }
        };

        loadWidgets();
    }, [currentDashboardId, isDashboardLoading]);

    // Auto-save widgets
    useEffect(() => {
        if (isWidgetsLoaded && currentDashboardId) {
            const saveTimeout = setTimeout(() => {
                dashboardService.updateLayout(currentDashboardId, widgets)
                    .then(updatedDashboard => {
                        updateDashboard(updatedDashboard);
                    })
                    .catch(err => console.error("Failed to auto-save layout", err));
            }, 1000);

            return () => clearTimeout(saveTimeout);
        }
    }, [widgets, isWidgetsLoaded, currentDashboardId, updateDashboard]);

    const handleSaveWidget = (config: WidgetConfig) => {
        let newWidgets;
        if (editingWidget) {
            newWidgets = widgets.map(w => w.id === config.id ? config : w);
            setEditingWidget(null);
        } else {
            newWidgets = [...widgets, config];
        }
        setWidgets(newWidgets);
        updateCurrentDashboardItems(newWidgets); // Instant sync to context
        setIsBuilderOpen(false);
    };

    const handleDeleteWidget = (id: string) => {
        const newWidgets = widgets.filter(w => w.id !== id);
        setWidgets(newWidgets);
        updateCurrentDashboardItems(newWidgets); // Instant sync to context
    };

    const handleEditWidget = (config: WidgetConfig) => {
        setEditingWidget(config);
        setIsBuilderOpen(true);
    };

    const handleOpenBuilder = () => {
        setEditingWidget(null);
        setIsBuilderOpen(true);
    };

    // Dashboard Management Handlers
    const handleDashboardChange = (dashboardId: string) => {
        setCurrentDashboardId(dashboardId);
    };

    const handleCreateDashboard = () => {
        setManagerMode('create');
        setManagingDashboard(null);
        setIsManagerOpen(true);
    };

    const handleEditDashboard = (dashboard: any) => {
        setManagerMode('edit');
        setManagingDashboard(dashboard);
        setIsManagerOpen(true);
    };

    const handleDeleteDashboard = (dashboard: any) => {
        setManagerMode('delete');
        setManagingDashboard(dashboard);
        setIsManagerOpen(true);
    };

    const handleDashboardAction = async (dashboard: any) => {
        if (managerMode === 'create' && dashboard) {
            addDashboard(dashboard);
            setCurrentDashboardId(dashboard.id);
            skipNextLoadRef.current = true;
            setWidgets([]);
        } else if (managerMode === 'edit' && dashboard) {
            updateDashboard(dashboard);
        } else if (managerMode === 'delete') {
            removeDashboard(managingDashboard.id);

            if (dashboards.length > 1) {
            } else {
                const newDashboard = await dashboardService.create("Mi Dashboard", "Tablero principal");
                addDashboard(newDashboard);
                setCurrentDashboardId(newDashboard.id);
                skipNextLoadRef.current = true;
                setWidgets([]);
            }
        }
    };


    return (
        <div className="space-y-4">
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/40 -mx-4 sm:-mx-6 lg:-mx-4 px-4 sm:px-6 lg:px-4 py-0">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {currentDashboard && (
                        <div className="space-y-0.5 min-w-0 flex-shrink animate-in fade-in-50 duration-300">
                            <h2 className="text-2xl lg:text-3xl font-bold truncate">{currentDashboard.name}</h2>
                            {currentDashboard.description && (
                                <p className="text-sm text-muted-foreground truncate">{currentDashboard.description}</p>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
                        <DashboardSelector
                            dashboards={dashboards}
                            currentDashboardId={currentDashboardId}
                            onDashboardChange={handleDashboardChange}
                            onCreateDashboard={handleCreateDashboard}
                            onEditDashboard={handleEditDashboard}
                            onDeleteDashboard={handleDeleteDashboard}
                        />

                        <Button
                            onClick={handleOpenBuilder}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20 dark:text-white cursor-pointer whitespace-nowrap"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Agregar Widget
                        </Button>
                    </div>
                </div>
            </div>

            {!isWidgetsLoaded ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Sparkles className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : widgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-primary/20 rounded-xl bg-muted/10 animate-in fade-in-50">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <LayoutDashboard className="h-10 w-10 text-primary/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Este dashboard está vacío</h3>
                    <p className="text-muted-foreground max-w-sm text-center mt-2 mb-6">
                        Comienza agregando widgets para visualizar tus datos importantes.
                    </p>
                    <Button variant="outline" onClick={handleOpenBuilder} className="cursor-pointer">
                        <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                        Crear mi primer Widget
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in-50 duration-700">
                    {widgets.map((widget) => {
                        const spanClass = {
                            1: 'col-span-1',
                            2: 'col-span-1 md:col-span-2',
                            3: 'col-span-1 md:col-span-3',
                            4: 'col-span-1 md:col-span-2 lg:col-span-4'
                        }[widget.colSpan || (widget.type === 'metric' ? 1 : 2)] || 'col-span-2';

                        const heightClass = widget.type === 'metric' ? 'h-[180px]' :
                            widget.type === 'table' ? 'h-[600px]' :
                                widget.type === 'map' ? 'h-[700px]' :
                                    'h-[500px]';

                        return (
                            <div key={widget.id} className={`${spanClass} ${heightClass}`}>
                                <DashboardWidget
                                    config={widget}
                                    onDelete={handleDeleteWidget}
                                    onEdit={handleEditWidget}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Widget Builder Dialog */}
            <WidgetBuilder
                open={isBuilderOpen}
                onOpenChange={setIsBuilderOpen}
                onSave={handleSaveWidget}
                initialConfig={editingWidget}
            />

            {/* Dashboard Manager Dialog */}
            <DashboardManager
                open={isManagerOpen}
                onOpenChange={setIsManagerOpen}
                onDashboardCreated={handleDashboardAction}
                mode={managerMode}
                currentDashboard={managingDashboard}
            />
        </div>
    );
}
