"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useDashboard } from "@/contexts/DashboardContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, Code2, Sparkles, Database } from "lucide-react";

interface TableCreationDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function TableCreationDialog({ open, onClose }: TableCreationDialogProps) {
    const { currentDashboard } = useDashboard();
    const queryClient = useQueryClient();

    const [sqlQuery, setSqlQuery] = useState("");
    const [sqlTableName, setSqlTableName] = useState("");

    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState("");

    const resetFeedback = () => {
        setUploadSuccess(false);
        setUploadError("");
    };

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["datasets"] });
        setUploadSuccess(true);
        setTimeout(() => {
            setUploadSuccess(false);
            onClose();

            setSqlQuery("");
            setSqlTableName("");
        }, 1500);
    };

    const handleError = (error: any) => {
        console.error(error);
        setUploadError(error.response?.data?.detail || "Error en la operación");
    };

    const handleSqlCreation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sqlQuery || !sqlTableName) return;

        setUploading(true);
        resetFeedback();

        try {
            await api.post("/datasets/create-from-sql", {
                sql_query: sqlQuery,
                table_name: sqlTableName,
                dashboard_id: currentDashboard?.id
            });
            handleSuccess();
        } catch (error: any) {
            handleError(error);
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        Nueva Tabla desde SQL
                    </DialogTitle>
                    <DialogDescription>
                        Materializa los resultados de una consulta SQL en una nueva tabla física.
                        Esto es ideal para mejorar el rendimiento de consultas complejas.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    <form onSubmit={handleSqlCreation} className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-800 dark:text-blue-300 mb-2">
                                <Sparkles className="h-4 w-4" />
                                ¿Cómo funciona?
                            </h4>
                            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                                El sistema ejecutará una operación <code className="font-semibold bg-white dark:bg-black/20 px-1 py-0.5 rounded border border-blue-100 dark:border-blue-800">CREATE TABLE AS SELECT ...</code>.
                                <br />
                                La tabla resultante será estática y persistente (tipo Parquet), no una vista dinámica.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tableName">Nombre de la Nueva Tabla</Label>
                            <div className="relative">
                                <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="tableName"
                                    placeholder="ej: resumen_ventas_2024"
                                    value={sqlTableName}
                                    onChange={(e) => {
                                        const val = e.target.value
                                            .toLowerCase()
                                            .replace(/\s+/g, '_')
                                            .replace(/^[0-9]+/, '')
                                            .replace(/[^a-z0-9_]/g, '');
                                        setSqlTableName(val);
                                    }}
                                    required
                                    className="pl-9 font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="query">Consulta SQL (SELECT)</Label>
                            <Textarea
                                id="query"
                                placeholder="SELECT categoria, SUM(total) as ventas FROM raw_ventas GROUP BY categoria"
                                value={sqlQuery}
                                onChange={(e) => setSqlQuery(e.target.value)}
                                required
                                className="font-mono min-h-[180px] text-sm resize-none bg-muted/30 focus:bg-background transition-colors"
                            />
                        </div>

                        <Button
                            disabled={uploading || uploadSuccess || !sqlQuery || !sqlTableName}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 dark:text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 transform hover:scale-[1.01]"
                        >
                            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code2 className="mr-2 h-4 w-4" />}
                            {uploading ? "Creando Tabla..." : "Crear Tabla"}
                        </Button>
                    </form>

                    {/* Feedback Messages */}
                    {uploadSuccess && (
                        <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 animate-in slide-in-from-top duration-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                ¡Tabla creada exitosamente!
                            </p>
                        </div>
                    )}

                    {uploadError && (
                        <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 animate-in slide-in-from-top duration-300">
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                {uploadError}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
