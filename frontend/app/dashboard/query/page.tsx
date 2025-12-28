"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Play, Terminal, AlertCircle, CheckCircle2, Code2, Clock, Database, Copy, Download, Wand2, ChevronLeft, ChevronRight, Search, Eraser } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const QUICK_COMMANDS = [
    // Consultas Básicas
    { label: "SELECT *", value: "SELECT * FROM " },
    { label: "WHERE", value: "WHERE " },
    { label: "LIMIT", value: "LIMIT 100" },
    { label: "ORDER BY", value: "ORDER BY " },
    // Agregaciones
    { label: "GROUP BY", value: "GROUP BY " },
    { label: "COUNT", value: "COUNT(*) " },
    { label: "SUM", value: "SUM() " },
    { label: "AVG", value: "AVG() " },
    { label: "MAX", value: "MAX() " },
    { label: "MIN", value: "MIN() " },
    // Fechas (DuckDB)
    { label: "DATE_TRUNC", value: "date_trunc('month', fecha) " },
    { label: "YEAR", value: "year(fecha) " },
    { label: "TODAY", value: "today() " },
    // Lógica
    { label: "CASE WHEN", value: "CASE WHEN cond THEN val ELSE other END " },
    { label: "COALESCE", value: "COALESCE(val, default) " },
    { label: "LIKE", value: "LIKE '%pattern%' " },
    { label: "HAVING", value: "HAVING " },
    // Joins & Utilidades
    { label: "LEFT JOIN", value: "LEFT JOIN table ON " },
    { label: "DESCRIBE", value: "DESCRIBE " },
    { label: "SHOW TABLES", value: "SHOW TABLES" },
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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter results based on search query
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

    // Reset pagination when results change
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
            const res = await api.post("/sql/execute", { query });
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

    // Pagination Logic
    const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
    const paginatedResults = filteredResults.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="space-y-1 animate-in slide-in-from-left duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">
                            Editor de Consultas SQL
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Ejecuta consultas SQL en tiempo real sobre tus datasets.
                        </p>
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
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Code2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle>Editor de Consultas</CardTitle>
                                <CardDescription>Escribe tu consulta SQL aquí</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
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
                    <div className="flex flex-wrap gap-2 pt-2 pb-1">
                        <div className="flex items-center mr-2 text-xs font-medium text-muted-foreground">
                            <Wand2 className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                            Rápido:
                        </div>
                        {QUICK_COMMANDS.map((cmd) => (
                            <Badge
                                key={cmd.label}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 active:scale-95 select-none py-1 group"
                                onClick={() => insertAtCursor(cmd.value)}
                            >
                                <span className="text-primary/80 group-hover:text-primary font-mono text-[10px] sm:text-xs">
                                    {cmd.label}
                                </span>
                            </Badge>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="SELECT * FROM tabla WHERE condicion = 'valor'"
                            className="min-h-[200px] font-mono text-sm border-primary/20 focus:border-primary resize-none bg-muted/30 shadow-inner"
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
                                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/30 dark:text-white cursor-pointer"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Ejecutando...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Ejecutar Consulta
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
                        <div className="rounded-lg border border-border/50 overflow-hidden">
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                <Table>
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
                                                <TableCell className="text-muted-foreground text-xs">{((currentPage - 1) * itemsPerPage) + idx + 1}</TableCell>
                                                {columns.map((col) => (
                                                    <TableCell
                                                        key={col}
                                                        className={`font-mono text-sm ${row[col] === null ? 'text-muted-foreground italic' : ''
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
            )}

            {/* Empty State */}
            {!loading && !error && results.length === 0 && success && (
                <Card className="border-dashed border-2 border-primary/20 animate-in fade-in-50">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Database className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground mb-1">
                            Sin resultados
                        </p>
                        <p className="text-sm text-muted-foreground">
                            La consulta se ejecutó correctamente pero no devolvió filas.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
