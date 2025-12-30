"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Play, Terminal, AlertCircle, CheckCircle2, Code2, Clock, Database, Copy, Download, Wand2, ChevronLeft, ChevronRight, Search, Eraser, Shield, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QUICK_COMMANDS = [
    // Lectura - Básico
    { label: "SELECT *", value: "SELECT * FROM ", mode: "read", group: "basic" },
    { label: "LIMIT", value: "LIMIT 100", mode: "read", group: "basic" },
    { label: "DISTINCT", value: "DISTINCT ", mode: "read", group: "basic" },
    { label: "SHOW TABLES", value: "SHOW TABLES", mode: "read", group: "basic" },
    { label: "DESCRIBE", value: "DESCRIBE ", mode: "read", group: "basic" },

    // Lectura - Filtrado
    { label: "WHERE", value: "WHERE ", mode: "read", group: "filter" },
    { label: "ORDER BY", value: "ORDER BY ", mode: "read", group: "filter" },
    { label: "LIKE", value: "LIKE '%patron%' ", mode: "read", group: "filter" },
    { label: "BETWEEN", value: "BETWEEN val1 AND val2 ", mode: "read", group: "filter" },
    { label: "IN", value: "IN (val1, val2) ", mode: "read", group: "filter" },

    // Lectura - Agregación
    { label: "COUNT", value: "COUNT(*) ", mode: "read", group: "agg" },
    { label: "SUM", value: "SUM() ", mode: "read", group: "agg" },
    { label: "AVG", value: "AVG() ", mode: "read", group: "agg" },
    { label: "MIN", value: "MIN() ", mode: "read", group: "agg" },
    { label: "MAX", value: "MAX() ", mode: "read", group: "agg" },
    { label: "GROUP BY", value: "GROUP BY ", mode: "read", group: "agg" },
    { label: "HAVING", value: "HAVING ", mode: "read", group: "agg" },

    // Lectura - Joins
    { label: "LEFT JOIN", value: "LEFT JOIN tabla ON ", mode: "read", group: "join" },
    { label: "INNER JOIN", value: "INNER JOIN tabla ON ", mode: "read", group: "join" },

    // Lectura - Funciones Tiempo
    { label: "DATE_TRUNC", value: "date_trunc('month', fecha) ", mode: "read", group: "func" },
    { label: "TODAY", value: "today() ", mode: "read", group: "func" },

    // Escritura / Admin (Avanzado)
    { label: "CREATE TABLE", value: "CREATE TABLE nombre_tabla (id INTEGER, nombre VARCHAR);", mode: "write", group: "admin" },
    { label: "DROP TABLE", value: "DROP TABLE IF EXISTS nombre_tabla;", mode: "write", group: "admin" },
    { label: "CREATE VIEW", value: "CREATE VIEW nombre_vista AS \nSELECT ...", mode: "write", group: "admin" },
    { label: "DROP VIEW", value: "DROP VIEW IF EXISTS nombre_vista", mode: "write", group: "admin" },
    { label: "INSERT", value: "INSERT INTO tabla (col1, col2) VALUES (val1, val2);", mode: "write", group: "write" },
    { label: "UPDATE", value: "UPDATE tabla SET col = val WHERE cond;", mode: "write", group: "write" },
    { label: "DELETE", value: "DELETE FROM tabla WHERE cond;", mode: "write", group: "write" },
];

