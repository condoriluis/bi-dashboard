"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3, LineChart, PieChart, AreaChart, Database, Settings2, Activity, ArrowUpDown, Sparkles, DatabaseIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/contexts/DashboardContext";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const PlotlyChart = dynamic(() => import("react-plotly.js"), { ssr: false });

interface Dataset {
    table_name: string;
    filename: string;
    extension?: string;
    dashboard_id?: string | null;
}

interface ChartBuilderProps {
    className?: string;
}

export default function ChartBuilder({ className }: ChartBuilderProps) {
    const { getDatasetsUsedByCurrentDashboard, currentDashboard } = useDashboard();
    const [columns, setColumns] = useState<string[]>([]);

    const [selectedDataset, setSelectedDataset] = useState<string>("");
    const [chartEngine, setChartEngine] = useState<"apex" | "plotly">("apex");
    const [chartType, setChartType] = useState<"bar" | "line" | "area" | "pie" | "donut">("bar");
    const [xAxis, setXAxis] = useState<string>("");
    const [yAxis, setYAxis] = useState<string>("");
    const [aggFunc, setAggFunc] = useState<"SUM" | "AVG" | "COUNT" | "MIN" | "MAX" | "NONE">("SUM");
    const [limit, setLimit] = useState<string>("50");
    const [orderBy, setOrderBy] = useState<string>("x_asc");

    const [chartData, setChartData] = useState<any[]>([]);
    const [loadingChart, setLoadingChart] = useState(false);
    const [error, setError] = useState<string>("");

    const [isDarkMode, setIsDarkMode] = useState(false);

    const { data: datasets = [], isLoading: loadingDatasets } = useQuery({
        queryKey: ["datasets"],
        queryFn: async () => {
            const res = await api.get("/datasets/");
            return res.data as Dataset[];
        }
    });

    useEffect(() => {
        const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (selectedDataset) {
            fetchColumns(selectedDataset);
        } else {
            setColumns([]);
        }
    }, [selectedDataset]);

    useEffect(() => {
        if (selectedDataset && xAxis && yAxis && aggFunc) {
            generateChart();
        }
    }, [selectedDataset, xAxis, yAxis, aggFunc, chartType, orderBy, limit]);

    const fetchColumns = async (tableName: string) => {
        try {

            const res = await api.post("/sql/execute", {
                query: `SELECT * FROM ${tableName} LIMIT 1`
            });
            const data = res.data;
            if (Array.isArray(data) && data.length > 0) {
                setColumns(Object.keys(data[0]));

                if (!xAxis) setXAxis(Object.keys(data[0])[0]);
                if (!yAxis) setYAxis(Object.keys(data[0])[1] || Object.keys(data[0])[0]);
            }
        } catch (err) {
            console.error("Error fetching columns", err);
            setError("No se pudieron obtener las columnas del dataset.");
        }
    };

    const generateChart = async () => {
        setLoadingChart(true);
        setError("");

        try {
            // Construct SQL Query for Aggregation
            const isDirect = aggFunc === "NONE";
            const aggExpression = isDirect ? yAxis : (aggFunc === "COUNT" ? "COUNT(*)" : `${aggFunc}(${yAxis})`);

            let orderByClause = "x_val ASC";
            if (orderBy === "x_desc") orderByClause = "x_val DESC";
            if (orderBy === "y_asc") orderByClause = "y_val ASC";
            if (orderBy === "y_desc") orderByClause = "y_val DESC";

            const query = `
                SELECT ${xAxis} as x_val, ${aggExpression} as y_val 
                FROM ${selectedDataset} 
                ${isDirect ? "" : `GROUP BY ${xAxis}`}
                ORDER BY ${orderByClause} 
                LIMIT ${limit}
            `;

            const res = await api.post("/sql/execute", { query });
            const data = res.data;

            if (Array.isArray(data)) {
                setChartData(data);
            }
        } catch (err: any) {
            console.error("Error generating chart", err);
            const errorDetail = err.response?.data?.detail || "";

            if (errorDetail.includes("Binder Error") && errorDetail.includes("sum(VARCHAR)")) {
                setError("No se puede realizar una suma (SUM) sobre una columna de texto. Por favor, selecciona una columna numérica o cambia la operación a 'Conteo' (COUNT).");
            } else if (errorDetail.includes("Binder Error")) {
                setError("Error de compatibilidad de datos. Verifica que la columna seleccionada sea compatible con la operación matemática (ej. no puedes promediar textos).");
            } else {
                setError(errorDetail || "Error al generar el gráfico. Revisa tu configuración.");
            }
        } finally {
            setLoadingChart(false);
        }
    };

    // Prepare Series and Options for ApexCharts
    const apexSeries = useMemo(() => {
        const data = chartData.map(d => typeof d.y_val === 'bigint' ? Number(d.y_val) : d.y_val);

        if (chartType === "pie" || chartType === "donut") {
            return data;
        }

        return [{
            name: aggFunc === "NONE" ? yAxis : `${aggFunc} de ${yAxis}`,
            data: data
        }];
    }, [chartData, aggFunc, yAxis, chartType]);

    const apexOptions = useMemo(() => {
        const labels = chartData.map(d => String(d.x_val));

        const baseOptions: any = {
            chart: {
                background: 'transparent',
                toolbar: { show: true },
                animations: { enabled: true }
            },
            theme: {
                mode: isDarkMode ? 'dark' : 'light',
                palette: 'palette1'
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            xaxis: {
                categories: labels,
                labels: {
                    style: { fontSize: '12px' }
                }
            },
            colors: ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
            fill: { opacity: 0.8 },
            tooltip: { theme: isDarkMode ? 'dark' : 'light' }
        };

        if (chartType === "pie" || chartType === "donut") {
            return {
                ...baseOptions,
                labels: labels,
                stroke: { show: false },
                legend: { position: 'bottom' }
            };
        }

        return baseOptions;
    }, [chartData, chartType, isDarkMode]);

    // Prepare Data for Plotly
    const plotlyData = useMemo(() => {
        const x = chartData.map(d => String(d.x_val));
        const y = chartData.map(d => typeof d.y_val === 'bigint' ? Number(d.y_val) : d.y_val);

        let type: "bar" | "scatter" | "pie" = "bar";
        let mode: "lines+markers" | undefined = undefined;
        let fill: "tozeroy" | undefined = undefined;

        if (chartType === "line") {
            type = "scatter";
            mode = "lines+markers";
        } else if (chartType === "area") {
            type = "scatter";
            fill = "tozeroy";
        } else if (chartType === "pie" || chartType === "donut") {
            type = "pie";
            return [{
                labels: x,
                values: y,
                type: type,
                hole: chartType === "donut" ? 0.4 : 0,
                marker: { colors: ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'] }
            }];
        } else {
            type = "bar";
        }

        return [{
            x: x,
            y: y,
            type: type,
            mode: mode,
            fill: fill,
            marker: {
                color: type === 'bar' ? '#0ea5e9' : '#0ea5e9',
                line: { color: '#ffffff', width: 1.5 }
            },
            hovertemplate: `<b>%{x}</b><br>${aggFunc === 'NONE' ? yAxis : aggFunc}: %{y}<extra></extra>`
        }];
    }, [chartData, chartType, aggFunc]);

    const plotlyLayout = useMemo(() => {
        const textColor = isDarkMode ? '#94a3b8' : '#64748b';
        const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

        return {
            width: undefined,
            height: 350,
            title: { text: undefined },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 12, color: textColor },
            margin: { t: 20, b: 40, l: 60, r: 20 },
            xaxis: {
                title: { text: xAxis, font: { size: 13, weight: 600, color: textColor } },
                automargin: true,
                showgrid: false,
                zeroline: false,
                tickfont: { color: textColor }
            },
            yaxis: {
                title: { text: aggFunc === 'NONE' ? yAxis : `${aggFunc} (${yAxis})`, font: { size: 13, weight: 600, color: textColor } },
                automargin: true,
                showgrid: true,
                gridcolor: gridColor,
                zeroline: false,
                tickfont: { color: textColor }
            },
            hoverlabel: {
                bgcolor: isDarkMode ? '#1e293b' : '#ffffff',
                bordercolor: isDarkMode ? '#334155' : '#e2e8f0',
                font: { family: 'ui-sans-serif, system-ui, sans-serif', size: 13, color: isDarkMode ? '#f8fafc' : '#1e293b' }
            },
            showlegend: false
        };
    }, [xAxis, yAxis, aggFunc, isDarkMode]);


    return (
        <div className={`space-y-6 ${className}`}>

            {/* Controls */}
            <Card className="border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom duration-500">
                <CardHeader className="pb-5 border-b border-border/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Settings2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-lg leading-none">Configuración del Gráfico</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">Datasets, motor y visualización</p>
                            </div>
                        </div>

                        {/* ENGINE SELECTOR */}
                        <div className="flex items-center gap-2 bg-background rounded-xl border border-input p-1">
                            <span className="text-[11px] font-semibold px-2 text-muted-foreground uppercase tracking-wide">Motor</span>
                            <Tabs value={chartEngine} onValueChange={(v: any) => v && setChartEngine(v)} className="h-8">
                                <TabsList className="h-8 bg-transparent p-0">
                                    <TabsTrigger value="apex" className="h-8 px-3 text-xs rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                        ApexCharts
                                    </TabsTrigger>
                                    <TabsTrigger value="plotly" className="h-8 px-3 text-xs rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                                        Plotly
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                </CardHeader>

                {/* CONTENT */}
                <CardContent className="grid gap-8 md:grid-cols-2">
                    {/* ===================== LEFT COLUMN – DATASET ===================== */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Fuente de Datos</h3>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {/* Dataset */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Dataset
                                </label>
                                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                                    <SelectTrigger className="bg-background rounded-xl">
                                        <SelectValue placeholder="Selecciona un dataset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(() => {
                                            const dashboardDatasets = getDatasetsUsedByCurrentDashboard();

                                            // 1. Filter datasets belonging to this dashboard (linked or used)
                                            const linkedDatasets = datasets.filter(d =>
                                                d.dashboard_id === currentDashboard?.id ||
                                                dashboardDatasets.includes(d.table_name)
                                            );

                                            // 2. Filter other datasets (global or from other dashboards)
                                            const otherDatasets = datasets.filter(d =>
                                                d.dashboard_id !== currentDashboard?.id &&
                                                !dashboardDatasets.includes(d.table_name)
                                            );

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
                                                            {linkedDatasets.map(d => (
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
                                                            {otherDatasets.map(d => (
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

                            {/* X Axis */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Eje X · Categoría
                                </label>
                                <Select
                                    value={xAxis}
                                    onValueChange={setXAxis}
                                    disabled={!selectedDataset}
                                >
                                    <SelectTrigger className="bg-background rounded-xl">
                                        <SelectValue placeholder="Selecciona columna" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {columns.map(c => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Y Axis */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Eje Y · Métrica
                                </label>
                                <div className="flex gap-2">
                                    <Select
                                        value={aggFunc}
                                        onValueChange={(v: any) => setAggFunc(v)}
                                        disabled={!selectedDataset}
                                    >
                                        <SelectTrigger className="w-[110px] bg-background rounded-xl text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SUM">SUM</SelectItem>
                                            <SelectItem value="AVG">AVG</SelectItem>
                                            <SelectItem value="COUNT">COUNT</SelectItem>
                                            <SelectItem value="MIN">MIN</SelectItem>
                                            <SelectItem value="MAX">MAX</SelectItem>
                                            <SelectItem value="NONE">Valor Directo</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={yAxis}
                                        onValueChange={setYAxis}
                                        disabled={!selectedDataset}
                                    >
                                        <SelectTrigger className="flex-1 bg-background rounded-xl">
                                            <SelectValue placeholder="Selecciona columna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {columns.map(c => (
                                                <SelectItem key={c} value={c}>
                                                    {c}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Sort & Limit */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                Orden y límite
                            </label>
                            <div className="flex gap-2">
                                <Select value={orderBy} onValueChange={setOrderBy} disabled={!selectedDataset}>
                                    <SelectTrigger className="flex-1 bg-background rounded-xl text-xs">
                                        <SelectValue placeholder="Orden" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="x_asc">Eje X (A–Z)</SelectItem>
                                        <SelectItem value="x_desc">Eje X (Z–A)</SelectItem>
                                        <SelectItem value="y_desc">Valor (Mayor)</SelectItem>
                                        <SelectItem value="y_asc">Valor (Menor)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={limit} onValueChange={setLimit} disabled={!selectedDataset}>
                                    <SelectTrigger className="w-[90px] bg-background rounded-xl text-xs">
                                        <SelectValue placeholder="Top" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="25">25</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                        <SelectItem value="500">500</SelectItem>
                                        <SelectItem value="1000">1k</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* ===================== RIGHT COLUMN – ENGINE & GRAPHICS ===================== */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Visualización</h3>
                        </div>

                        {/* Chart Type */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Tipo de gráfico</label>
                            <Tabs value={chartType} onValueChange={(v: any) => setChartType(v)} className="w-full">
                                <TabsList className="grid grid-cols-4 rounded-xl">
                                    <TabsTrigger value="bar" title="Barras" className="rounded-xl"><BarChart3 className="h-4 w-4" /></TabsTrigger>
                                    <TabsTrigger value="line" title="Líneas" className="rounded-xl"><LineChart className="h-4 w-4" /></TabsTrigger>
                                    <TabsTrigger value="area" title="Área" className="rounded-xl"><AreaChart className="h-4 w-4" /></TabsTrigger>
                                    <TabsTrigger value="pie" title="Pie" className="rounded-xl"><PieChart className="h-4 w-4" /></TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* UX Hint */}
                        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground bg-background/50">
                            El motor seleccionado define el rendimiento y las opciones avanzadas de renderizado del gráfico.
                        </div>
                    </div>
                </CardContent>
            </Card>


            {/* ERROR */}
            {error && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center justify-center animate-in slide-in-from-top-2">
                    {error}
                </div>
            )}

            {/* CHART DISPLAY */}
            <Card className="min-h-[400px] border-primary/20 shadow-lg relative overflow-hidden transition-all duration-300">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                {selectedDataset ? `${aggFunc === 'NONE' ? yAxis : `${aggFunc} de ${yAxis}`} por ${xAxis}` : "Vista Previa"}
                                {chartEngine === 'apex' && selectedDataset && <Badge variant="outline" className="text-xs font-normal">ApexCharts</Badge>}
                                {chartEngine === 'plotly' && selectedDataset && <Badge variant="outline" className="text-xs font-normal">Plotly</Badge>}
                            </CardTitle>
                            <CardDescription>
                                {selectedDataset ? `Datos obtenidos de ${selectedDataset}` : "Configura los datos para ver el gráfico"}
                            </CardDescription>
                        </div>
                        {selectedDataset && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                                {chartData.length} registros
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingChart ? (
                        <div className="flex h-[300px] items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : selectedDataset && chartData.length > 0 ? (
                        <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-[350px]">
                            {chartEngine === "apex" ? (
                                <ApexChart
                                    options={apexOptions}
                                    series={apexSeries}
                                    type={chartType}
                                    height={350}
                                    width="100%"
                                />
                            ) : (
                                <div className="w-full h-full">
                                    <PlotlyChart
                                        data={plotlyData}
                                        layout={plotlyLayout}
                                        config={{ responsive: true, displayModeBar: true }}
                                        style={{ width: "100%", height: "100%" }}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                            <Activity className="h-12 w-12 mb-3 opacity-20" />
                            <p>Selecciona un dataset y columnas para comenzar</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
