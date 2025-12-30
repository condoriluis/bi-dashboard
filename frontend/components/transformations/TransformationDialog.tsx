"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Copy, Check, Database, Columns, Table2, Code2, Eye, Settings2, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const QUICK_COMMANDS = [
    // Lectura - Básico
    { label: "SELECT *", value: "SELECT * ", mode: "read", group: "basic" },
    { label: "LIMIT", value: "LIMIT 100", mode: "read", group: "basic" },
    { label: "DISTINCT", value: "DISTINCT ", mode: "read", group: "basic" },

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
    { label: "LEFT JOIN", value: "LEFT JOIN ", mode: "read", group: "join" },
    { label: "INNER JOIN", value: "INNER JOIN ", mode: "read", group: "join" },

    // Lectura - Funciones Tiempo
    { label: "DATE_TRUNC", value: "date_trunc('month', fecha) ", mode: "read", group: "func" },
    { label: "TODAY", value: "today() ", mode: "read", group: "func" },
];

interface Transformation {
    id: number;
    name: string;
    description?: string;
    source_table: string;
    sql_definition: string;
    created_at: string;
    updated_at: string;
}

interface TransformationDialogProps {
    open: boolean;
    onClose: () => void;
    transformation?: Transformation | null;
    initialAutoRun?: boolean;
}

interface Dataset {
    table_name: string;
    filename: string;
    extension?: string;
}

const SQL_TEMPLATES = [
    {
        name: "Convertir Fechas",
        icon: "📅",
        category: "transform",
        sql: "SELECT \n  strptime(fecha_columna, '%d/%m/%Y') as fecha_normalizada,\n  *\nFROM {source_table}"
    },
    {
        name: "Normalizar Textos",
        icon: "✨",
        category: "transform",
        sql: "SELECT \n  UPPER(TRIM(nombre)) as nombre_limpio,\n  LOWER(TRIM(email)) as email_limpio,\n  *\nFROM {source_table}"
    },
    {
        name: "Filtrar Nulos",
        icon: "🔍",
        category: "transform",
        sql: "SELECT \n  COALESCE(monto, 0) as monto,\n  COALESCE(cantidad, 1) as cantidad,\n  *\nFROM {source_table}\nWHERE columna_importante IS NOT NULL"
    },
    {
        name: "Agrupación",
        icon: "📊",
        category: "transform",
        sql: "SELECT \n  categoria,\n  SUM(monto) as total_ventas,\n  COUNT(*) as cantidad_transacciones\nFROM {source_table}\nGROUP BY categoria"
    },
    {
        name: "Clasificación",
        icon: "🏷️",
        category: "transform",
        sql: "SELECT \n  *,\n  CASE \n    WHEN monto > 1000 THEN 'Alto Valor'\n    WHEN monto > 500 THEN 'Medio Valor'\n    ELSE 'Bajo Valor'\n  END as segmento_cliente\nFROM {source_table}"
    },
    {
        name: "Últimos 30 Días",
        icon: "📆",
        category: "transform",
        sql: "SELECT *\nFROM {source_table}\nWHERE fecha_columna >= current_date - INTERVAL 30 DAY"
    },
    {
        name: "INNER JOIN",
        icon: "🔗",
        category: "join",
        requiresSecondary: true,
        sql: "SELECT \n  a.*,\n  b.columna1,\n  b.columna2\nFROM {source_table} a\nINNER JOIN {secondary_table} b ON a.id_relacion = b.id"
    },
    {
        name: "LEFT JOIN",
        icon: "◀️",
        category: "join",
        requiresSecondary: true,
        sql: "SELECT \n  a.*,\n  b.columna1,\n  b.columna2\nFROM {source_table} a\nLEFT JOIN {secondary_table} b ON a.id_relacion = b.id"
    },
    {
        name: "Multi-Tabla",
        icon: "🔀",
        category: "join",
        requiresSecondary: true,
        sql: "SELECT \n  a.*,\n  b.nombre as nombre_b,\n  c.descripcion as desc_c\nFROM {source_table} a\nINNER JOIN {secondary_table} b ON a.id_b = b.id\nINNER JOIN otra_tabla c ON a.id_c = c.id"
    },
    {
        name: "Self JOIN",
        icon: "🔁",
        category: "join",
        sql: "SELECT \n  a.*,\n  b.nombre as relacionado\nFROM {source_table} a\nLEFT JOIN {source_table} b ON a.id_padre = b.id"
    },
    {
        name: "JOIN + Agregación",
        icon: "📈",
        category: "join",
        requiresSecondary: true,
        sql: "SELECT \n  b.categoria,\n  COUNT(a.id) as total,\n  SUM(a.monto) as total_monto,\n  AVG(a.monto) as promedio\nFROM {source_table} a\nINNER JOIN {secondary_table} b ON a.id_categoria = b.id\nGROUP BY b.categoria\nORDER BY total_monto DESC"
    }
];

