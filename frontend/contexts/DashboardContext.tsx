"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { dashboardService } from "@/services/dashboard";

interface Dashboard {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
    items: any[];
}

interface DashboardContextType {
    dashboards: Dashboard[];
    currentDashboardId: string | null;
    currentDashboard: Dashboard | null;
    isLoading: boolean;
    setCurrentDashboardId: (id: string) => void;
    refreshDashboards: () => Promise<void>;
    addDashboard: (dashboard: Dashboard) => void;
    updateDashboard: (dashboard: Dashboard) => void;
    removeDashboard: (dashboardId: string) => void;
    getDatasetsUsedByCurrentDashboard: () => string[];
    updateCurrentDashboardItems: (items: any[]) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const STORAGE_KEY = "bi-dashboard-current-id";

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [currentDashboardId, setCurrentDashboardIdState] = useState<string | null>(null);
    const [currentDashboardFull, setCurrentDashboardFull] = useState<Dashboard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasInitialized = useRef(false);
    const skipNextFetch = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        loadDashboards();
    }, []);

    const loadDashboards = async () => {
        try {
            setIsLoading(true);
            const dashboardList = await dashboardService.list();

            if (dashboardList.length === 0) {
                const defaultDashboard = await dashboardService.create("Mi Dashboard", "Tablero principal");
                setDashboards([defaultDashboard]);
                setCurrentDashboardIdState(defaultDashboard.id);
                setCurrentDashboardFull(defaultDashboard);
                localStorage.setItem(STORAGE_KEY, defaultDashboard.id);
            } else {
                setDashboards(dashboardList);

                const savedId = localStorage.getItem(STORAGE_KEY);
                const dashboardExists = dashboardList.find(d => d.id === savedId);

                let selectedId: string;
                if (savedId && dashboardExists) {
                    selectedId = savedId;
                } else {
                    selectedId = dashboardList[0].id;
                    localStorage.setItem(STORAGE_KEY, selectedId);
                }

                try {
                    const fullDashboard = await dashboardService.get(selectedId);
                    setCurrentDashboardFull(fullDashboard);

                    skipNextFetch.current = true;
                    setCurrentDashboardIdState(selectedId);
                } catch (error) {
                    console.error("Error loading dashboard details:", error);
                    setCurrentDashboardIdState(selectedId);
                }
            }
        } catch (error) {
            console.error("Error loading dashboards:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!currentDashboardId) return;

        if (skipNextFetch.current) {
            skipNextFetch.current = false;
            return;
        }

        const loadCurrentDashboardDetails = async () => {
            try {
                const fullDashboard = await dashboardService.get(currentDashboardId);
                setCurrentDashboardFull(fullDashboard);

                setDashboards(prev =>
                    prev.map(d => d.id === currentDashboardId ? fullDashboard : d)
                );
            } catch (error) {
                console.error("Error loading dashboard details:", error);
            }
        };

        loadCurrentDashboardDetails();
    }, [currentDashboardId]);

    const setCurrentDashboardId = useCallback((id: string) => {
        setCurrentDashboardIdState(id);
        localStorage.setItem(STORAGE_KEY, id);
    }, []);

    const refreshDashboards = useCallback(async () => {
        await loadDashboards();
    }, []);

    const addDashboard = useCallback((dashboard: Dashboard) => {
        setDashboards(prev => [...prev, dashboard]);
    }, []);

    const updateDashboard = useCallback((dashboard: Dashboard) => {
        setDashboards(prev => prev.map(d => d.id === dashboard.id ? dashboard : d));
        if (currentDashboardId === dashboard.id) {
            setCurrentDashboardFull(dashboard);
        }
    }, [currentDashboardId]);

    const removeDashboard = useCallback((dashboardId: string) => {
        setDashboards(prev => {
            const updated = prev.filter(d => d.id !== dashboardId);

            if (dashboardId === currentDashboardId && updated.length > 0) {
                setCurrentDashboardId(updated[0].id);
            }

            return updated;
        });
    }, [currentDashboardId, setCurrentDashboardId]);

    const updateCurrentDashboardItems = useCallback((items: any[]) => {
        if (!currentDashboardFull) return;

        const updatedDashboard = {
            ...currentDashboardFull,
            items: items.map(item => ({
                id: item.id || Math.random().toString(36).substr(2, 9),
                type: item.type,
                title: item.title,
                config: item
            }))
        };

        setCurrentDashboardFull(updatedDashboard);
        setDashboards(prev =>
            prev.map(d => d.id === currentDashboardFull.id ? updatedDashboard : d)
        );
    }, [currentDashboardFull]);

    const getDatasetsUsedByCurrentDashboard = useCallback(() => {
        if (!currentDashboardFull || !currentDashboardFull.items) return [];

        const datasets = new Set<string>();
        currentDashboardFull.items.forEach(item => {
            if (item.config && item.config.dataset) {
                datasets.add(item.config.dataset);
            }
        });

        return Array.from(datasets);
    }, [currentDashboardFull]);

    const currentDashboard = currentDashboardFull || dashboards.find(d => d.id === currentDashboardId) || null;

    const value: DashboardContextType = {
        dashboards,
        currentDashboardId,
        currentDashboard,
        isLoading,
        setCurrentDashboardId,
        refreshDashboards,
        addDashboard,
        updateDashboard,
        removeDashboard,
        getDatasetsUsedByCurrentDashboard,
        updateCurrentDashboardItems,
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }
    return context;
}
