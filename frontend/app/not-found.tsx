"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, BarChart3, Database, Search } from "lucide-react";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            <Card className="max-w-2xl w-full border-2 border-primary/20 shadow-2xl">
                <CardContent className="pt-12 pb-12 px-8">
                    <div className="text-center space-y-6">
                        {/* Animated 404 Icon */}
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 blur-3xl opacity-20 animate-pulse"></div>
                            <div className="relative flex items-center justify-center gap-2">
                                <BarChart3 className="h-16 w-16 text-primary/30" />
                                <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    404
                                </h1>
                                <Database className="h-16 w-16 text-primary/30" />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-foreground">
                                Página No Encontrada
                            </h2>
                            <p className="text-muted-foreground text-lg max-w-md mx-auto">
                                Lo sentimos, la página que buscas no existe en nuestro dashboard de BI.
                            </p>
                        </div>

                        {/* Decorative Element */}
                        <div className="flex items-center justify-center gap-3 text-muted-foreground py-4">
                            <div className="h-px w-16 bg-gradient-to-r from-transparent to-border"></div>
                            <Search className="h-5 w-5 opacity-50" />
                            <div className="h-px w-16 bg-gradient-to-l from-transparent to-border"></div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <Button
                                onClick={() => router.back()}
                                variant="outline"
                                className="gap-2 hover:bg-accent transition-all"
                                size="lg"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Volver Atrás
                            </Button>
                            <Link href="/dashboard">
                                <Button
                                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all w-full sm:w-auto"
                                    size="lg"
                                >
                                    <Home className="h-4 w-4" />
                                    Ir al Dashboard
                                </Button>
                            </Link>
                        </div>

                        {/* Helper Links */}
                        <div className="pt-8 border-t border-border/50">
                            <p className="text-sm text-muted-foreground mb-3">
                                Enlaces útiles:
                            </p>
                            <div className="flex flex-wrap justify-center gap-4 text-sm">
                                <Link href="/dashboard" className="text-primary hover:underline transition-all">
                                    Dashboard Principal
                                </Link>
                                <Link href="/dashboard/datasets" className="text-primary hover:underline transition-all">
                                    Datasets
                                </Link>
                                <Link href="/dashboard/query" className="text-primary hover:underline transition-all">
                                    Consultas SQL
                                </Link>
                                <Link href="/dashboard/transformations" className="text-primary hover:underline transition-all">
                                    Transformaciones
                                </Link>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
