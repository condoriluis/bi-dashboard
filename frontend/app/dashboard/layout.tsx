"use client";

import { useAuth } from "@/features/auth/auth-context";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        const handleFullscreenChange = (e: CustomEvent) => {
            setIsFullscreen(e.detail.isFullscreen);
        };

        const saved = localStorage.getItem('sidebar-fullscreen');
        if (saved === 'true') {
            setIsFullscreen(true);
        }

        window.addEventListener('sidebar-fullscreen-change', handleFullscreenChange as EventListener);
        return () => {
            window.removeEventListener('sidebar-fullscreen-change', handleFullscreenChange as EventListener);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-zinc-950 dark:via-blue-950/20 dark:to-purple-950/20">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-zinc-950 dark:via-blue-950/20 dark:to-purple-950/20">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground animate-pulse">Redirigiendo...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardProvider>
            <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-zinc-950 dark:via-blue-950/10 dark:to-purple-950/10">
                <Sidebar />
                <div className={cn(
                    "flex-1 flex flex-col transition-all duration-300",
                    isFullscreen ? "lg:ml-0" : "lg:ml-16"
                )}>
                    <main className="flex-1 w-full max-w-8xl mx-auto px-4 sm:px-4 lg:px-4 py-3 pb-32 animate-in fade-in-50 duration-500">
                        {children}
                    </main>
                    <Footer />
                </div>
            </div>
        </DashboardProvider>
    );
}
