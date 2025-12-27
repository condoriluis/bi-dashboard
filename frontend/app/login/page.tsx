"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const formData = new FormData();
            formData.append("username", email);
            formData.append("password", password);

            const res = await api.post("/auth/login", formData, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });

            await login(res.data.access_token);
        } catch (err: any) {
            console.log(err);
            if (err.response) {
                setError(err.response.data.detail || "Login failed");
            } else {
                setError("Login failed. Check console or if backend is running.");
            }
        }
    };

    return (
        <div className="w-full h-screen grid lg:grid-cols-2">
            {/* Left Panel - Visual & Branding */}
            <div className="hidden lg:flex relative flex-col justify-between bg-zinc-900 p-10 text-white overflow-hidden">
                {/* Abstract Background Pattern */}
                <div className="absolute inset-0 z-0">
                    <svg className="absolute inset-0 h-full w-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="currentColor" strokeWidth="2" fill="none" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
                        {/* Dynamic Circles */}
                        <circle cx="10%" cy="20%" r="200" fill="currentColor" fillOpacity="0.1" />
                        <circle cx="80%" cy="80%" r="300" fill="currentColor" fillOpacity="0.05" />
                    </svg>
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-zinc-900/50" />
                </div>

                {/* Logo Area */}
                <div className="relative z-10 flex items-center text-lg font-medium tracking-tight">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center mr-2 shadow-lg shadow-blue-900/20">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5 text-white"
                        >
                            <rect width="7" height="9" x="3" y="12" rx="1" />
                            <rect width="7" height="5" x="14" y="16" rx="1" />
                            <path d="M3 12h18" />
                            <path d="M3 21h18" />
                            <path d="M3 7h18" />
                            <path d="M14 2h4a2 2 0 0 1 2 2v3" />
                            <path d="M3 7V5a2 2 0 0 1 2-2h4" />
                        </svg>
                    </div>
                    BI Dashboard
                </div>

                {/* Hero Text */}
                <div className="relative z-10 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-xl font-medium leading-relaxed">
                            "La inteligencia de datos que tu negocio necesita para crecer. Visualiza, analiza y decide con confianza."
                        </p>
                        <footer className="text-sm text-zinc-400">Platforma v2.0 Enterprise</footer>
                    </blockquote>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex items-center justify-center relative bg-background">
                <div className="absolute top-4 right-4 md:top-8 md:right-8">
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-[400px] px-8 py-6 space-y-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight">Bienvenido de nuevo</h1>
                        <p className="text-sm text-muted-foreground">
                            Ingresa tus credenciales para acceder al sistema
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Corporativo</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nombre@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Contraseña</Label>
                                <a href="#" className="text-xs font-medium text-primary hover:underline underline-offset-4">
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium animate-in fade-in-50">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                            Iniciar Sesión
                        </Button>
                    </form>

                    <div className="text-center text-sm text-muted-foreground">
                        ¿No tienes una cuenta?{" "}
                        <a href="#" className="underline underline-offset-4 hover:text-primary">
                            Contactar Soporte
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
