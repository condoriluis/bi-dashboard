"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3, LineChart, PieChart, AreaChart, Database, Settings2, Activity, ArrowUpDown, Sparkles, DatabaseIcon, AlignLeft, LayoutGrid, ScatterChart, Layers, Target, Filter, BarChartBig, Circle } from "lucide-react";
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
    const [chartType, setChartType] = useState<string>("bar");
    const [xAxis, setXAxis] = useState<string>("");
    const [yAxis, setYAxis] = useState<string>("");
    const [breakdown, setBreakdown] = useState<string>("none");
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
    }, [selectedDataset, xAxis, yAxis, aggFunc, chartType, orderBy, limit, breakdown]);

    const fetchColumns = async (tableName: string) => {
        try {
            const res = await api.post("/sql/execute-secure", {
                table: tableName,
                columns: ['*'],
                limit: 1
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
            const isDirect = aggFunc === "NONE";

            const columns = [
                { column: xAxis, alias: "x_val" },
                {
                    column: yAxis,
                    function: isDirect ? undefined : aggFunc,
                    alias: "y_val"
                }
            ];

            if (breakdown && breakdown !== "none") {
                columns.push({ column: breakdown, alias: "breakdown_val" });
            }

            const request: any = {
                table: selectedDataset,
                columns: columns,
                limit: parseInt(limit)
            };

            if (!isDirect) {
                request.groupBy = [xAxis];
                if (breakdown && breakdown !== "none") {
                    request.groupBy.push(breakdown);
                }
            }

            let orderCol = "x_val";
            let orderDir = "ASC";

            if (orderBy === "x_desc") { orderCol = "x_val"; orderDir = "DESC"; }
            if (orderBy === "y_asc") { orderCol = "y_val"; orderDir = "ASC"; }
            if (orderBy === "y_desc") { orderCol = "y_val"; orderDir = "DESC"; }

            request.orderBy = [{ column: orderCol, direction: orderDir }];

            const res = await api.post("/sql/execute-secure", request);
            const data = res.data;

            if (Array.isArray(data)) {
                setChartData(data);
            }
        } catch (err: any) {
            console.error("Error generating chart", err);
            const errorDetail = err.response?.data?.detail || "";

            if (errorDetail.includes("Binder Error") && errorDetail.includes("sum(VARCHAR)")) {
                setError("No se puede realizar una suma sobre texto. Cambia a COUNT o elige una columna numérica.");
            } else {
                setError(errorDetail || "Error al generar el gráfico.");
            }
        } finally {
            setLoadingChart(false);
        }
    };

    const apexSeries = useMemo(() => {
        if (!chartData || chartData.length === 0) return [];

        const isCircular = chartType === "pie" || chartType === "donut" || chartType === "polarArea";

        // 1. Handle Breakdown (Grouping)
        if (breakdown && breakdown !== "none" && !isCircular) {
            const categories = Array.from(new Set(chartData.map((d: any) => String(d.x_val)))).filter(Boolean);
            const seriesNames = Array.from(new Set(chartData.map((d: any) => String(d.breakdown_val)))).filter(Boolean);

            return seriesNames.map((seriesName: any) => {
                const seriesData = categories.map((cat: any) => {
                    const row = chartData.find((d: any) => String(d.x_val) === cat && String(d.breakdown_val) === seriesName);
                    const val = row ? (typeof row.y_val === 'bigint' ? Number(row.y_val) : row.y_val) : 0;
                    return val;
                });
                return { name: seriesName, data: seriesData };
            });
        }

        // 2. Standard Flat Data
        const data = chartData.map((d: any) => typeof d.y_val === 'bigint' ? Number(d.y_val) : d.y_val);

        if (isCircular) {
            return data;
        }

        if (chartType === "mixed") {
            return [
                { name: aggFunc === "NONE" ? yAxis : `${aggFunc} (${yAxis})`, type: 'column', data: data },
                { name: 'Tendencia', type: 'line', data: data }
            ];
        }

        return [{
            name: aggFunc === "NONE" ? yAxis : `${aggFunc} de ${yAxis}`,
            data: data
        }];
    }, [chartData, aggFunc, yAxis, chartType, breakdown]);

    const apexOptions = useMemo(() => {
        const isCircular = chartType === 'pie' || chartType === 'donut' || chartType === 'polarArea';
        let categories: string[] = [];

        if (breakdown && breakdown !== "none" && !isCircular) {
            categories = Array.from(new Set(chartData.map((d: any) => String(d.x_val)))).filter(Boolean);
        } else {
            categories = chartData.map((d: any) => String(d.x_val));
        }

        const baseOptions: any = {
            chart: {
                background: 'transparent',
                toolbar: { show: true },
                animations: { enabled: true },
                fontFamily: 'inherit',
                stacked: (chartType === 'bar' || chartType === 'column') && !!breakdown && breakdown !== "none"
            },
            theme: {
                mode: isDarkMode ? 'dark' : 'light',
                palette: 'palette1'
            },
            dataLabels: {
                enabled: isCircular || chartType === 'funnel',
                style: { colors: ['#fff'] },
                dropShadow: { enabled: true }
            },
            stroke: {
                curve: 'smooth',
                width: (chartType === 'area' ? 3 : (chartType === 'polarArea' ? 1 : (isCircular ? 0 : 2)))
            },
            xaxis: {
                categories: isCircular ? [] : categories,
                labels: {
                    style: { fontSize: '12px' },
                    rotate: -45,
                    trim: true
                },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                show: !isCircular,
                labels: {
                    formatter: (val: number) => {
                        return (chartType === 'bar-horizontal' || chartType === 'funnel' || chartType === 'heatmap')
                            ? val
                            : (typeof val === 'number' ? val.toLocaleString() : val);
                    }
                }
            },
            grid: {
                show: !isCircular,
                xaxis: { lines: { show: (chartType === 'bar-horizontal' || chartType === 'funnel') } },
                yaxis: { lines: { show: (chartType !== 'bar-horizontal' && chartType !== 'funnel') } }
            },
            colors: ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
            fill: {
                opacity: (chartType === 'area' || isCircular) ? 0.7 : 1,
                gradient: (chartType === 'area') ? {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 90, 100]
                } : undefined
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    horizontal: chartType === 'bar-horizontal' || chartType === 'funnel',
                    isFunnel: chartType === 'funnel',
                    columnWidth: chartType === 'funnel' ? '80%' : '60%',
                },
                pie: { donut: { labels: { show: true, total: { show: true, label: 'Total' } } } },
                polarArea: { rings: { strokeWidth: 1 }, spokes: { strokeWidth: 1 } },
                heatmap: { radius: 2, enableShades: true, shadeIntensity: 0.5 }
            },
            tooltip: {
                theme: isDarkMode ? 'dark' : 'light',
                marker: { show: true }
            },
            markers: {
                size: (chartType === 'scatter' || chartType === 'mixed') ? 5 : 0,
                hover: { size: 7 }
            },
            legend: {
                position: 'bottom',
                show: isCircular || chartType === 'mixed' || (breakdown && breakdown !== 'none')
            }
        };

        if (isCircular) {
            return {
                ...baseOptions,
                labels: categories,
                stroke: { show: false },
                plotOptions: baseOptions.plotOptions
            };
        }

        return baseOptions;
    }, [chartData, chartType, isDarkMode]);

    // Prepare Data for Plotly
    const plotlyData = useMemo(() => {
        const x = chartData.map((d: any) => String(d.x_val));
        const y = chartData.map((d: any) => typeof d.y_val === 'bigint' ? Number(d.y_val) : d.y_val);

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
                <CardContent className="grid gap-8 lg:grid-cols-5">
                    {/* ===================== LEFT COLUMN – DATASET ===================== */}
                    <div className="space-y-6 lg:col-span-3">
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

                                            const linkedDatasets = datasets.filter(d =>
                                                d.dashboard_id === currentDashboard?.id ||
                                                dashboardDatasets.includes(d.table_name)
                                            );

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
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Select
                                        value={aggFunc}
                                        onValueChange={(v: any) => setAggFunc(v)}
                                        disabled={!selectedDataset}
                                    >
                                        <SelectTrigger className="w-full sm:w-[110px] bg-background rounded-xl text-xs">
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
                                        <SelectTrigger className="w-full sm:flex-1 bg-background rounded-xl text-xs">
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

                            {/* Breakdown */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Desglosar por (Opcional)
                                </label>
                                <Select
                                    value={breakdown}
                                    onValueChange={setBreakdown}
                                    disabled={!selectedDataset}
                                >
                                    <SelectTrigger className="bg-background rounded-xl text-xs">
                                        <SelectValue placeholder="Ninguno" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Ninguno --</SelectItem>
                                        {columns.map(c => (
                                            <SelectItem key={c} value={c}>
                                                {c}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Sort & Limit */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <ArrowUpDown className="h-3.5 w-3.5" />
                                Orden y límite
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
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
                                    <SelectTrigger className="w-full sm:w-[90px] bg-background rounded-xl text-xs">
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
                    <div className="space-y-6 lg:col-span-2">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-semibold">Visualización</h3>
                        </div>

                        {/* Chart Type */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Tipo de gráfico</label>

                            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                                {[
                                    { id: 'bar', label: 'Barras', icon: BarChart3 },
                                    { id: 'bar-horizontal', label: 'Horiz.', icon: AlignLeft },
                                    { id: 'column', label: 'Columnas', icon: BarChartBig },
                                    { id: 'line', label: 'Línea', icon: LineChart },
                                    { id: 'area', label: 'Área', icon: AreaChart },
                                    { id: 'mixed', label: 'Mixto', icon: Layers },
                                    { id: 'pie', label: 'Circular', icon: PieChart },
                                    { id: 'donut', label: 'Donut', icon: Circle },
                                    { id: 'polarArea', label: 'Polar', icon: Target },
                                    { id: 'scatter', label: 'Dispers.', icon: ScatterChart },
                                    { id: 'heatmap', label: 'Heatmap', icon: LayoutGrid },
                                    { id: 'funnel', label: 'Embudo', icon: Filter },
                                ].map((chart) => (
                                    <Button
                                        key={chart.id}
                                        variant={chartType === chart.id ? "default" : "outline"}
                                        title={chart.label}
                                        className={`flex flex-col items-center justify-center h-14 p-1 space-y-0.5 ${chartType === chart.id ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground'}`}
                                        onClick={() => setChartType(chart.id)}
                                    >
                                        <chart.icon className="w-4 h-4 mb-0.5" />
                                        <span className="text-[9px] font-medium truncate w-full text-center leading-none">{chart.label}</span>
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* UX Hint */}
                        <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground bg-background/50">
                            El motor seleccionado define el rendimiento y las opciones avanzadas de renderizado del gráfico.
                        </div>
                    </div>
                </CardContent>
            </Card>


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
                        <div className="flex h-[250px] items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : selectedDataset && chartData.length > 0 ? (
                        <div className="animate-in fade-in zoom-in-95 duration-500 w-full h-[350px]">
                            {chartEngine === "apex" ? (
                                <ApexChart
                                    options={apexOptions}
                                    series={apexSeries}
                                    type={((chartType === 'bar-horizontal' || chartType === 'column' || chartType === 'funnel') ? 'bar' : (chartType === 'mixed' ? 'line' : chartType)) as any}
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
                                    {['pie', 'donut', 'line', 'bar', 'area'].includes(chartType) ? null : (
                                        <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                                            Plotly soporte limitado para {chartType}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-[250px] flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                            <Activity className="h-12 w-12 mb-3 opacity-20" />
                            <p>Selecciona un dataset y columnas para comenzar</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
