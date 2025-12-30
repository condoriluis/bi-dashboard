"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle, Trash2, MoreVertical, Pencil, ChevronLeft, ChevronRight, Download } from "lucide-react";
import dynamic from 'next/dynamic';
import { WidgetConfig, buildSecureQuery, formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const MapWidget = dynamic(() => import('./MapWidget'), { ssr: false });

interface DashboardWidgetProps {
    config: WidgetConfig;
    onDelete: (id: string) => void;
    onEdit: (config: WidgetConfig) => void;
}

function DashboardWidgetMenu({ config, onEdit, onDelete, onExport, triggerClassName }: { config: WidgetConfig, onEdit: (c: WidgetConfig) => void, onDelete: (id: string) => void, onExport?: () => void, triggerClassName?: string }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={`h-8 w-8 hover:text-primary ${triggerClassName || "text-muted-foreground"}`}>
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {onExport && (
                    <DropdownMenuItem onClick={onExport}>
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEdit(config)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(config.id)} className="text-red-600 focus:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function DashboardWidget({ config, onDelete, onEdit }: DashboardWidgetProps) {

    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const checkTheme = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        checkTheme();

        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    const { data: result, isLoading, error } = useQuery({
        queryKey: ["widget", config.id, config],
        queryFn: async () => {
            const secureQuery = buildSecureQuery(config);
            const res = await api.post("/sql/execute-secure", secureQuery);
            return res.data;
        },
        enabled: !!config.dataset,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 15,
    });

    const handleDownloadCSV = () => {
        if (!result || result.length === 0) return;

        // Get headers
        const headers = Object.keys(result[0]).join(",");
        const rows = result.map((row: any) => Object.values(row).map(value => `"${value}"`).join(",")).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${config.title || "widget_data"}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <Card className="h-full flex items-center justify-center min-h-[200px] border-primary/20">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </Card>
        );
    }

    if (error) {
        let errorDetail = (error as any)?.response?.data?.detail;

        if (typeof errorDetail === 'object' && errorDetail !== null) {
            errorDetail = JSON.stringify(errorDetail, null, 2);
        } else if (!errorDetail) {
            errorDetail = "Error al obtener datos";
        }

        errorDetail = String(errorDetail);

        const isMissingTable = errorDetail.includes("does not exist") || errorDetail.includes("Catalog Error");

        let missingTableName = config.dataset;
        const tableMatch = errorDetail.match(/Table with name (\w+) does not exist/);
        if (tableMatch) {
            missingTableName = tableMatch[1];
        }

        let suggestion = null;
        const suggestionMatch = errorDetail.match(/Did you mean "(\w+)"/);
        if (suggestionMatch) {
            suggestion = suggestionMatch[1];
        }

        return (
            <Card className="h-full border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        {isMissingTable ? "Fuente de Datos no Disponible" : "Error de Consulta"}
                    </CardTitle>
                    <DashboardWidgetMenu config={config} onEdit={onEdit} onDelete={onDelete} />
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2">
                            {isMissingTable ? (
                                <>
                                    <p className="font-medium">
                                        La vista o tabla <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs font-mono">{missingTableName}</code> ya no existe.
                                    </p>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-500/80">
                                        Esta transformación pudo haber sido eliminada. Por favor, edita este widget y selecciona una fuente de datos válida.
                                    </p>
                                    {suggestion && (
                                        <p className="text-xs text-amber-600/70 dark:text-amber-500/70 flex items-center gap-1">
                                            💡 Sugerencia: ¿Quizás quisiste usar <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded font-mono">{suggestion}</code>?
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="font-medium">
                                        Ocurrió un error al ejecutar la consulta de este widget.
                                    </p>
                                    <details className="text-xs text-amber-600/70 dark:text-amber-500/70">
                                        <summary className="cursor-pointer hover:text-amber-700 dark:hover:text-amber-400">
                                            Ver detalles técnicos
                                        </summary>
                                        <pre className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-[10px] overflow-x-auto">
                                            {errorDetail}
                                        </pre>
                                    </details>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(config)}
                            className="text-xs"
                        >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar Widget
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(config.id)}
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Eliminar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // --- Metric View ---
    if (config.type === 'metric') {
        const value = result && result.length > 0 ? Object.values(result[0])[0] as number : 0;

        const shouldUseCurrency = (config.yAxis || '').toLowerCase().match(/price|cost|revenue|sales|budget|fee|tax|bill|amount|monto|precio|costo|venta/);
        const formatFn = shouldUseCurrency ? formatCurrency : formatNumber;

        const formattedValue = typeof value === 'number' ?
            formatFn(value)
            : value;

        const aggMap: Record<string, string> = {
            'SUM': 'Suma',
            'AVG': 'Promedio',
            'COUNT': 'Conteo',
            'MAX': 'Máx',
            'MIN': 'Mín',
            'NONE': ''
        };
        const aggLabel = aggMap[config.aggregation || ''] ?? config.aggregation ?? 'Total';
        const hasColor = !!config.color;
        const isDirect = config.aggregation === 'NONE';

        return (
            <Card
                className="relative h-full overflow-hidden hover:shadow-xl transition-all duration-500 group bg-gradient-to-br from-card via-card to-muted/20 backdrop-blur-sm border-2"
                style={hasColor ? {
                    borderColor: config.color,
                    boxShadow: `0 0 24px ${config.color}20, 0 4px 12px ${config.color}10`
                } : {
                    borderColor: 'hsl(var(--primary))',
                    boxShadow: '0 0 24px hsl(var(--primary) / 0.15), 0 4px 12px hsl(var(--primary) / 0.08)'
                }}
            >
                <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full transition-opacity duration-500 group-hover:opacity-20"
                    style={{ backgroundColor: hasColor ? config.color : 'hsl(var(--primary))' }}
                />

                <CardHeader className="flex flex-row items-center justify-between relative z-10 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold text-foreground">
                            {config.title}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground/70">
                            {config.dataset}
                        </CardDescription>
                    </div>
                    <DashboardWidgetMenu
                        config={config}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onExport={handleDownloadCSV}
                    />
                </CardHeader>

                <CardContent className="relative z-10 space-y-2">
                    <div
                        className="text-4xl font-bold tracking-tight transition-colors duration-300"
                        style={{ color: hasColor ? config.color : 'hsl(var(--primary))' }}
                    >
                        {formattedValue}
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            className="h-1 w-12 rounded-full transition-all duration-300 group-hover:w-16"
                            style={{ backgroundColor: hasColor ? config.color : 'hsl(var(--primary))' }}
                        />
                        <p className="text-xs font-medium capitalize text-muted-foreground">
                            {isDirect ? (config.yAxis || 'Valor') : `${aggLabel} de ${config.yAxis || 'Registros'}`}
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // --- Chart View ---
    if (config.type === 'chart') {
        let series: any[] = [];
        let categories: any[] = [];
        const isCircular = config.chartType === 'pie' || config.chartType === 'donut';

        if (config.breakdown && !isCircular) {
            const breakdownField = config.breakdown;
            const xAxisField = config.xAxis || 'x';

            // 1. Get unique categories (X Axis)
            categories = Array.from(new Set(result?.map((r: any) => r[xAxisField]))).filter(Boolean);

            // 2. Get unique series names (Breakdown)
            const seriesNames = Array.from(new Set(result?.map((r: any) => r[breakdownField]))).filter(Boolean);

            // 3. Construct Series Data
            series = seriesNames.map((seriesName: any) => {
                const data = categories.map((cat: any) => {
                    const row = result?.find((r: any) => r[xAxisField] === cat && r[breakdownField] === seriesName);
                    return row ? (row.value || row[config.yAxis!] || 0) : 0;
                });
                return {
                    name: String(seriesName),
                    data: data
                };
            });

        } else {
            const seriesData = result?.map((row: any) => {
                if (row.value !== undefined) return row.value;
                if (row.y_val !== undefined) return row.y_val;
                if (config.yAxis && row[config.yAxis] !== undefined) return row[config.yAxis];
                const numericKey = Object.keys(row).find(k => typeof row[k] === 'number');
                return numericKey ? row[numericKey] : 0;
            }) || [];

            categories = result?.map((row: any) => {

                if (config.xAxis && row[config.xAxis] !== undefined) return row[config.xAxis];
                if (row.x_val !== undefined) return row.x_val;
                const labelKey = Object.keys(row).find(k => k !== 'value' && k !== 'y_val' && k !== config.yAxis);
                return labelKey ? row[labelKey] : Object.values(row)[0];
            }) || [];

            series = isCircular ? seriesData : [{ name: config.yAxis || 'Valor', data: seriesData }];
        }

        let colors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

        if (config.color && config.color !== 'default') {
            if (!config.breakdown) {
                colors = [config.color];
            }
        }

        const isMonochrome = (config.color && config.color !== 'default') && (isCircular || !!config.breakdown);

        const shouldUseCurrency = (config.yAxis || '').toLowerCase().match(/price|cost|revenue|sales|budget|fee|tax|bill|amount|monto|precio|costo|venta/);
        const formatFn = shouldUseCurrency ? formatCurrency : formatNumber;

        const chartOptions: any = {
            chart: {
                stacked: !!config.breakdown && (config.chartType === 'bar' || config.chartType === 'bar-horizontal' || config.chartType === 'area'),
                toolbar: {
                    show: true,
                    tools: {
                        download: true,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    },
                    export: {
                        csv: {
                            filename: config.title || 'chart_data',
                        },
                        png: {
                            filename: config.title || 'chart_image',
                        },
                        svg: {
                            filename: config.title || 'chart_vector',
                        }
                    }
                },
                background: 'transparent',
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800
                },
                fontFamily: 'inherit',
            },
            colors: colors,
            theme: {
                mode: isDarkMode ? 'dark' : 'light',
                monochrome: isMonochrome ? {
                    enabled: true,
                    color: config.color,
                    shadeTo: isDarkMode ? 'dark' : 'light',
                    shadeIntensity: 0.65
                } : {
                    enabled: false
                }
            },
            labels: isCircular ? categories : [],
            xaxis: {
                categories: isCircular ? [] : categories,
                labels: {
                    style: {
                        colors: '#94a3b8',
                        fontSize: '12px'
                    },
                    formatter: config.chartType === 'bar-horizontal'
                        ? (val: string) => formatNumber(Number(val))
                        : undefined,
                    rotate: -45,
                    trim: true
                },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                show: !isCircular,
                labels: {
                    style: { colors: '#94a3b8', fontSize: '12px' },
                    formatter: config.chartType === 'bar-horizontal'
                        ? (val: any) => val
                        : (val: number) => formatFn(val)
                }
            },
            grid: {
                show: !isCircular,
                borderColor: 'rgba(226, 232, 240, 0.1)',
                strokeDashArray: 4,
                xaxis: { lines: { show: config.chartType === 'bar-horizontal' } },
                yaxis: { lines: { show: config.chartType !== 'bar-horizontal' } }
            },
            dataLabels: {
                enabled: isCircular || (config.chartType === 'bar' && !config.breakdown),
                style: {
                    colors: ['#fff']
                },
                dropShadow: { enabled: true }
            },
            tooltip: {
                theme: 'dark',
                style: {
                    fontSize: '12px',
                    fontFamily: 'inherit',
                },
                y: {
                    formatter: (val: number) => config.yAxis ? formatFn(val) : val
                },
                fixed: {
                    enabled: false,
                    position: 'topRight',
                    offsetX: 0,
                    offsetY: 0,
                },
                marker: {
                    show: true,
                }
            },
            stroke: {
                curve: 'smooth',
                width: isCircular ? 0 : (config.chartType === 'area' ? 3 : 2)
            },
            fill: {
                type: (isCircular || config.chartType === 'bar' || config.chartType === 'bar-horizontal' || config.chartType === 'line') ? 'solid' : 'gradient',
                opacity: (isCircular || config.chartType === 'bar' || config.chartType === 'bar-horizontal' || config.chartType === 'line') ? 1 : 0.85,
                gradient: (config.chartType === 'area') ? {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 90, 100]
                } : undefined
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    columnWidth: '60%',
                    distributed: (config.chartType === 'bar' || config.chartType === 'bar-horizontal') && !config.color && !config.breakdown,
                    horizontal: config.chartType === 'bar-horizontal',
                },
                pie: {
                    donut: {
                        labels: {
                            show: true,
                            total: {
                                show: true,
                                label: 'Total',
                                color: '#94a3b8',
                                formatter: (w: any) => {
                                    return w.globals.seriesTotals.reduce((a: any, b: any) => a + b, 0).toLocaleString();
                                }
                            }
                        }
                    }
                }
            },
            legend: {
                show: isCircular || !!config.breakdown || (config.chartType === 'bar' && !config.color),
                position: 'bottom',
                itemMargin: {
                    horizontal: 10,
                    vertical: 5
                },
                labels: {
                    colors: '#94a3b8',
                }
            }
        };

        return (
            <Card className="flex flex-col h-full border-primary/20 hover:shadow-lg transition-all duration-300 col-span-2 group overflow-visible">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
                        <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground/70">
                            {config.dataset}
                        </CardDescription>
                    </div>
                    <DashboardWidgetMenu config={config} onEdit={onEdit} onDelete={onDelete} />
                </CardHeader>
                <CardContent className="h-full flex-1 min-h-0 pb-4 overflow-visible relative z-10 px-4">
                    <div className="h-full w-full min-h-[300px]">
                        <Chart
                            key={`${config.id}-${config.color}-${config.chartType}`}
                            options={chartOptions}
                            series={series}
                            type={(config.chartType === 'bar-horizontal' ? 'bar' : config.chartType) || "bar"}
                            height="100%"
                            width="100%"
                        />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // --- Table View ---
    if (config.type === 'table') {
        const columns = result && result.length > 0 ? Object.keys(result[0]) : [];
        const totalItems = result?.length || 0;
        const totalPages = Math.ceil(totalItems / pageSize);

        const paginatedData = result?.slice((page - 1) * pageSize, page * pageSize);

        const tableColor = (config.color && config.color !== 'default') ? config.color : '#6366f1';

        return (
            <Card className="flex flex-col h-full border-primary/20 hover:shadow-lg transition-all duration-300 col-span-2 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
                        <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground/70">
                            {config.dataset}
                        </CardDescription>
                    </div>
                    <DashboardWidgetMenu config={config} onEdit={onEdit} onDelete={onDelete} onExport={handleDownloadCSV} />
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-auto p-0">
                    <Table>
                        <TableHeader
                            className="sticky top-0 z-10"
                            style={{
                                backgroundColor: tableColor,
                            }}
                        >
                            <TableRow className="hover:bg-transparent border-b-0">
                                {columns.map(col => (
                                    <TableHead
                                        key={col}
                                        className="h-10 text-xs font-bold text-white"
                                        style={{
                                            color: '#ffffff',
                                        }}
                                    >
                                        {col}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData?.map((row: any, i: number) => (
                                <TableRow
                                    key={i}
                                    className="transition-all duration-200"
                                    style={{
                                        backgroundColor: i % 2 === 0
                                            ? 'transparent'
                                            : `${tableColor}08`,
                                        borderBottomColor: `${tableColor}15`,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = `${tableColor}15`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = i % 2 === 0
                                            ? 'transparent'
                                            : `${tableColor}08`;
                                    }}
                                >
                                    {columns.map(col => (
                                        <TableCell
                                            key={`${i}-${col}`}
                                            className="py-3 text-xs font-mono"
                                        >
                                            {String(row[col])}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardFooter className="py-2 border-t flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-4">
                        <div className="text-xs font-medium text-muted-foreground">
                            Mostrando <span className="text-foreground font-semibold">{paginatedData?.length}</span> de <span className="text-foreground font-semibold">{totalItems}</span> registros
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="text-xs text-muted-foreground">
                            Página <span className="text-foreground font-semibold">{page}</span> de <span className="text-foreground font-semibold">{totalPages}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        );
    }

    // --- Map View ---
    if (config.type === 'map') {
        const hasData = result && result.length > 0;

        return (
            <Card className="flex flex-col h-full border-primary/20 hover:shadow-lg transition-all duration-300 col-span-2 group overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between z-10 bg-card/50 backdrop-blur-sm">
                    <div>
                        <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
                        <CardDescription className="text-xs font-medium tracking-wider text-muted-foreground/70">
                            {config.dataset}
                        </CardDescription>
                    </div>
                    <DashboardWidgetMenu config={config} onEdit={onEdit} onDelete={onDelete} onExport={handleDownloadCSV} />
                </CardHeader>
                <CardContent className="h-full flex-1 min-h-0 p-0 relative">
                    {hasData ? (
                        <MapWidget data={result} config={config} isDarkMode={isDarkMode} />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                            No hay datos para mostrar en el mapa
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return null;
}
