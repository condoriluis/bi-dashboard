"use client";

import { Github, Mail, FileText } from "lucide-react";
import Link from "next/link";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-border/40 bg-background mt-auto">
            <div className="w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand Section */}
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-md">
                                <span className="text-white font-bold text-sm">BI</span>
                            </div>
                            <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                BI Dashboard
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Plataforma de análisis de datos inteligente y moderna.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm">Enlaces Rápidos</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link
                                    href="https://duckdb.org/"
                                    target="_blank"
                                    className="hover:text-primary transition-colors inline-flex items-center space-x-2"
                                >
                                    <FileText className="h-3 w-3" />
                                    <span>Documentación</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/dashboard"
                                    className="hover:text-primary transition-colors inline-flex items-center space-x-2"
                                >
                                    <Mail className="h-3 w-3" />
                                    <span>Soporte</span>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href="/dashboard"
                                    className="hover:text-primary transition-colors inline-flex items-center space-x-2"
                                >
                                    <Github className="h-3 w-3" />
                                    <span>GitHub</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Info Section */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm">Información</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>Versión: 1.0.0</p>
                            <p>Última actualización: {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 pt-6 border-t border-border/40 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <p className="text-sm text-muted-foreground">
                        © {currentYear} BI Dashboard. Todos los derechos reservados.
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center space-x-1">
                        <span>Desarrollado para análisis de datos</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
