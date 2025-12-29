"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { WidgetConfig } from "@/lib/utils";
import { useDashboard } from "@/contexts/DashboardContext";
import { BarChart3, Binary, Table as TableIcon, Sparkles, ArrowUp, ArrowDown, AlignLeft, LineChart, AreaChart, PieChart, Circle, DatabaseIcon, Globe, BarChart, Activity, X, Plus, Trash2 } from "lucide-react";

interface WidgetBuilderProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (config: WidgetConfig) => void;
    initialConfig?: WidgetConfig | null;
}

interface Dataset {
    table_name: string;
    filename: string;
    extension?: string;
    dashboard_id?: string | null;
}

export function WidgetBuilder({ open, onOpenChange, onSave, initialConfig }: WidgetBuilderProps) {
    const { getDatasetsUsedByCurrentDashboard, currentDashboard } = useDashboard();
    const [title, setTitle] = useState("");
    const [dataset, setDataset] = useState("");
    const [type, setType] = useState<WidgetConfig['type']>("metric");
    const [chartType, setChartType] = useState<WidgetConfig['chartType']>("bar");
    const [xAxis, setXAxis] = useState("");
    const [breakdown, setBreakdown] = useState("");
    const [yAxis, setYAxis] = useState("");
    const [aggregation, setAggregation] = useState<WidgetConfig['aggregation']>("COUNT");
    const [colSpan, setColSpan] = useState<number>(2);
    const [limit, setLimit] = useState<number>(10);
    const [color, setColor] = useState<string>("default");
    const [orderBy, setOrderBy] = useState<string>("");
    const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>("ASC");
    const [latAxis, setLatAxis] = useState("");
    const [lonAxis, setLonAxis] = useState("");
    const [labelAxis, setLabelAxis] = useState("");
    const [sizeAxis, setSizeAxis] = useState("");
    const [colorColumn, setColorColumn] = useState("");

    useEffect(() => {
        if (open && initialConfig) {
            setTitle(initialConfig.title);
            setDataset(initialConfig.dataset);
            setType(initialConfig.type);
            setChartType(initialConfig.chartType || "bar");
            setXAxis(initialConfig.xAxis || "");
            setBreakdown(initialConfig.breakdown || "");
            setYAxis(initialConfig.yAxis || "");
            setAggregation(initialConfig.aggregation || "COUNT");
            setColSpan(initialConfig.colSpan || (initialConfig.type === 'metric' ? 1 : initialConfig.type === 'map' ? 2 : 2));
            setLimit(initialConfig.limit || 10);
            setColor(initialConfig.color || "default");
            setOrderBy(initialConfig.orderBy || "");
            setOrderDirection(initialConfig.orderDirection || "ASC");
            setLatAxis(initialConfig.latAxis || "");
            setLonAxis(initialConfig.lonAxis || "");
            setLabelAxis(initialConfig.labelAxis || "");
            setSizeAxis(initialConfig.sizeAxis || "");
            setColorColumn(initialConfig.colorColumn || "");
        } else if (open && !initialConfig) {
            resetForm();
        }
    }, [open, initialConfig]);

    // Fetch Datasets
    const { data: datasets } = useQuery<Dataset[]>({
        queryKey: ["datasets"],
        queryFn: async () => {
            const res = await api.get("/datasets/");
            return res.data;
        }
    });

    // Fetch Columns when Dataset changes
    const { data: columns } = useQuery<string[]>({
        queryKey: ["columns", dataset],
        queryFn: async () => {
            if (!dataset) return [];
            const secureQuery = {
                table: dataset,
                columns: ['*'],
                limit: 1
            };
            const res = await api.post("/sql/execute-secure", secureQuery);
            if (res.data && res.data.length > 0) {
                return Object.keys(res.data[0]);
            }
            return [];
        },
        enabled: !!dataset
    });

    const handleSave = () => {
        const config: WidgetConfig = {
            id: initialConfig?.id || crypto.randomUUID(),
            type,
            title: title || `${type} of ${dataset}`,
            dataset,
            chartType: type === 'chart' ? chartType : undefined,
            xAxis: type === 'chart' ? xAxis : undefined,
            breakdown: (type === 'chart' && breakdown) ? breakdown : undefined,
            yAxis: (type === 'chart' || type === 'metric') ? yAxis : undefined,
            aggregation: (type === 'chart' || type === 'metric') ? aggregation : undefined,
            limit: limit,
            colSpan: colSpan as any || undefined,
            color: color,
            orderBy: (type === 'chart' || type === 'table') ? orderBy : undefined,
            orderDirection: (type === 'chart' || type === 'table') ? orderDirection : undefined,
            // Map specific
            latAxis: type === 'map' ? latAxis : undefined,
            lonAxis: type === 'map' ? lonAxis : undefined,
            labelAxis: type === 'map' ? labelAxis : undefined,
            sizeAxis: type === 'map' ? sizeAxis : undefined,
            colorColumn: type === 'map' ? colorColumn : undefined,
        };
        onSave(config);
        onOpenChange(false);
        resetForm();
    };

    const resetForm = () => {
        setTitle("");
        setDataset("");
        setType("metric");
        setChartType("bar");
        setXAxis("");
        setBreakdown("");
        setYAxis("");
        setAggregation("COUNT");
        setColSpan(2);
        setLimit(10);
        setColor("default");
        setOrderBy("");
        setOrderDirection("ASC");
        setLatAxis("");
        setLonAxis("");
        setLabelAxis("");
        setSizeAxis("");
        setColorColumn("");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialConfig ? 'Editar Widget' : 'Nuevo Widget'}</DialogTitle>
                    <DialogDescription>
                        Configura la visualización de tus datos.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Título
                        </Label>
                        <Input
                            id="title"
                            placeholder="Título (opcional)"
                            className="col-span-3"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dataset" className="text-right">
                            Dataset
                        </Label>
                        <Select value={dataset} onValueChange={setDataset}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar tabla..." />
                            </SelectTrigger>
                            <SelectContent>
                                {(() => {
                                    const dashboardDatasets = getDatasetsUsedByCurrentDashboard();

                                    const linkedDatasets = datasets?.filter(d =>
                                        d.dashboard_id === currentDashboard?.id ||
                                        dashboardDatasets.includes(d.table_name)
                                    ) || [];

                                    const otherDatasets = datasets?.filter(d =>
                                        d.dashboard_id !== currentDashboard?.id &&
                                        !dashboardDatasets.includes(d.table_name)
                                    ) || [];

                                    if (linkedDatasets.length === 0 && otherDatasets.length === 0) {
                                        return <div className="p-2 text-sm text-muted-foreground">No hay datasets disponibles</div>;
                                    }

                                    return (
                                        <>
                                            {linkedDatasets.length > 0 && (
                                                <>
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                                        De este Dashboard
                                                    </div>
                                                    {linkedDatasets.map((d) => (
                                                        <SelectItem key={d.table_name} value={d.table_name}>
                                                            <div className="flex items-center gap-2">
                                                                {d.extension?.toLowerCase() === 'view' ? (
                                                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                                                ) : (
                                                                    <DatabaseIcon className="h-4 w-4 text-primary" />
                                                                )}
                                                                <span>{d.filename}</span>
                                                                {dashboardDatasets.includes(d.table_name) && (
                                                                    <span className="ml-auto text-xs text-blue-600 dark:text-blue-400" title="En uso">✓</span>
                                                                )}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </>
                                            )}

                                            {otherDatasets.length > 0 && (
                                                <>
                                                    {linkedDatasets.length > 0 && (
                                                        <div className="my-1 border-t" />
                                                    )}
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                                        Otros Datasets
                                                    </div>
                                                    {otherDatasets.map((d) => (
                                                        <SelectItem key={d.table_name} value={d.table_name}>
                                                            <div className="flex items-center gap-2 opacity-70">
                                                                {d.extension?.toLowerCase() === 'view' ? (
                                                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                                                ) : (
                                                                    <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
                                                                )}
                                                                <span>{d.filename}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="width" className="text-right">
                            Ancho
                        </Label>
                        <Select value={String(colSpan)} onValueChange={(v) => setColSpan(Number(v))}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar ancho" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Columna (Pequeño)</SelectItem>
                                <SelectItem value="2">2 Columnas (Mediano)</SelectItem>
                                <SelectItem value="3">3 Columnas (Grande)</SelectItem>
                                <SelectItem value="4">Ancho Completo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Widget Type Tabs */}
                    <Tabs value={type} onValueChange={(v: any) => setType(v)} className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                            <TabsTrigger value="metric" className="flex items-center gap-2">
                                <Binary className="h-4 w-4" /> Métrica
                            </TabsTrigger>
                            <TabsTrigger value="chart" className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" /> Gráfico
                            </TabsTrigger>
                            <TabsTrigger value="table" className="flex items-center gap-2">
                                <TableIcon className="h-4 w-4" /> Tabla
                            </TabsTrigger>
                            <TabsTrigger value="map" className="flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Mapa
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="map" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Latitud (Eje Y)</Label>
                                    <Select value={latAxis} onValueChange={setLatAxis}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Columna de Latitud..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns?.map((col) => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Debe contener números decimales (-90 a 90)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Longitud (Eje X)</Label>
                                    <Select value={lonAxis} onValueChange={setLonAxis}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Columna de Longitud..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns?.map((col) => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Debe contener números decimales (-180 a 180)</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Etiqueta (Título)</Label>
                                    <Select value={labelAxis} onValueChange={setLabelAxis}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ej: Nombre de Ciudad..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns?.map((col) => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tamaño (Burbuja)</Label>
                                    <Select value={sizeAxis} onValueChange={setSizeAxis}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Ej: Total Ventas..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns?.map((col) => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Color Principal</Label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { val: 'default', bg: 'bg-slate-500' },
                                        { val: '#0ea5e9', bg: 'bg-sky-500' },
                                        { val: '#22c55e', bg: 'bg-green-500' },
                                        { val: '#eab308', bg: 'bg-yellow-500' },
                                        { val: '#f43f5e', bg: 'bg-rose-500' },
                                        { val: '#8b5cf6', bg: 'bg-violet-500' },
                                        { val: '#f97316', bg: 'bg-orange-500' },
                                        { val: '#ec4899', bg: 'bg-pink-500' },
                                        { val: '#14b8a6', bg: 'bg-teal-500' },
                                        { val: '#6366f1', bg: 'bg-indigo-500' },
                                    ].map((c) => (
                                        <div
                                            key={c.val}
                                            className={`h-8 rounded cursor-pointer border-2 transition-all ${c.bg} ${color === c.val ? 'border-foreground scale-110 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                            onClick={() => setColor(c.val)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
                                <Label className="text-right">Ordenar por</Label>
                                <div className="col-span-3 grid grid-cols-2 gap-2">
                                    <Select value={orderBy} onValueChange={setOrderBy}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Columna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default_none">Sin orden específico</SelectItem>
                                            {columns?.map((col) => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={orderDirection} onValueChange={(v) => setOrderDirection(v as 'ASC' | 'DESC')} disabled={!orderBy || orderBy === 'default_none'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ASC">
                                                <div className="flex items-center"><ArrowUp className="w-3 h-3 mr-2" /> Ascendente</div>
                                            </SelectItem>
                                            <SelectItem value="DESC">
                                                <div className="flex items-center"><ArrowDown className="w-3 h-3 mr-2" /> Descendente</div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
                                <Label className="text-right">Límite</Label>
                                <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Cantidad de puntos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">Top 10</SelectItem>
                                        <SelectItem value="50">Top 50</SelectItem>
                                        <SelectItem value="100">Top 100</SelectItem>
                                        <SelectItem value="500">Top 500</SelectItem>
                                        <SelectItem value="1000">Top 1000</SelectItem>
                                        <SelectItem value="5000">Top 5000</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        {/* Metric Config */}
                        <TabsContent value="metric" className="space-y-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Agregación</Label>
                                <Select value={aggregation} onValueChange={(v) => setAggregation(v as any)}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">Valor directo (Sin agregación)</SelectItem>
                                        <SelectItem value="COUNT">Contar Registros</SelectItem>
                                        <SelectItem value="SUM">Suma</SelectItem>
                                        <SelectItem value="AVG">Promedio</SelectItem>
                                        <SelectItem value="MAX">Máximo</SelectItem>
                                        <SelectItem value="MIN">Mínimo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {aggregation !== 'COUNT' && (
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right">Campo</Label>
                                    <Select value={yAxis} onValueChange={setYAxis}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="Seleccionar campo numérico" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns?.map((col) => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Color</Label>
                                <Select value={color} onValueChange={setColor}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Color Corporativo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 rounded-full mr-2 bg-gradient-to-r from-blue-500 to-purple-500" />
                                                Automático
                                            </div>
                                        </SelectItem>
                                        {[
                                            { label: "Azul Corporativo", value: "#0ea5e9" },
                                            { label: "Turquesa Profesional", value: "#0891b2" },
                                            { label: "Índigo Moderno", value: "#6366f1" },
                                            { label: "Violeta Creativo", value: "#8b5cf6" },
                                            { label: "Verde Éxito", value: "#22c55e" },
                                            { label: "Amarillo Energía", value: "#eab308" },
                                            { label: "Naranja Dinámico", value: "#f97316" },
                                            { label: "Rojo Impacto", value: "#ef4444" },
                                            { label: "Gris Neutro", value: "#64748b" },
                                        ].map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                <div className="flex items-center">
                                                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: c.value }} />
                                                    {c.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        {/* Chart Config */}
                        <TabsContent value="chart" className="space-y-2">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Tipo</Label>
                                <div className="col-span-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                                    {[
                                        { id: 'bar', label: 'Barras Verticales', icon: BarChart3 },
                                        { id: 'bar-horizontal', label: 'Barras Horizontales', icon: AlignLeft },
                                        { id: 'line', label: 'Línea', icon: LineChart },
                                        { id: 'area', label: 'Área', icon: AreaChart },
                                        { id: 'pie', label: 'Circular', icon: PieChart },
                                        { id: 'donut', label: 'Donut', icon: Circle },
                                    ].map((chart) => (
                                        <Button
                                            key={chart.id}
                                            variant={chartType === chart.id ? "default" : "outline"}
                                            title={chart.label}
                                            className={`flex items-center justify-center h-auto py-2 px-3 cursor-pointer ${chartType === chart.id ? 'bg-primary text-primary-foreground' : ''}`}
                                            onClick={() => setChartType(chart.id as any)}
                                        >
                                            <chart.icon className="w-4 h-4" />
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Eje X</Label>
                                <Select value={xAxis} onValueChange={setXAxis}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Categoría/Tiempo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {columns?.map((col) => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Agrupar Por</Label>
                                <Select value={breakdown} onValueChange={(v) => setBreakdown(v === "default_none" ? "" : v)}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Opcional (Desglose)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default_none">Ninguno</SelectItem>
                                        {columns?.map((col) => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Agregación</Label>
                                <Select value={aggregation} onValueChange={(v) => setAggregation(v as any)}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE">Valor directo (Sin agregación)</SelectItem>
                                        <SelectItem value="COUNT">Contar Registros</SelectItem>
                                        <SelectItem value="SUM">Suma</SelectItem>
                                        <SelectItem value="AVG">Promedio</SelectItem>
                                        <SelectItem value="MAX">Máximo</SelectItem>
                                        <SelectItem value="MIN">Mínimo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Eje Y</Label>
                                <Select value={yAxis} onValueChange={setYAxis}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Valor a Medir" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {columns?.map((col) => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Límite</Label>
                                <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Cantidad de puntos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">Top 10</SelectItem>
                                        <SelectItem value="20">Top 20</SelectItem>
                                        <SelectItem value="50">Top 50</SelectItem>
                                        <SelectItem value="100">Top 100</SelectItem>
                                        <SelectItem value="500">Top 500</SelectItem>
                                        <SelectItem value="1000">Top 1000</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Color</Label>
                                <Select value={color} onValueChange={setColor}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Color Corporativo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 rounded-full mr-2 bg-gradient-to-r from-blue-500 to-purple-500" />
                                                Multicolor (Automático)
                                            </div>
                                        </SelectItem>
                                        {[
                                            { label: "Azul Corporativo", value: "#0ea5e9" },
                                            { label: "Turquesa Profesional", value: "#0891b2" },
                                            { label: "Índigo Moderno", value: "#6366f1" },
                                            { label: "Violeta Creativo", value: "#8b5cf6" },
                                            { label: "Verde Éxito", value: "#22c55e" },
                                            { label: "Amarillo Energía", value: "#eab308" },
                                            { label: "Naranja Dinámico", value: "#f97316" },
                                            { label: "Rojo Impacto", value: "#ef4444" },
                                            { label: "Gris Neutro", value: "#64748b" },
                                        ].map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                <div className="flex items-center">
                                                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: c.value }} />
                                                    {c.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
                                <Label className="text-right">Ordenar por</Label>
                                <div className="col-span-3 grid grid-cols-2 gap-2">
                                    <Select value={orderBy} onValueChange={setOrderBy}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Columna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default_none">Sin orden específico</SelectItem>
                                            {columns?.map((col) => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={orderDirection} onValueChange={(v) => setOrderDirection(v as 'ASC' | 'DESC')} disabled={!orderBy || orderBy === 'default_none'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ASC">
                                                <div className="flex items-center"><ArrowUp className="w-3 h-3 mr-2" /> Ascendente</div>
                                            </SelectItem>
                                            <SelectItem value="DESC">
                                                <div className="flex items-center"><ArrowDown className="w-3 h-3 mr-2" /> Descendente</div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Table Config */}
                        <TabsContent value="table" className="space-y-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Registros</Label>
                                <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Seleccionar cantidad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10 Registros</SelectItem>
                                        <SelectItem value="50">50 Registros</SelectItem>
                                        <SelectItem value="100">100 Registros</SelectItem>
                                        <SelectItem value="500">500 Registros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Color</Label>
                                <Select value={color} onValueChange={setColor}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Color Corporativo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 rounded-full mr-2 bg-gradient-to-r from-blue-500 to-purple-500" />
                                                Automático
                                            </div>
                                        </SelectItem>
                                        {[
                                            { label: "Azul Corporativo", value: "#0ea5e9" },
                                            { label: "Turquesa Profesional", value: "#0891b2" },
                                            { label: "Índigo Moderno", value: "#6366f1" },
                                            { label: "Violeta Creativo", value: "#8b5cf6" },
                                            { label: "Verde Éxito", value: "#22c55e" },
                                            { label: "Amarillo Energía", value: "#eab308" },
                                            { label: "Naranja Dinámico", value: "#f97316" },
                                            { label: "Rojo Impacto", value: "#ef4444" },
                                            { label: "Gris Neutro", value: "#64748b" },
                                        ].map((c) => (
                                            <SelectItem key={c.value} value={c.value}>
                                                <div className="flex items-center">
                                                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: c.value }} />
                                                    {c.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4 border-t pt-4">
                                <Label className="text-right">Ordenar por</Label>
                                <div className="col-span-3 grid grid-cols-2 gap-2">
                                    <Select value={orderBy} onValueChange={setOrderBy}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Columna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default_none">Sin orden específico</SelectItem>
                                            {columns?.map((col) => (
                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={orderDirection} onValueChange={(v) => setOrderDirection(v as 'ASC' | 'DESC')} disabled={!orderBy || orderBy === 'default_none'}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ASC">
                                                <div className="flex items-center"><ArrowUp className="w-3 h-3 mr-2" /> Ascendente</div>
                                            </SelectItem>
                                            <SelectItem value="DESC">
                                                <div className="flex items-center"><ArrowDown className="w-3 h-3 mr-2" /> Descendente</div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground text-center pt-2">
                                Se habilitará paginación automática para navergar los datos.
                            </p>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={!dataset} className="bg-gradient-to-r from-blue-600 to-purple-600">
                        {initialConfig ? "Actualizar Widget" : "Crear Widget"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

