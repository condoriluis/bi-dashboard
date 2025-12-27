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
    Workflow
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useState } from "react";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";

export default function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, "");

    const navItems = [
        { href: "/dashboard", label: "Vista General", icon: LayoutDashboard },
        { href: "/dashboard/datasets", label: "Datasets", icon: Database },
        { href: "/dashboard/transformations", label: "Transformaciones", icon: Workflow },
        { href: "/dashboard/query", label: "Consulta SQL", icon: Terminal },
        { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/dashboard/converter", label: "Convertidor", icon: FileInput },
        { href: `${baseUrl}/docs`, label: "Referencia API", icon: BookOpen, external: true },
    ];

    const NavLink = ({ item, mobile = false }: { item: any, mobile?: boolean }) => {
        const isActive = pathname === item.href;

        const content = (
            <Link
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={() => mobile && setOpen(false)}
                className={cn(
                    "flex items-center space-x-2 transition-all duration-200",
                    mobile
                        ? "px-4 py-3 rounded-lg text-sm"
                        : "lg:px-3 xl:px-4 py-2 rounded-lg text-sm",
                    isActive
                        ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-primary font-semibold border border-primary/20"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
            >
                <item.icon className={cn("flex-shrink-0", mobile ? "h-5 w-5" : "h-5 w-5 lg:h-5 lg:w-5")} />
                <span className={mobile ? "" : "hidden xl:inline"}>{item.label}</span>
            </Link>
        );

        if (mobile) {
            return content;
        }

        return (
            <SimpleTooltip content={item.label} side="bottom">
                {content}
            </SimpleTooltip>
        );
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
                {/* Logo y Branding */}
                <div className="flex items-center space-x-3">
                    <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-in zoom-in duration-300">
                        <LayoutDashboard className="h-5 w-5 text-white" />
                    </div>
                    <div className="hidden xl:block">
                        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                            BI Dashboard
                        </span>
                        <p className="text-xs text-muted-foreground">Análisis Inteligente</p>
                    </div>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-1 font-medium flex-1 justify-center">
                    {navItems.map((item) => (
                        <NavLink key={item.href} item={item} />
                    ))}
                </nav>

                {/* User Info & Actions */}
                <div className="flex items-center space-x-4">
                    <ThemeToggle />

                    {/* Desktop User Info */}
                    <div className="hidden xl:block text-sm text-right">
                        <p className="font-medium leading-none">{user?.full_name || "Usuario"}</p>
                        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
                    </div>

                    {/* Desktop Logout */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={logout}
                        className="hidden lg:flex text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>

                    {/* Mobile Menu Trigger (Sheet) */}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="lg:hidden">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0 flex flex-col">
                            <SheetHeader className="p-6 border-b">
                                <div className="flex items-center space-x-3">
                                    <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-md">
                                        <LayoutDashboard className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <SheetTitle className="text-lg font-bold">BI Dashboard</SheetTitle>
                                        <SheetDescription className="text-xs">Menú Principal</SheetDescription>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                                {navItems.map((item) => (
                                    <NavLink key={item.href} item={item} mobile />
                                ))}
                            </div>

                            <div className="p-4 border-t bg-muted/20">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {user?.full_name?.charAt(0) || "U"}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{user?.full_name || "Usuario"}</p>
                                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        setOpen(false);
                                        logout();
                                    }}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Cerrar Sesión
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
