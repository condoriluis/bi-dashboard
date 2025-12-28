"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Loader2,
    FileType,
    Upload,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    FileSpreadsheet,
    Zap,
    FileJson,
    FileCode,
    Database,
    HardDrive,
    X,
    File
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ConverterPage() {
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const supportedFormats = [
        { ext: "csv", label: "CSV", icon: FileSpreadsheet, color: "text-green-500 bg-green-500/10 border-green-200 dark:border-green-800" },
        { ext: "json", label: "JSON", icon: FileJson, color: "text-yellow-500 bg-yellow-500/10 border-yellow-200 dark:border-yellow-800" },
        { ext: "xlsx", label: "Excel", icon: FileCode, color: "text-blue-500 bg-blue-500/10 border-blue-200 dark:border-blue-800" },
        { ext: "avro", label: "Avro", icon: Database, color: "text-purple-500 bg-purple-500/10 border-purple-200 dark:border-purple-800" },
        { ext: "orc", label: "ORC", icon: Database, color: "text-red-500 bg-red-500/10 border-red-200 dark:border-red-800" },
    ];

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (selectedFile: File) => {
        setFile(selectedFile);
        setError("");
        setResult(null);
    };

    const removeFile = () => {
        setFile(null);
        setResult(null);
        setError("");
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const handleConvert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setError("");
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/datasets/convert", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Error al convertir el archivo. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
                <div className="space-y-1.5">
                    <h1 className="text-4xl font-bold">
                        Convertidor de Datos
                    </h1>
                    <p className="text-muted-foreground">
                        Transforma tus archivos CSV, Excel y JSON a formato Parquet de alto rendimiento para análisis Big Data.
                    </p>
                </div>
                <div className="flex -space-x-2">
                    {supportedFormats.map((f, i) => (
                        <div key={i} className={cn(
                            "w-8 h-8 rounded-full border-2 border-background flex items-center justify-center bg-muted shadow-sm z-0 relative hover:z-10 transition-transform hover:scale-110",
                            f.color.split(' ')[0], // text color
                            f.color.split(' ')[1]  // bg color
                        )} title={f.label}>
                            <f.icon className="h-4 w-4" />
                        </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground z-10 pl-1">
                        +2
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Converter Area */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom duration-500">
                        <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Zona de Conversión</CardTitle>
                                    <CardDescription>Sube tu archivo para procesarlo automáticamente</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8">
                            <form onSubmit={handleConvert} className="space-y-6">
                                {/* Drag & Drop Area */}
                                {!file ? (
                                    <div
                                        className={cn(
                                            "relative group cursor-pointer flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out",
                                            dragActive
                                                ? "border-primary bg-primary/5 scale-[0.99]"
                                                : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
                                        )}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => inputRef.current?.click()}
                                    >
                                        <input
                                            ref={inputRef}
                                            type="file"
                                            className="hidden"
                                            accept=".csv,.json,.xlsx,.xls,.avro,.orc"
                                            onChange={handleChange}
                                        />

                                        <div className="flex flex-col items-center space-y-4 text-center p-4">
                                            <div className={cn(
                                                "h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300",
                                                dragActive ? "bg-primary text-primary-foreground shadow-lg scale-110" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                            )}>
                                                <Upload className="h-8 w-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-semibold text-lg text-foreground">
                                                    Arrastra tu archivo aquí
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    o haz clic para explorar tus carpetas
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs bg-background/50">CSV</Badge>
                                                <Badge variant="outline" className="text-xs bg-background/50">Excel</Badge>
                                                <Badge variant="outline" className="text-xs bg-background/50">JSON</Badge>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Selected File State */
                                    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 p-4 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                                                <File className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground truncate pr-6">
                                                    {file.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-xs font-normal">
                                                        {formatBytes(file.size)}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground uppercase">
                                                        {file.name.split('.').pop()}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={removeFile}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                type="button"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Action Button */}
                                <Button
                                    type="submit"
                                    disabled={loading || !file}
                                    className={cn(
                                        "w-full h-11 text-base font-medium transition-all duration-300 dark:text-white",
                                        loading ? "opacity-80 cursor-not-allowed" : "hover:shadow-lg hover:translate-y-[-2px]"
                                    )}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Procesando Archivo...
                                        </>
                                    ) : (
                                        <>
                                            Convertir a Parquet
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Error Feedback */}
                    {error && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                            <Card className="border-destructive/30 bg-destructive/5 overflow-hidden">
                                <div className="p-4 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                                    <div className="space-y-1">
                                        <h4 className="font-medium text-destructive">Error en la conversión</h4>
                                        <p className="text-sm text-destructive/80">{error}</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Success Feedback */}
                    {result && (
                        <div className="animate-in slide-in-from-bottom-2 duration-500">
                            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 overflow-visible relative">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-emerald-500/10 rounded-full blur-2xl" />

                                <CardContent className="p-6 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                                            <CheckCircle2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg text-emerald-900 dark:text-emerald-100">
                                                ¡Conversión Exitosa!
                                            </h3>
                                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                                Tu archivo ha sido optimizado correctamente.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-white/60 dark:bg-black/20 border border-emerald-100 dark:border-emerald-900/50">
                                            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Original</p>
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold truncate" title={result.original_file}>
                                                    {result.original_file}
                                                </span>
                                                <span className="text-sm font-mono text-muted-foreground">{formatBytes(result.original_size)}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-emerald-100/40 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1 uppercase tracking-wider">Optimizado (Parquet)</p>
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-emerald-900 dark:text-emerald-100 truncate" title={result.parquet_file}>
                                                    {result.parquet_file}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-mono font-medium text-emerald-700 dark:text-emerald-300">{formatBytes(result.parquet_size)}</span>
                                                    <Badge className="bg-emerald-500 hover:bg-emerald-600 border-0 text-[10px] h-5 px-1.5">
                                                        -{result.size_reduction_percent}%
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/40 dark:bg-black/20 p-3 rounded-lg border border-transparent dark:border-white/5">
                                        <HardDrive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        <span>Guardado en: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground">backend/uploads</span></span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom duration-500 delay-100">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                <FileType className="h-4 w-4 text-primary" />
                                Formatos Soportados
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                {supportedFormats.map((format) => (
                                    <div key={format.ext} className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 hover:opacity-100 opacity-90",
                                        format.color
                                    )}>
                                        <div className="h-8 w-8 rounded-lg bg-background/50 flex items-center justify-center shadow-sm">
                                            <format.icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm leading-none">{format.label}</p>
                                            <p className="text-[11px] opacity-70 mt-1 font-mono uppercase">.{format.ext}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