export default function QueryPage() {
    const [query, setQuery] = useState("SELECT * FROM users LIMIT 10");
    const [results, setResults] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [success, setSuccess] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [isAdvancedMode, setIsAdvancedMode] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredResults = results.filter(row => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return columns.some(col =>
            String(row[col] ?? '').toLowerCase().includes(query)
        );
    });

    useEffect(() => {
        const prefilledQuery = sessionStorage.getItem('prefilledQuery');
        if (prefilledQuery) {
            setQuery(prefilledQuery);
            sessionStorage.removeItem('prefilledQuery');
        }
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [results]);

    const handleExecute = async () => {
        setLoading(true);
        setError("");
        setSuccess(false);
        setExecutionTime(null);
        const startTime = performance.now();

        try {
            const res = await api.post("/sql/execute", {
                query,
                allow_unsafe: isAdvancedMode
            });
            const endTime = performance.now();
            setExecutionTime(endTime - startTime);

            const data = res.data;

            if (Array.isArray(data) && data.length > 0) {
                setColumns(Object.keys(data[0]));
                setResults(data);
                setSuccess(true);
            } else if (Array.isArray(data) && data.length === 0) {
                setColumns([]);
                setResults([]);
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || "Error al ejecutar la consulta");
            setResults([]);
            setColumns([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyQuery = () => {
        navigator.clipboard.writeText(query);
        toast.success("Consulta copiada al portapapeles");
    };

    const handleDownloadResults = () => {
        if (results.length === 0) return;

        const csv = [
            columns.join(','),
            ...results.map(row => columns.map(col => JSON.stringify(row[col] ?? '')).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_results_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const insertAtCursor = (textToInsert: string) => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const header = query.substring(0, start);
            const footer = query.substring(end, query.length);
            const newQuery = header + textToInsert + footer;

            setQuery(newQuery);

            setTimeout(() => {
                textarea.focus();
                const newCursorPos = start + textToInsert.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        } else {
            setQuery(prev => prev + textToInsert);
        }
    };

    const handleClearQuery = () => {
        setQuery("");
        setResults([]);
        setColumns([]);
        setError("");
        setSuccess(false);
        setExecutionTime(null);
        toast.success("Consulta limpiada");
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const paginatedResults = filteredResults.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const filteredCommands = QUICK_COMMANDS.filter(cmd => isAdvancedMode ? true : cmd.mode === 'read');

    return (
        <div className="space-y-4 overflow-x-hidden">
            {/* Header */}
            <div className="space-y-1 animate-in slide-in-from-left duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">
                            Editor de Consultas SQL
                        </h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                            <p className="text-muted-foreground">
                                Ejecuta consultas SQL en tiempo real sobre tus datasets.
                            </p>
                            <Badge variant="outline" className="w-fit flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                                <AlertCircle className="h-3 w-3" />
                                <span className="text-xs">Recomendación: Usa <span className="font-mono font-bold">LIMIT</span> para optimizar</span>
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge className="px-3 py-1 bg-[#FFF000] text-black hover:bg-[#FFF000]/90 border-black/10 font-bold shadow-sm">
                            <Database className="h-3 w-3 mr-1.5" />
                            DuckDB
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Query Editor Card */}
            <Card className="border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom duration-500">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Code2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle>Editor de Consultas</CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    Modo: <span className={cn("font-semibold", isAdvancedMode ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400")}>
                                        {isAdvancedMode ? "Avanzado / Escritura" : "Lectura / Sandbox"}
                                    </span>
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                                className={cn(
                                    "transition-all duration-300 border cursor-pointer",
                                    isAdvancedMode
                                        ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:text-orange-800 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800"
                                        : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800"
                                )}
                            >
                                {isAdvancedMode ? (
                                    <>
                                        <ShieldAlert className="h-4 w-4 mr-2" />
                                        Modo Escritura Activado
                                    </>
                                ) : (
                                    <>
                                        <Shield className="h-4 w-4 mr-2" />
                                        Solo Lectura (Seguro)
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyQuery}
                                className="hover:bg-primary/10 cursor-pointer"
                            >
                                <Copy className="h-4 w-4 mr-1" />
                                Copiar
                            </Button>
                        </div>
                    </div>

                    {/* Quick Commands Toolbar */}
                    <div className="space-y-2 pt-2 bg-muted/20 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                            <Wand2 className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                            Comandos Rápidos (DuckDB):
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filteredCommands.map((cmd) => {
                                // Define styles based on group
                                let textColor = "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100";
                                let borderColor = "hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/20";

                                switch (cmd.group) {
                                    case 'basic':
                                        // Cyan / Neutral
                                        textColor = "text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-700 dark:group-hover:text-cyan-300";
                                        borderColor = "hover:border-cyan-200 dark:hover:border-cyan-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/20";
                                        break;
                                    case 'filter':
                                        // Green / Teal
                                        textColor = "text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300";
                                        borderColor = "hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20";
                                        break;
                                    case 'agg':
                                        // Blue
                                        textColor = "text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300";
                                        borderColor = "hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/20";
                                        break;
                                    case 'join':
                                        // Purple
                                        textColor = "text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300";
                                        borderColor = "hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/20";
                                        break;
                                    case 'func':
                                        // Pink/Rose
                                        textColor = "text-pink-600 dark:text-pink-400 group-hover:text-pink-700 dark:group-hover:text-pink-300";
                                        borderColor = "hover:border-pink-200 dark:hover:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-950/20";
                                        break;
                                    case 'admin':
                                    case 'write':
                                        // Orange/Red
                                        textColor = "text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300";
                                        borderColor = "border-orange-200 dark:border-orange-800/50 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-300";
                                        break;
                                }

                                return (
                                    <Badge
                                        key={cmd.label}
                                        variant="outline"
                                        className={cn(
                                            "cursor-pointer transition-all duration-200 active:scale-95 select-none py-1 group border-dashed",
                                            borderColor
                                        )}
                                        onClick={() => insertAtCursor(cmd.value)}
                                    >
                                        <span className={cn("font-mono text-[10px] sm:text-xs font-medium", textColor)}>
                                            {cmd.label}
                                        </span>
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={isAdvancedMode
                                ? "DROP VIEW mi_vista; -- Precaución en modo escritura"
                                : "SELECT * FROM tabla WHERE condicion = 'valor'"}
                            className={cn(
                                "min-h-[200px] font-mono text-sm resize-none shadow-inner transition-colors",
                                isAdvancedMode
                                    ? "border-orange-200 focus:border-orange-500 bg-orange-50/10"
                                    : "border-primary/20 focus:border-primary bg-muted/30"
                            )}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    handleExecute();
                                }
                            }}
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border border-border/50 shadow-sm backdrop-blur-sm">
                            Ctrl+Enter para ejecutar
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            {executionTime !== null && (
                                <Badge variant="secondary" className="animate-in fade-in-50">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {executionTime.toFixed(2)}ms
                                </Badge>
                            )}
                            {success && results.length > 0 && (
                                <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 animate-in fade-in-50">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {results.length} {results.length === 1 ? 'fila' : 'filas'}
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                onClick={handleClearQuery}
                                disabled={loading || !query.trim()}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            >
                                <Eraser className="mr-2 h-4 w-4" />
                                Limpiar
                            </Button>
                            <Button
                                onClick={handleExecute}
                                disabled={loading || !query.trim()}
                                className={cn(
                                    "shadow-lg dark:text-white cursor-pointer transition-all duration-300",
                                    isAdvancedMode
                                        ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/30"
                                        : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/30"
                                )}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Ejecutando...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Ejecutar {isAdvancedMode ? "" : "Consulta"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start space-x-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 animate-in slide-in-from-top duration-300">
                            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                                    Error en la consulta
                                </p>
                                <p className="text-sm text-red-600/90 dark:text-red-400/90 font-mono">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results Card */}
            {results.length > 0 && (
                <Card className="border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom duration-500 delay-100">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                    <Terminal className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle>Resultados de la Consulta</CardTitle>
                                    <CardDescription>
                                        {results.length} {results.length === 1 ? 'fila encontrada' : 'filas encontradas'}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="relative w-64 md:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar en resultados..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="pl-9 bg-background/50 border-primary/20 focus:border-primary"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadResults}
                                    className="hover:bg-primary/10"
                                >
                                    <Download className="h-4 w-4 mr-1" />
                                    Descargar CSV
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border border-border/50 overflow-auto max-h-[600px]">
                            <Table className="min-w-full">
                                <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-sm z-10">
                                    <TableRow>
                                        <TableHead className="w-[50px] font-semibold text-muted-foreground">#</TableHead>
                                        {columns.map((col) => (
                                            <TableHead key={col} className="font-semibold whitespace-nowrap">
                                                {col}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedResults.map((row, idx) => (
                                        <TableRow
                                            key={idx}
                                            className="hover:bg-accent/50 transition-colors"
                                        >
                                            <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{((currentPage - 1) * itemsPerPage) + idx + 1}</TableCell>
                                            {columns.map((col) => (
                                                <TableCell
                                                    key={col}
                                                    className={`font-mono text-sm whitespace-nowrap ${row[col] === null ? 'text-muted-foreground italic' : ''
                                                        }`}
                                                >
                                                    {row[col] === null ? 'NULL' : String(row[col])}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>


                        {/* Pagination Controls */}
                        <div className="flex flex-col sm:flex-row items-center justify-between px-2 pt-4 gap-4">
                            <div className="flex items-center text-sm text-muted-foreground">
                                <span className="mr-2">Filas por página:</span>
                                <Select
                                    value={itemsPerPage.toString()}
                                    onValueChange={(val) => {
                                        setItemsPerPage(Number(val));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="w-[85px] h-8">
                                        <SelectValue placeholder="10" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                        <SelectItem value="500">500</SelectItem>
                                        <SelectItem value="1000">1000</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <div className="text-sm font-medium mr-2">
                                    Página {currentPage} de {totalPages || 1}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="h-8 w-8"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )
            }

            {
                !loading && !error && results.length === 0 && success && (
                    <Card className={cn(
                        "border-dashed border-2 animate-in fade-in-50",
                        query.trim().toUpperCase().match(/^(CREATE|DROP|INSERT|UPDATE|DELETE|ALTER|GRANT|REVOKE)/)
                            ? "border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800"
                            : "border-primary/20"
                    )}>
                        <CardContent className="flex flex-col items-center justify-center py-4">
                            {query.trim().toUpperCase().match(/^(CREATE|DROP|INSERT|UPDATE|DELETE|ALTER|GRANT|REVOKE)/) ? (
                                <>
                                    <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                                    <p className="text-lg font-medium text-green-700 dark:text-green-400 mb-1">
                                        Operación Exitosa
                                    </p>
                                    <p className="text-sm text-green-600/80 dark:text-green-400/80">
                                        El comando se ejecutó correctamente.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Database className="h-16 w-16 text-muted-foreground/50 mb-4" />
                                    <p className="text-lg font-medium text-muted-foreground mb-1">
                                        Sin resultados
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        La consulta se ejecutó correctamente pero no devolvió filas.
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )
            }
        </div >
    );
}