export default function TransformationDialog({ open, onClose, transformation, initialAutoRun = false }: TransformationDialogProps) {
    const { currentDashboard } = useDashboard();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [sourceTable, setSourceTable] = useState("");
    const [secondaryTable, setSecondaryTable] = useState("");
    const [sqlDefinition, setSqlDefinition] = useState("");
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("config");

    // Source Table Preview State
    const [sourcePreviewData, setSourcePreviewData] = useState<any[]>([]);
    const [sourcePreviewLoading, setSourcePreviewLoading] = useState(false);
    const [copiedColumn, setCopiedColumn] = useState<string | null>(null);

    // Scroll state for overflow indicators
    const [sourceScrollLeft, setSourceScrollLeft] = useState(0);
    const [sourceScrollRight, setSourceScrollRight] = useState(0);
    const [previewScrollLeft, setPreviewScrollLeft] = useState(0);
    const [previewScrollRight, setPreviewScrollRight] = useState(0);

    const { data: datasets } = useQuery({
        queryKey: ["datasets"],
        queryFn: async () => {
            const res = await api.get("/datasets/");
            return res.data as Dataset[];
        }
    });

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertAtCursor = (textToInsert: string) => {
        if (textareaRef.current) {
            const textarea = textareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const header = sqlDefinition.substring(0, start);
            const footer = sqlDefinition.substring(end, sqlDefinition.length);
            const newQuery = header + textToInsert + footer;

            setSqlDefinition(newQuery);

            setTimeout(() => {
                textarea.focus();
                const newCursorPos = start + textToInsert.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        } else {
            setSqlDefinition(prev => prev + textToInsert);
        }
    };

    const handlePreview = async (sqlOverride?: string, sourceOverride?: string) => {
        const sql = sqlOverride || sqlDefinition;
        const source = sourceOverride || sourceTable;

        if (!source || !sql) return;

        if (sql.includes('[tabla_origen]') || sql.includes('[tabla_secundaria]') || sql.includes('[')) {
            toast.error('Por favor, edita el SQL y reemplaza los placeholders [tabla_origen], [tabla_secundaria], etc. con nombres reales de tablas y columnas.');
            return;
        }

        setPreviewLoading(true);
        try {
            const res = await api.post("/transformations/preview", {
                source_table: source,
                sql_definition: sql.trim().replace(/;+$/, '')
            });
            setPreviewData(res.data.data || []);
            setActiveTab("preview");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error en preview");
        } finally {
            setPreviewLoading(false);
        }
    };

    useEffect(() => {
        if (transformation) {
            setName(transformation.name);
            setDescription(transformation.description || "");
            setSourceTable(transformation.source_table);
            setSqlDefinition(transformation.sql_definition);

            if (open && initialAutoRun) {
                // Auto-run preview
                handlePreview(transformation.sql_definition, transformation.source_table);
            } else {
                setActiveTab("config");
            }
        } else {
            setName("");
            setDescription("");
            setSourceTable("");
            setSqlDefinition("");
            setActiveTab("config");
        }
        setPreviewData([]);
    }, [transformation, open, initialAutoRun]);

    useEffect(() => {
        const fetchSourcePreview = async () => {
            if (!sourceTable) {
                setSourcePreviewData([]);
                return;
            }

            setSourcePreviewLoading(true);
            try {
                const res = await api.post("/transformations/preview", {
                    source_table: sourceTable,
                    sql_definition: `SELECT * FROM ${sourceTable} LIMIT 10`
                });
                setSourcePreviewData(res.data.data || []);
                if (res.data.data && res.data.data.length > 0 && !initialAutoRun) {
                    setTimeout(() => setActiveTab("source"), 300);
                }
            } catch (error) {
                console.error("Failed to fetch source preview", error);
                setSourcePreviewData([]);
            } finally {
                setSourcePreviewLoading(false);
            }
        };

        fetchSourcePreview();
    }, [sourceTable, initialAutoRun]);

    const handleCopyColumn = (colName: string) => {
        navigator.clipboard.writeText(colName);
        setCopiedColumn(colName);
        setTimeout(() => setCopiedColumn(null), 2000);
    };

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            if (transformation) {
                return await api.put(`/transformations/${transformation.id}`, data);
            } else {
                return await api.post("/transformations/", data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transformations"] });
            queryClient.invalidateQueries({ queryKey: ["datasets"] });
            onClose();
        }
    });



    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            name,
            description: description || undefined,
            source_table: sourceTable,
            sql_definition: sqlDefinition,
            dashboard_id: currentDashboard?.id
        });
    };

    const applyTemplate = (template: typeof SQL_TEMPLATES[0]) => {
        let sql = template.sql
            .replace(/{source_table}/g, sourceTable || "[tabla_origen]")
            .replace(/{secondary_table}/g, secondaryTable || "[tabla_secundaria]");
        setSqlDefinition(sql);

        // Auto-navigate to SQL editor
        setTimeout(() => setActiveTab("sql"), 100);
    };

    const handleSourceScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        setSourceScrollLeft(element.scrollLeft);
        setSourceScrollRight(element.scrollWidth - element.clientWidth - element.scrollLeft);
    };

    const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const element = e.currentTarget;
        setPreviewScrollLeft(element.scrollLeft);
        setPreviewScrollRight(element.scrollWidth - element.clientWidth - element.scrollLeft);
    };

    const scrollSourceTable = (direction: 'left' | 'right') => {
        const container = document.getElementById('source-table-container');
        if (container) {
            container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
        }
    };

    const scrollPreviewTable = (direction: 'left' | 'right') => {
        const container = document.getElementById('preview-table-container');
        if (container) {
            container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
        }
    };

    const canNavigateToSource = sourceTable && !sourcePreviewLoading;
    const canNavigateToSQL = sourceTable;
    const canNavigateToPreview = previewData.length > 0;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-4xl lg:max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        {transformation ? "Editar Transformación" : "Nueva Transformación"}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Crea una vista SQL persistente para transformar tus datos de manera profesional
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden px-6">
                        <TabsList className="w-full justify-start bg-muted/50 p-1 mb-4 grid grid-cols-4 lg:flex lg:w-fit">
                            <TabsTrigger value="config" className="flex items-center gap-2">
                                <Settings2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Configuración</span>
                                <span className="sm:hidden">Config</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="source"
                                className="flex items-center gap-2"
                                disabled={!canNavigateToSource}
                            >
                                <Table2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Vista Origen</span>
                                <span className="sm:hidden">Origen</span>
                                {sourcePreviewData.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                        {sourcePreviewData.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="sql"
                                className="flex items-center gap-2"
                                disabled={!canNavigateToSQL}
                            >
                                <Code2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Editor SQL</span>
                                <span className="sm:hidden">SQL</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="preview"
                                className="flex items-center gap-2"
                                disabled={!canNavigateToPreview}
                            >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">Resultado</span>
                                <span className="sm:hidden">Vista</span>
                                {previewData.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                        {previewData.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto pb-6">
                            {/* Tab 1: Configuration */}
                            <TabsContent value="config" className="mt-0 space-y-6">
                                <Card className="border-2">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Información Básica</CardTitle>
                                        <CardDescription>Define los datos principales de tu transformación</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-sm font-semibold">
                                                    Nombre de la Vista <span className="text-destructive">*</span>
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={name}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                            .toLowerCase()
                                                            .replace(/\s+/g, '_')
                                                            .replace(/^[0-9]+/, '')
                                                            .replace(/[^a-z0-9_]/g, '');
                                                        setName(val);
                                                    }}
                                                    placeholder="ej: ventas_limpias"
                                                    className="font-mono"
                                                    required
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Usa snake_case para nombres de vistas SQL
                                                </p>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="source" className="text-sm font-semibold">
                                                        Tabla Origen <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Select value={sourceTable} onValueChange={setSourceTable} required>
                                                        <SelectTrigger className="font-mono">
                                                            <SelectValue placeholder="Selecciona una tabla" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {datasets?.filter(d => d.extension?.toLowerCase() !== 'view').map((dataset) => (
                                                                <SelectItem key={dataset.table_name} value={dataset.table_name} className="font-mono">
                                                                    {dataset.table_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-xs text-muted-foreground">
                                                        La tabla base para tu transformación
                                                    </p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="secondary" className="text-sm font-semibold flex items-center gap-2">
                                                        Tabla Secundaria (Opcional)
                                                        <span className="text-xs font-normal text-muted-foreground">Para JOINs</span>
                                                    </Label>
                                                    <Select value={secondaryTable} onValueChange={setSecondaryTable}>
                                                        <SelectTrigger className="font-mono">
                                                            <SelectValue placeholder="Ninguna (solo para JOINs)" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {datasets?.filter(d => d.extension?.toLowerCase() !== 'view' && d.table_name !== sourceTable).map((dataset) => (
                                                                <SelectItem key={dataset.table_name} value={dataset.table_name} className="font-mono">
                                                                    {dataset.table_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-xs text-muted-foreground">
                                                        Para combinar tablas
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="description" className="text-sm font-semibold">Descripción</Label>
                                            <Input
                                                id="description"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Describe qué hace esta transformación..."
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Opcional: ayuda a otros usuarios a entender el propósito
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {sourcePreviewLoading && (
                                    <Card className="border-dashed border-primary/30">
                                        <CardContent className="py-12">
                                            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <p className="text-sm font-medium">Cargando vista previa de {sourceTable}...</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {!sourceTable && !sourcePreviewLoading && (
                                    <Card className="border-dashed bg-muted/20">
                                        <CardContent>
                                            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                                <Database className="h-12 w-12 opacity-30" />
                                                <p className="text-sm font-medium">Selecciona una tabla origen para comenzar</p>
                                                <p className="text-xs">La vista previa se cargará automáticamente</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {sourceTable && sourcePreviewData.length > 0 && (
                                    <Card className="border-primary/30 bg-primary/5">
                                        <CardContent>
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="rounded-full bg-primary/10 p-3">
                                                    <Check className="h-8 w-8 text-primary" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-semibold mb-1">¡Tabla cargada exitosamente!</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Navega a la pestaña <strong>"Vista Origen"</strong> para ver las columnas disponibles
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setActiveTab("source")}
                                                    className="mt-2"
                                                >
                                                    <Table2 className="h-4 w-4 mr-2" />
                                                    Ver Vista Origen
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            {/* Tab 2: Source Table Preview */}
                            <TabsContent value="source" className="mt-0 space-y-0">
                                <Card className="border-2">
                                    <CardHeader className="pb-1">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Database className="h-4 w-4 text-primary" />
                                                    Columnas Disponibles en <code className="text-primary font-mono ml-1 text-base">{sourceTable}</code>
                                                </CardTitle>
                                            </div>
                                            <Badge variant="secondary" className="text-sm px-3 py-0">
                                                {sourcePreviewData.length} filas
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-0 pb-0">
                                        <div className="relative">
                                            {/* Left scroll indicator */}
                                            {sourceScrollLeft > 5 && (
                                                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
                                            )}
                                            {/* Right scroll indicator */}
                                            {sourceScrollRight > 5 && (
                                                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />
                                            )}

                                            {/* Scroll buttons */}
                                            {sourceScrollLeft > 5 && (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full shadow-lg"
                                                    onClick={() => scrollSourceTable('left')}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {sourceScrollRight > 5 && (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full shadow-lg"
                                                    onClick={() => scrollSourceTable('right')}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            )}

                                            <div
                                                id="source-table-container"
                                                className="overflow-x-auto max-h-[calc(95vh-300px)]"
                                                onScroll={handleSourceScroll}
                                            >
                                                {sourcePreviewData.length > 0 && sourcePreviewData[0] ? (
                                                    <Table>
                                                        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b-2">
                                                            <TableRow className="hover:bg-transparent">
                                                                {Object.keys(sourcePreviewData[0]).map((col) => (
                                                                    <TableHead
                                                                        key={col}
                                                                        className="h-10 px-4 text-sm font-bold cursor-pointer hover:bg-primary/10 hover:text-primary group select-none transition-colors"
                                                                        onClick={() => handleCopyColumn(col)}
                                                                        title="Click para copiar nombre"
                                                                    >
                                                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                                                            <Columns className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                                                                            <span className="font-mono">{col}</span>
                                                                            {copiedColumn === col ? (
                                                                                <Check className="h-4 w-4 text-green-500 animate-in zoom-in" />
                                                                            ) : (
                                                                                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                                            )}
                                                                        </div>
                                                                    </TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {sourcePreviewData.map((row, i) => (
                                                                <TableRow key={i} className="hover:bg-muted/50">
                                                                    {Object.values(row).map((val: any, j) => (
                                                                        <TableCell key={j} className="px-4 py-2.5 text-sm font-mono whitespace-nowrap">
                                                                            {val === null ? (
                                                                                <span className="italic opacity-50 text-muted-foreground text-xs">NULL</span>
                                                                            ) : (
                                                                                <span className="text-foreground/90">{String(val)}</span>
                                                                            )}
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <div className="py-8 text-center">
                                                        <p className="text-sm text-muted-foreground italic">No se pudieron cargar datos preliminares</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="px-4 py-1 bg-muted/30 border-t text-xs text-muted-foreground flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                💡 <strong>Tip:</strong> Click en los encabezados para copiar el nombre de la columna
                                            </span>
                                            <span className="hidden sm:inline">Mostrando primeras 10 filas</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setActiveTab("config")}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        Volver a Configuración
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setActiveTab("sql")}
                                    >
                                        Continuar al Editor SQL
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* Tab 3: SQL Editor */}
                            <TabsContent value="sql" className="mt-0 space-y-4">
                                {/* Templates */}
                                {/* Compact Quick Templates */}
                                <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border/50">
                                    <h4 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                                        Plantillas Rápidas
                                    </h4>

                                    {/* Transformations Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground w-20 pt-1.5">Transformaciones</span>
                                        <div className="flex flex-wrap gap-1.5 flex-1 sm:ml-10">
                                            {SQL_TEMPLATES.filter(t => t.category === 'transform').map((template) => (
                                                <Button
                                                    key={template.name}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs px-2 gap-1.5 border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary transition-all cursor-pointer"
                                                    onClick={() => applyTemplate(template)}
                                                    title={template.name}
                                                >
                                                    <span>{template.icon}</span>
                                                    <span className="font-medium text-[10px] sm:text-xs">{template.name}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-px bg-border/50" />

                                    {/* JOINs Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                                        <div className="flex items-center gap-2 w-20 pt-1.5">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">JOINs</span>
                                            {!secondaryTable && (
                                                <Badge variant="outline" className="h-4 px-1 text-[9px] border-amber-200 bg-amber-50 text-amber-600" title="Selecciona tabla secundaria arriba">
                                                    Relacionar Tabla
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 flex-1 sm:ml-10">
                                            {SQL_TEMPLATES.filter(t => t.category === 'join').map((template) => (
                                                <Button
                                                    key={template.name}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs px-2 gap-1.5 border-dashed hover:border-solid hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                                                    onClick={() => applyTemplate(template)}
                                                    title={template.name}
                                                >
                                                    <span>{template.icon}</span>
                                                    <span className="font-medium text-[10px] sm:text-xs">{template.name}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Commands Toolbar */}
                                <div className="space-y-2 pt-2 bg-muted/20 p-3 rounded-lg border border-border/50 my-2">
                                    <div className="flex items-center text-xs font-medium text-muted-foreground mb-2">
                                        <Wand2 className="h-3.5 w-3.5 mr-1.5 text-purple-500" />
                                        Comandos Rápidos (DuckDB):
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {QUICK_COMMANDS.map((cmd) => {
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

                                {/* SQL Editor */}
                                <Card className="border-2">
                                    <CardHeader className="pb-0">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Code2 className="h-5 w-5 text-primary" />
                                            Definición SQL <span className="text-destructive text-base ml-1">*</span>
                                        </CardTitle>
                                        <CardDescription>Escribe tu consulta SQL de transformación</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Textarea
                                            id="sql"
                                            ref={textareaRef}
                                            value={sqlDefinition}
                                            onChange={(e) => setSqlDefinition(e.target.value)}
                                            placeholder={`SELECT * FROM ${sourceTable || 'tabla'} WHERE condicion...`}
                                            className="font-mono text-sm min-h-[250px] resize-none"
                                            required
                                        />
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                Usa la sintaxis SQL estándar (DuckDB)
                                            </p>
                                            <Button
                                                type="button"
                                                onClick={() => handlePreview()}
                                                disabled={!sourceTable || !sqlDefinition || previewLoading}
                                                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                            >
                                                {previewLoading ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Ejecutando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Probar SQL
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {previewData.length > 0 && (
                                    <Card className="border-primary/30 bg-primary/5">
                                        <CardContent className="py-0">
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-full bg-primary/10 p-2">
                                                        <Check className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold">¡SQL ejecutado correctamente!</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {previewData.length} filas obtenidas
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setActiveTab("preview")}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Ver Resultado
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <div className="flex justify-between pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setActiveTab("source")}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        Volver a Vista Origen
                                    </Button>
                                    {previewData.length > 0 && (
                                        <Button
                                            type="button"
                                            onClick={() => setActiveTab("preview")}
                                        >
                                            Ver Resultado
                                            <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Tab 4: Preview Results */}
                            <TabsContent value="preview" className="mt-0 space-y-4">
                                <Card className="border-2">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Eye className="h-5 w-5 text-primary" />
                                                    Resultado de la Transformación
                                                </CardTitle>
                                                <CardDescription className="mt-1">
                                                    Vista previa de los primeros {previewData.length} registros transformados
                                                </CardDescription>
                                            </div>
                                            <Badge variant="secondary" className="text-sm px-3 py-1">
                                                {previewData.length} filas
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-0 pb-0">
                                        <div className="relative">
                                            {/* Left scroll indicator */}
                                            {previewScrollLeft > 5 && (
                                                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
                                            )}
                                            {/* Right scroll indicator */}
                                            {previewScrollRight > 5 && (
                                                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />
                                            )}

                                            {/* Scroll buttons */}
                                            {previewScrollLeft > 5 && (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full shadow-lg"
                                                    onClick={() => scrollPreviewTable('left')}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {previewScrollRight > 5 && (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full shadow-lg"
                                                    onClick={() => scrollPreviewTable('right')}
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            )}

                                            <div
                                                id="preview-table-container"
                                                className="overflow-x-auto max-h-[calc(95vh-300px)]"
                                                onScroll={handlePreviewScroll}
                                            >
                                                {previewData.length > 0 && previewData[0] ? (
                                                    <Table>
                                                        <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b-2">
                                                            <TableRow className="hover:bg-transparent">
                                                                {Object.keys(previewData[0]).map((col) => (
                                                                    <TableHead
                                                                        key={col}
                                                                        className="h-10 px-4 text-sm font-bold whitespace-nowrap"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Columns className="h-4 w-4 text-primary" />
                                                                            <span className="font-mono">{col}</span>
                                                                        </div>
                                                                    </TableHead>
                                                                ))}
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {previewData.map((row, i) => (
                                                                <TableRow key={i} className="hover:bg-muted/50">
                                                                    {Object.values(row).map((val: any, j) => (
                                                                        <TableCell key={j} className="px-4 py-2.5 text-sm font-mono whitespace-nowrap">
                                                                            {val === null ? (
                                                                                <span className="italic opacity-50 text-muted-foreground text-xs">NULL</span>
                                                                            ) : (
                                                                                <span className="text-foreground/90">{String(val)}</span>
                                                                            )}
                                                                        </TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                ) : (
                                                    <div className="py-12 text-center">
                                                        <p className="text-sm text-muted-foreground italic">No hay datos para mostrar</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="px-4 py-3 bg-muted/30 border-t text-xs text-muted-foreground flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                ✅ <strong>Validado:</strong> La transformación se ejecutó correctamente
                                            </span>
                                            <span className="hidden sm:inline">Mostrando primeras {previewData.length} filas</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setActiveTab("sql")}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        Volver al Editor
                                    </Button>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Footer Actions */}
                    <div className="border-t px-6 py-4 bg-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground hidden lg:block">
                            {!sourceTable && "Paso 1: Selecciona una tabla origen"}
                            {sourceTable && !sqlDefinition && "Paso 2: Escribe tu SQL"}
                            {sourceTable && sqlDefinition && previewData.length === 0 && "Paso 3: Prueba tu SQL"}
                            {previewData.length > 0 && "¡Listo! Ahora puedes guardar la transformación"}
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:ml-auto">
                            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending || !name || !sourceTable || !sqlDefinition}
                                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 w-full sm:w-auto"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        {transformation ? "Actualizar Transformación" : "Crear Transformación"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent >
        </Dialog >
    );
}
