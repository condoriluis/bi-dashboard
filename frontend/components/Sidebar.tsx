"use client";

import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Database,
    Terminal,
    LogOut,
    FileInput,
    Menu,
    BarChart3,
    BookOpen,
    Workflow,
    User,
    X,
    Moon,
    Sun,
    Maximize2,
    Minimize2,
    Brain,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";

export default function Sidebar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-fullscreen');
        if (saved === 'true') {
            setIsFullscreen(true);
        }
    }, []);

    const toggleFullscreen = () => {
        const newState = !isFullscreen;
        setIsFullscreen(newState);
        localStorage.setItem('sidebar-fullscreen', String(newState));

        window.dispatchEvent(new CustomEvent('sidebar-fullscreen-change', {
            detail: { isFullscreen: newState }
        }));
    };

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, "");

    const navItems = [
        { href: "/dashboard", label: "General", icon: LayoutDashboard },
        { href: "/dashboard/datasets", label: "Datasets", icon: Database },
        { href: "/dashboard/transformations", label: "Transformaciones", icon: Workflow },
        { href: "/dashboard/query", label: "SQL", icon: Terminal },
        { href: "/dashboard/ai", label: "IA Predictiva", icon: Brain },
        { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/dashboard/converter", label: "Convertidor", icon: FileInput },
        { href: `${baseUrl}/docs`, label: "API", icon: BookOpen, external: true },
    ];

    const NavLink = ({ item, mobile = false }: { item: any, mobile?: boolean }) => {
        const isActive = pathname === item.href;

        const content = (
            <Link
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={() => mobile && setIsMobileOpen(false)}
                className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group/item relative overflow-hidden",
                    isActive
                        ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-primary font-semibold border border-primary/30 shadow-sm shadow-primary/10"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:border hover:border-border/50"
                )}
            >
                <item.icon className="h-5 w-5 flex-shrink-0 relative z-10" />
                <span className={cn(
                    "whitespace-nowrap transition-all duration-300 relative z-10",
                    mobile ? "opacity-100" : isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                )}>
                    {item.label}
                </span>
                {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                )}
            </Link>
        );

        if (mobile || isExpanded) {
            return content;
        }

        return (
            <SimpleTooltip content={item.label} side="right">
                {content}
            </SimpleTooltip>
        );
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-4 left-4 z-50 lg:hidden bg-background/90 backdrop-blur-md border border-border shadow-lg hover:shadow-xl transition-all duration-200"
            >
                <Menu className="h-5 w-5" />
            </Button>

            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Floating Restore Button - Shows when sidebar is hidden in fullscreen */}
            {isFullscreen && (
                <Button
                    onClick={toggleFullscreen}
                    size="icon"
                    className={cn(
                        "hidden lg:flex fixed bottom-6 left-6 z-50",
                        "h-12 w-12 rounded-full shadow-2xl",
                        "bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
                        "text-white border-2 border-white/20",
                        "animate-in slide-in-from-left duration-300",
                        "hover:scale-110 transition-transform"
                    )}
                >
                    <Minimize2 className="h-5 w-5" />
                </Button>
            )}

            {/* Sidebar - Desktop */}
            <aside
                onMouseEnter={() => !isFullscreen && setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
                className={cn(
                    "hidden lg:flex fixed left-0 top-0 h-screen z-30",
                    "flex-col",
                    "bg-background/98 dark:bg-background/95 backdrop-blur-xl",
                    "border-r-2 border-border/60 dark:border-border/80",
                    "shadow-2xl shadow-black/10 dark:shadow-black/30",
                    "transition-all duration-300 ease-in-out",
                    isExpanded ? "w-72" : "w-16",
                    "before:absolute before:inset-0 before:bg-gradient-to-b before:from-blue-500/5 before:via-transparent before:to-purple-500/5 before:pointer-events-none before:opacity-50",
                    // Fullscreen mode: hide sidebar
                    isFullscreen && "-translate-x-full"
                )}
            >
                {/* Logo Section */}
                <div className="p-4 border-b-2 border-border/60 dark:border-border/80 relative">
                    <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/40 flex-shrink-0 animate-in zoom-in duration-300">
                            <LayoutDashboard className="h-4 w-4 text-white" />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-400 to-purple-400 blur-md opacity-50 -z-10" />
                        </div>
                        <div className={cn(
                            "transition-all duration-300 overflow-hidden",
                            isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
                        )}>
                            <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                                BI Dashboard
                            </span>
                            <p className="text-[10px] text-muted-foreground whitespace-nowrap">Análisis Inteligente</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {navItems.map((item, index) => (
                        <div
                            key={item.href}
                            className="animate-in slide-in-from-left duration-300"
                            style={{ animationDelay: `${index * 30}ms` }}
                        >
                            <NavLink item={item} />
                        </div>
                    ))}
                </nav>

                {/* Bottom Actions */}
                <div className="p-3 border-t-2 border-border/60 dark:border-border/80 space-y-2 bg-muted/20 dark:bg-muted/10">
                    {/* Fullscreen Toggle */}
                    <SimpleTooltip content={isExpanded ? "" : isFullscreen ? "Mostrar Sidebar" : "Pantalla Completa"} side="right">
                        <button
                            onClick={toggleFullscreen}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden group",
                                "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:border hover:border-border/50"
                            )}
                        >
                            <div className="relative h-5 w-5 flex-shrink-0">
                                <Maximize2 className={cn(
                                    "h-5 w-5 absolute transition-all duration-300 text-emerald-500",
                                    isFullscreen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                                )} />
                                <Minimize2 className={cn(
                                    "h-5 w-5 absolute transition-all duration-300 text-emerald-500",
                                    isFullscreen ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
                                )} />
                            </div>
                            <span className={cn(
                                "text-sm whitespace-nowrap transition-all duration-300",
                                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                            )}>
                                {isFullscreen ? "Mostrar Sidebar" : "Pantalla Completa"}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                    </SimpleTooltip>

                    {/* Theme Toggle */}
                    <SimpleTooltip content={isExpanded ? "" : theme === "dark" ? "Modo Claro" : "Modo Oscuro"} side="right">
                        <button
                            onClick={toggleTheme}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden group",
                                "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:border hover:border-border/50"
                            )}
                        >
                            <div className="relative h-5 w-5 flex-shrink-0">
                                <Sun className="h-5 w-5 absolute rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
                                <Moon className="h-5 w-5 absolute rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-blue-400" />
                            </div>
                            <span className={cn(
                                "text-sm whitespace-nowrap transition-all duration-300",
                                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                            )}>
                                {theme === "dark" ? "Modo Oscuro" : "Modo Claro"}
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                    </SimpleTooltip>

                    {/* User Profile */}
                    <Dialog>
                        <SimpleTooltip content={isExpanded ? "" : "Perfil"} side="right">
                            <DialogTrigger asChild>
                                <button className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden group",
                                    "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm hover:border hover:border-border/50"
                                )}>
                                    <User className="h-5 w-5 flex-shrink-0" />
                                    <span className={cn(
                                        "text-sm whitespace-nowrap transition-all duration-300 truncate",
                                        isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                                    )}>
                                        {user?.full_name || "Usuario"}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </button>
                            </DialogTrigger>
                        </SimpleTooltip>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Perfil de Usuario</DialogTitle>
                                <DialogDescription>
                                    Información de tu cuenta actual.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg relative">
                                    {user?.full_name?.charAt(0) || "U"}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 blur-lg opacity-50 -z-10" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-semibold text-xl">{user?.full_name || "Usuario"}</h3>
                                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                                </div>
                                <div className="w-full pt-4 border-t mt-2">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Rol</p>
                                            <p className="font-medium">Administrador</p>
                                        </div>
                                        <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Estado</p>
                                            <p className="font-medium text-green-500">Activo</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Logout */}
                    <SimpleTooltip content={isExpanded ? "" : "Cerrar Sesión"} side="right">
                        <Button
                            variant="ghost"
                            onClick={logout}
                            className={cn(
                                "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 relative overflow-hidden group border border-transparent hover:border-destructive/30"
                            )}
                        >
                            <LogOut className="h-5 w-5 flex-shrink-0" />
                            <span className={cn(
                                "text-sm whitespace-nowrap transition-all duration-300",
                                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                            )}>
                                Cerrar Sesión
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Button>
                    </SimpleTooltip>
                </div>
            </aside>

            {/* Sidebar - Mobile */}
            <aside
                className={cn(
                    "lg:hidden fixed left-0 top-0 h-screen z-50 w-72",
                    "flex flex-col bg-background border-r-2 border-border/80 dark:border-border shadow-2xl",
                    "transition-transform duration-300 ease-in-out",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Mobile Header */}
                <div className="p-4 border-b-2 border-border/80 dark:border-border flex items-center justify-between bg-muted/20 dark:bg-muted/10">
                    <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg">
                            <LayoutDashboard className="h-4 w-4 text-white" />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-400 to-purple-400 blur-md opacity-50 -z-10" />
                        </div>
                        <div>
                            <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                BI Dashboard
                            </span>
                            <p className="text-[10px] text-muted-foreground">Análisis Inteligente</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMobileOpen(false)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Mobile Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink key={item.href} item={item} mobile />
                    ))}
                </nav>

                {/* Mobile Bottom Actions */}
                <div className="p-4 border-t-2 border-border/80 dark:border-border space-y-3 bg-muted/20 dark:bg-muted/10">
                    {/* User Info */}
                    <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border/50">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 relative">
                            {user?.full_name?.charAt(0) || "U"}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 blur-md opacity-50 -z-10" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{user?.full_name || "Usuario"}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border/50"
                    >
                        <span className="text-sm text-muted-foreground">{theme === "dark" ? "Modo Oscuro" : "Modo Claro"}</span>
                        <div className="relative h-5 w-5">
                            <Sun className="h-5 w-5 absolute rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
                            <Moon className="h-5 w-5 absolute rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-blue-400" />
                        </div>
                    </button>

                    {/* Logout Button */}
                    <Button
                        variant="destructive"
                        className="w-full justify-start gap-2 shadow-sm"
                        onClick={() => {
                            setIsMobileOpen(false);
                            logout();
                        }}
                    >
                        <LogOut className="h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                </div>
            </aside>
        </>
    );
}
