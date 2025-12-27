"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Upload, Database, CheckCircle2, AlertCircle, Search, Trash2, Globe, Link as LinkIcon, HardDrive, Sparkles, Terminal, Filter, FilterX } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboard } from "@/contexts/DashboardContext";
import { DashboardBadge } from "@/components/dashboard/DashboardBadge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";

interface Dataset {
    table_name: string;
    filename: string;
    extension: string;
    upload_date: string | null;
    source_table?: string;
    dashboard_id?: string | null;
}

export default function DatasetsPage() {
    const { user } = useAuth();
    const { getDatasetsUsedByCurrentDashboard, currentDashboard } = useDashboard();
    const queryClient = useQueryClient();
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [tableName, setTableName] = useState("");
    const [showOnlyDashboardDatasets, setShowOnlyDashboardDatasets] = useState(true);

    const [url, setUrl] = useState("");
    const [urlTableName, setUrlTableName] = useState("");

    const [serverFile, setServerFile] = useState("");
    const [serverTableName, setServerTableName] = useState("");

    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [datasetToDelete, setDatasetToDelete] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [serverFileToDelete, setServerFileToDelete] = useState<string | null>(null);
    const [serverFileDeleteDialogOpen, setServerFileDeleteDialogOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const { data: datasets, isLoading } = useQuery({
        queryKey: ["datasets"],
        queryFn: async () => {
            const res = await api.get("/datasets/");
            return res.data as Dataset[];
        }
    });

    const { data: serverFiles, isLoading: isLoadingServerFiles } = useQuery({
        queryKey: ["server-files"],
        queryFn: async () => {
            const res = await api.get("/datasets/server-files");
            return res.data as string[];
        }
    });

    const resetFeedback = () => {
        setUploadSuccess(false);
        setUploadError("");
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !tableName) return;

        setUploading(true);
        resetFeedback();

        const formData = new FormData();
        formData.append("file", file);
        formData.append("table_name", tableName);
        if (currentDashboard?.id) {
            formData.append("dashboard_id", currentDashboard.id);
        }

        try {
            await api.post("/datasets/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            handleSuccess();
            setFile(null);
            setTableName("");
            // Reset file input
            const fileInput = document.getElementById("file-upload") as HTMLInputElement;
            if (fileInput) fileInput.value = "";
        } catch (error: any) {
            handleError(error);
        } finally {
            setUploading(false);
        }
    };

    // Handler: Import from URL
    const handleUrlImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || !urlTableName) return;

        setUploading(true);
        resetFeedback();

        try {
            await api.post("/datasets/import-url", {
                url,
                table_name: urlTableName,
                dashboard_id: currentDashboard?.id
            });
            handleSuccess();
            setUrl("");
            setUrlTableName("");
        } catch (error: any) {
            handleError(error);
        } finally {
            setUploading(false);
        }
    };

    // Handler: Import from Local Server
    const handleServerImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serverFile || !serverTableName) return;

        setUploading(true);
        resetFeedback();

        try {
            await api.post("/datasets/import-local", {
                file_path: serverFile,
                table_name: serverTableName,
                dashboard_id: currentDashboard?.id
            });
            handleSuccess();
            setServerFile("");
            setServerTableName("");
        } catch (error: any) {
            handleError(error);
        } finally {
            setUploading(false);
        }
    };

    const handleSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ["datasets"] });
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
    };

    const handleError = (error: any) => {
        console.error(error);
        setUploadError(error.response?.data?.detail || "Error en la operación");
    };

    const handleQueryDataset = (datasetName: string) => {
        const query = `SELECT * FROM ${datasetName} LIMIT 100`;
        sessionStorage.setItem('prefilledQuery', query);
        router.push('/dashboard/query');
    };

    const handleDeleteClick = (tableName: string) => {
        setDatasetToDelete(tableName);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!datasetToDelete) return;

        setDeleting(true);
        try {
            await api.delete(`/datasets/${datasetToDelete}`);
            queryClient.invalidateQueries({ queryKey: ["datasets"] });
            setDeleteDialogOpen(false);
            setDatasetToDelete(null);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || "Error al eliminar el dataset");
        } finally {
            setDeleting(false);
        }
    };

    const handleServerFileDeleteClick = (filename: string) => {
        setServerFileToDelete(filename);
        setServerFileDeleteDialogOpen(true);
    };

    const handleServerFileDeleteConfirm = async () => {
        if (!serverFileToDelete) return;

        try {
            await api.delete(`/datasets/server-files?filename=${encodeURIComponent(serverFileToDelete)}`);
            queryClient.invalidateQueries({ queryKey: ["server-files"] });
            if (serverFile === serverFileToDelete) setServerFile("");
            setServerFileDeleteDialogOpen(false);
            setServerFileToDelete(null);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || "Error al eliminar archivo");
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in slide-in-from-left duration-500">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold">
                        Gestión de Datasets
                    </h1>
                    <p className="text-muted-foreground">
                        Sube y administra tus conjuntos de datos desde múltiples fuentes.
                    </p>
                </div>
                <DashboardBadge />
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Import Card */}
                <Card className="border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom duration-500">
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Database className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle>Importar Dataset</CardTitle>
                                <CardDescription>Selecciona la fuente de tus datos</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="upload" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-6">
                                <TabsTrigger value="upload" className="flex items-center gap-2">
                                    <Upload className="h-4 w-4" /> Subir
                                </TabsTrigger>
                                <TabsTrigger value="url" className="flex items-center gap-2">
                                    <Globe className="h-4 w-4" /> URL
                                </TabsTrigger>
                                <TabsTrigger value="server" className="flex items-center gap-2">
                                    <HardDrive className="h-4 w-4" /> Servidor
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab: File Upload */}
                            <TabsContent value="upload">
                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nombre de Tabla</label>
                                        <Input
                                            placeholder="ej: ventas_anuales"
                                            value={tableName}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                    .toLowerCase()
                                                    .replace(/\s+/g, '_')
                                                    .replace(/^[0-9]+/, '')
                                                    .replace(/[^a-z0-9_]/g, '');
                                                setTableName(val);
                                            }}
                                            required
                                            className="border-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Archivo (CSV/Parquet)</label>
                                        <Input
                                            id="file-upload"
                                            type="file"
                                            accept=".csv,.parquet"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            required
                                            className="border-primary/20 focus:border-primary cursor-pointer"
                                        />
                                    </div>
                                    <Button disabled={uploading} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 dark:text-white">
                                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        {uploading ? "Subiendo..." : "Subir Dataset"}
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* Tab: URL Import */}
                            <TabsContent value="url">
                                <form onSubmit={handleUrlImport} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nombre de Tabla</label>
                                        <Input
                                            placeholder="ej: datos_remotos"
                                            value={urlTableName}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                    .toLowerCase()
                                                    .replace(/\s+/g, '_')
                                                    .replace(/^[0-9]+/, '')
                                                    .replace(/[^a-z0-9_]/g, '');
                                                setUrlTableName(val);
                                            }}
                                            required
                                            className="border-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">URL del Archivo</label>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="https://ejemplo.com/datos.parquet"
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                required
                                                type="url"
                                                className="pl-9 border-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                    <Button disabled={uploading} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 dark:text-white">
                                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                                        {uploading ? "Importando..." : "Importar desde URL"}
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* Tab: Server Import */}
                            <TabsContent value="server">
                                <form onSubmit={handleServerImport} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nombre de Tabla</label>
                                        <Input
                                            placeholder="ej: datos_locales"
                                            value={serverTableName}
                                            onChange={(e) => {
                                                const val = e.target.value
                                                    .toLowerCase()
                                                    .replace(/\s+/g, '_')
                                                    .replace(/^[0-9]+/, '')
                                                    .replace(/[^a-z0-9_]/g, '');
                                                setServerTableName(val);
                                            }}
                                            required
                                            className="border-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Seleccionar Archivo</label>
                                        <div className="flex gap-2">
                                            <Select onValueChange={setServerFile} value={serverFile} required>
                                                <SelectTrigger className="border-primary/20 focus:ring-primary flex-1">
                                                    <SelectValue placeholder="Selecciona un archivo del servidor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {isLoadingServerFiles ? (
                                                        <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                                    ) : serverFiles && serverFiles.length > 0 ? (
                                                        serverFiles.map((file) => (
                                                            <SelectItem key={file} value={file}>{file}</SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-sm text-muted-foreground">No hay archivos disponibles</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Archivos en la carpeta /uploads del servidor</p>
                                    </div>

                                    {/* Server Files Management List */}
                                    {serverFiles && serverFiles.length > 0 && (
                                        <div className="mt-4 border rounded-md p-3 bg-muted/20">
                                            <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                                                <HardDrive className="h-3 w-3" /> Archivos en el Servidor
                                            </h4>
                                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                                                {serverFiles.map((file) => (
                                                    <div key={file} className="flex items-center justify-between text-sm p-1.5 hover:bg-muted/50 rounded group">
                                                        <span className="truncate flex-1 pr-2 font-mono text-xs">{file}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Eliminar archivo"
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                                                            onClick={() => handleServerFileDeleteClick(file)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Button disabled={uploading} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 dark:text-white">
                                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDrive className="mr-2 h-4 w-4" />}
                                        {uploading ? "Procesando..." : "Cargar Archivo Local"}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>

                        {/* Feedback Messages */}
                        {uploadSuccess && (
                            <div className="flex items-center space-x-2 p-3 mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 animate-in slide-in-from-top duration-300">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                    ¡Operación exitosa!
                                </p>
                            </div>
                        )}

                        {uploadError && (
                            <div className="flex items-center space-x-2 p-3 mt-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 animate-in slide-in-from-top duration-300">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                    {uploadError}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Available Datasets Table */}
                <Card className="border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom duration-500 delay-100">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                    <Database className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle>Datasets Disponibles</CardTitle>
                                    <CardDescription>
                                        {(() => {
                                            const dashboardDatasets = getDatasetsUsedByCurrentDashboard();
                                            const filteredDatasets = datasets?.filter(d => {
                                                if (showOnlyDashboardDatasets) {
                                                    const isUsed = dashboardDatasets.includes(d.table_name);
                                                    const isLinked = d.dashboard_id === currentDashboard?.id;
                                                    if (!isUsed && !isLinked) {
                                                        return false;
                                                    }
                                                }
                                                if (searchQuery) {
                                                    const normalize = (str: string) => str.toLowerCase().replace(/[_-]/g, ' ');
                                                    const normalizedQuery = normalize(searchQuery);
                                                    return normalize(d.filename).includes(normalizedQuery) ||
                                                        normalize(d.table_name).includes(normalizedQuery);
                                                }
                                                return true;
                                            }) || [];

                                            const tablesCount = filteredDatasets.filter(d => d.extension?.toLowerCase() !== 'view').length;
                                            const viewsCount = filteredDatasets.filter(d => d.extension?.toLowerCase() === 'view').length;

                                            return (
                                                <>
                                                    {tablesCount} dataset{tablesCount !== 1 ? 's' : ''}
                                                    {viewsCount > 0 && ` y ${viewsCount} vista${viewsCount !== 1 ? 's' : ''}`}
                                                </>
                                            );
                                        })()}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                <SimpleTooltip content={showOnlyDashboardDatasets ? "Solo de este Dashboard" : "Todos los Datasets"} side="bottom">
                                    <Button
                                        variant={showOnlyDashboardDatasets ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setShowOnlyDashboardDatasets(!showOnlyDashboardDatasets)}
                                        className="whitespace-nowrap"
                                    >
                                        {showOnlyDashboardDatasets ? (
                                            <>
                                                <Filter className="h-4 w-4 md:mr-0 2xl:mr-2" />
                                                <span className="md:hidden 2xl:inline ml-2">Solo de este Dashboard</span>
                                            </>
                                        ) : (
                                            <>
                                                <FilterX className="h-4 w-4 md:mr-0 2xl:mr-2" />
                                                <span className="md:hidden 2xl:inline ml-2">Todos los Datasets</span>
                                            </>
                                        )}
                                    </Button>
                                </SimpleTooltip>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                    <Input
                                        placeholder="Buscar datasets..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                <div className="rounded-lg border border-border/50 overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/95">
                                            <TableRow>
                                                <TableHead className="font-semibold">Archivo</TableHead>
                                                <TableHead className="font-semibold">Tipo</TableHead>
                                                <TableHead className="font-semibold">Tabla</TableHead>
                                                <TableHead className="text-right font-semibold">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(() => {
                                                const dashboardDatasets = getDatasetsUsedByCurrentDashboard();
                                                const filteredDatasets = datasets?.filter(d => {
                                                    // Filter by dashboard if enabled
                                                    if (showOnlyDashboardDatasets) {
                                                        const isUsed = dashboardDatasets.includes(d.table_name);
                                                        const isLinked = d.dashboard_id === currentDashboard?.id;
                                                        if (!isUsed && !isLinked) {
                                                            return false;
                                                        }
                                                    }
                                                    // Filter by search query
                                                    const normalize = (str: string) => str.toLowerCase().replace(/[_-]/g, ' ');
                                                    const normalizedQuery = normalize(searchQuery);
                                                    return normalize(d.filename).includes(normalizedQuery) ||
                                                        normalize(d.table_name).includes(normalizedQuery);
                                                }) || [];

                                                if (filteredDatasets.length === 0 && datasets && datasets.length > 0) {
                                                    return (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                <p className="text-sm">No se encontraron resultados para "{searchQuery}"</p>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }

                                                if (!datasets || datasets.length === 0) {
                                                    return (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                <p className="text-sm">No hay datasets.</p>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }

                                                return filteredDatasets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((dataset) => (
                                                    <TableRow
                                                        key={dataset.table_name}
                                                        className="hover:bg-accent/50 transition-colors"
                                                    >
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center space-x-2">
                                                                {dataset.extension?.toLowerCase() === 'view' ? (
                                                                    <div className="h-4 w-4 text-purple-500" title="Vista">
                                                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                                                    </div>
                                                                ) : (
                                                                    <Database className="h-4 w-4 text-primary" />
                                                                )}
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-sm truncate " title={dataset.filename}>
                                                                            {dataset.filename}
                                                                        </span>
                                                                        {dashboardDatasets.includes(dataset.table_name) && (
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" title="Usado en este dashboard">
                                                                                En uso
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {dataset.source_table && (
                                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                            <span className="opacity-70">de:</span>
                                                                            <Database className="h-3 w-3 opacity-50" />
                                                                            <span className="font-mono">{dataset.source_table}</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">
                                                            {dataset.extension?.toLowerCase() === 'view' ? (
                                                                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">Vista</span>
                                                            ) : (
                                                                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">Tabla</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground">{dataset.table_name}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() => handleQueryDataset(dataset.table_name)}
                                                                    className="hover:bg-primary/10 hover:text-primary h-8 px-2 text-xs cursor-pointer dark:text-white"
                                                                    title="Consultar"
                                                                >
                                                                    Consultar <Terminal className="ml-1.5 h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteClick(dataset.table_name)}
                                                                    className="hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ));
                                            })()}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination Controls */}
                                {(() => {
                                    const dashboardDatasets = getDatasetsUsedByCurrentDashboard();
                                    const filteredDatasets = datasets?.filter(d => {
                                        // Filter by dashboard if enabled
                                        if (showOnlyDashboardDatasets) {
                                            const isUsed = dashboardDatasets.includes(d.table_name);
                                            const isLinked = d.dashboard_id === currentDashboard?.id;
                                            if (!isUsed && !isLinked) {
                                                return false;
                                            }
                                        }
                                        // Filter by search query
                                        const normalize = (str: string) => str.toLowerCase().replace(/[_-]/g, ' ');
                                        const normalizedQuery = normalize(searchQuery);
                                        return normalize(d.filename).includes(normalizedQuery) ||
                                            normalize(d.table_name).includes(normalizedQuery);
                                    }) || [];

                                    if (filteredDatasets && filteredDatasets.length > itemsPerPage) {
                                        return (
                                            <div className="flex items-center justify-between mt-4 px-2">
                                                <p className="text-sm text-muted-foreground">
                                                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredDatasets.length)} de {filteredDatasets.length} datasets
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                        disabled={currentPage === 1}
                                                    >
                                                        Anterior
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(p => p + 1)}
                                                        disabled={currentPage >= Math.ceil(filteredDatasets.length / itemsPerPage)}
                                                    >
                                                        Siguiente
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Dataset?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El dataset <span className="font-bold">{datasetToDelete}</span> será eliminado permanentemente de la base de datos y metadata.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            disabled={deleting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {deleting ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Server File Delete Dialog */}
            <AlertDialog open={serverFileDeleteDialogOpen} onOpenChange={setServerFileDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Archivo del Servidor?</AlertDialogTitle>
                        <AlertDialogDescription>
                            El archivo <span className="font-bold">{serverFileToDelete}</span> será eliminado permanentemente del servidor.
                            <br />
                            <span className="text-sm text-muted-foreground mt-2 block">
                                Nota: Esto no elimina los datasets que ya hayan sido creados a partir de este archivo.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleServerFileDeleteConfirm}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
