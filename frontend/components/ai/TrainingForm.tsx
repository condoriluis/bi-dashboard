"use client";

import React, { useState, useEffect } from 'react';
import { Brain, Loader2, Sparkles, Target, Database, Settings2, Zap, Layers, AlertCircle, CheckCircle2, Info, Search, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface Dataset {
    table_name?: string;
    name?: string;
    filename?: string;
    extension?: string;
    type?: string;
}

type ModelType = 'random_forest' | 'xgboost' | 'tensorflow' | '';

interface TrainingFormProps {
    onSuccess?: () => void;
}

export default function TrainingForm({ onSuccess }: TrainingFormProps) {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDataset, setSelectedDataset] = useState<string>('');
    const [columns, setColumns] = useState<string[]>([]);
    const [targetColumn, setTargetColumn] = useState<string>('');
    const [featureColumns, setFeatureColumns] = useState<string[]>([]);
    const [modelName, setModelName] = useState<string>('');
    const [epochs, setEpochs] = useState<number>(10);
    const [loading, setLoading] = useState(false);
    const [fetchingDatasets, setFetchingDatasets] = useState(true);

    const [rowCount, setRowCount] = useState<number | null>(null);
    const [selectedModel, setSelectedModel] = useState<ModelType>('');
    const [fetchingRowCount, setFetchingRowCount] = useState(false);

    // Search and Selector States
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [datasetSearch, setDatasetSearch] = useState('');

    const hasFetched = React.useRef(false);

    useEffect(() => {
        const fetchDatasets = async () => {
            if (hasFetched.current) return;
            hasFetched.current = true;

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error('Error al cargar datasets');
                const data = await response.json();
                setDatasets(data);
            } catch (error) {
                console.error(error);
                toast.error("Error al cargar datasets");
            } finally {
                setFetchingDatasets(false);
            }
        };
        fetchDatasets();
    }, []);

    useEffect(() => {
        if (selectedDataset) {
            const fetchColumnsAndCount = async () => {
                setFetchingRowCount(true);
                try {
                    const token = localStorage.getItem('token');

                    const colsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/datasets/${selectedDataset}/columns`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (colsResponse.ok) {
                        const data = await colsResponse.json();
                        setColumns(data);
                    }

                    const countQuery = {
                        query: `SELECT COUNT(*) as count FROM "${selectedDataset}"`
                    };
                    const countResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/sql/execute`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(countQuery)
                    });

                    if (countResponse.ok) {
                        const countData = await countResponse.json();
                        if (countData && countData.length > 0) {
                            const count = Number(Object.values(countData[0])[0]);
                            setRowCount(count);
                            if (count < 1000) setSelectedModel('random_forest');
                            else if (count < 5000) setSelectedModel('xgboost');
                            else setSelectedModel('xgboost');
                        }
                    }

                } catch (error) {
                    console.error(error);
                    toast.error("Error al cargar detalles del dataset");
                } finally {
                    setFetchingRowCount(false);
                }
            };
            fetchColumnsAndCount();
        } else {
            setColumns([]);
            setRowCount(null);
            setSelectedModel('');
        }
    }, [selectedDataset]);

    const handleTrain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDataset || !targetColumn || featureColumns.length === 0 || !modelName || !selectedModel) {
            toast.warning("Por favor completa todos los campos requeridos");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/train`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dataset_name: selectedDataset,
                    target_column: targetColumn,
                    feature_columns: featureColumns,
                    model_name: modelName,
                    model_type: selectedModel,
                    epochs: epochs
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al iniciar entrenamiento');
            }

            const result = await response.json();

            toast.success("🚀 Entrenamiento iniciado correctamente", {
                description: `El modelo "${modelName}" (${getModelDisplayName(selectedModel)}) se está entrenando en segundo plano.`,
                duration: 5000
            });

            setModelName('');
            setTargetColumn('');
            setFeatureColumns([]);
            setSelectedDataset('');
            setRowCount(null);
            setSelectedModel('');

            if (onSuccess) onSuccess();


        } catch (error) {
            console.error(error);
            toast.error("Error al iniciar el entrenamiento", {
                description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
                duration: 5000
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleFeature = (col: string) => {
        setFeatureColumns(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    const getModelDisplayName = (type: ModelType) => {
        switch (type) {
            case 'random_forest': return 'Random Forest';
            case 'xgboost': return 'XGBoost';
            case 'tensorflow': return 'TensorFlow (Neural Network)';
            default: return '';
        }
    };

    if (fetchingDatasets) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const isTensorFlowDisabled = (rowCount || 0) < 5000;

    return (
        <form onSubmit={handleTrain} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Configuration */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-base">
                            <Database className="h-4 w-4 text-primary" />
                            Seleccionar Dataset
                        </Label>

                        <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between bg-background/50 backdrop-blur-sm h-12 text-base font-normal border-input hover:border-primary/50 transition-all"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        {selectedDataset ? (
                                            <>
                                                {datasets.find(ds => (ds.table_name || ds.name) === selectedDataset)?.extension?.toLowerCase() === 'view' ? (
                                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                                ) : (
                                                    <Database className="h-4 w-4 text-primary" />
                                                )}
                                                <span className="truncate">
                                                    {datasets.find(ds => (ds.table_name || ds.name) === selectedDataset)?.filename || selectedDataset}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground">Elige un dataset para analizar...</span>
                                        )}
                                    </div>
                                    <Search className="h-4 w-4 opacity-50 shrink-0" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-primary/20 backdrop-blur-xl bg-background/95">
                                <DialogHeader className="p-4 pb-0">
                                    <DialogTitle>Seleccionar Dataset</DialogTitle>
                                </DialogHeader>
                                <div className="p-4 space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar tabla o vista... (ej: ventas_totales)"
                                            value={datasetSearch}
                                            onChange={(e) => setDatasetSearch(e.target.value)}
                                            className="pl-9 h-11 bg-muted/30 focus-visible:ring-primary/20"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                                        {datasets.length === 0 ? (
                                            <div className="py-8 text-center text-muted-foreground">
                                                <Database className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                                <p>No hay datasets disponibles</p>
                                            </div>
                                        ) : (
                                            (() => {
                                                const normalize = (str: string) => str.toLowerCase().replace(/[_\s-]+/g, ' ').trim();
                                                const searchNormalized = normalize(datasetSearch);

                                                const filtered = datasets.filter(ds => {
                                                    const name = ds.filename || ds.table_name || ds.name || '';
                                                    return normalize(name).includes(searchNormalized);
                                                });

                                                if (filtered.length === 0) {
                                                    return (
                                                        <div className="py-8 text-center text-muted-foreground">
                                                            <Search className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                                            <p>No se encontraron resultados para "{datasetSearch}"</p>
                                                        </div>
                                                    );
                                                }

                                                return filtered.map((ds, index) => {
                                                    const value = ds.table_name || ds.name || '';
                                                    const isSelected = selectedDataset === value;

                                                    return (
                                                        <button
                                                            key={`${value}-${index}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedDataset(value);
                                                                setIsSelectorOpen(false);
                                                                setDatasetSearch('');
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left group",
                                                                isSelected
                                                                    ? "bg-primary/10 border border-primary/30"
                                                                    : "hover:bg-muted/50 border border-transparent"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className={cn(
                                                                    "p-2 rounded-md",
                                                                    ds.extension?.toLowerCase() === 'view' ? "bg-purple-500/10" : "bg-primary/10"
                                                                )}>
                                                                    {ds.extension?.toLowerCase() === 'view' ? (
                                                                        <Sparkles className="h-4 w-4 text-purple-500" />
                                                                    ) : (
                                                                        <Database className="h-4 w-4 text-primary" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-sm truncate">
                                                                        {ds.filename || ds.table_name || ds.name}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                                                        {ds.extension?.toLowerCase() === 'view' ? 'Vista DuckDB' : 'Dataset / Tabla'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <ChevronRight className={cn(
                                                                "h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5",
                                                                isSelected && "text-primary"
                                                            )} />
                                                        </button>
                                                    );
                                                });
                                            })()
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        {rowCount !== null && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <span>Dataset cargado: <strong>{rowCount.toLocaleString()}</strong> filas disponibles para entrenamiento.</span>
                            </div>
                        )}
                    </div>

                    {/* Model Selection Cards */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-base">
                            <Brain className="h-4 w-4 text-primary" />
                            Seleccionar Algoritmo
                        </Label>
                        <div className="grid grid-cols-1 gap-3">
                            {/* Random Forest Card */}
                            <div
                                onClick={() => setSelectedModel('random_forest')}
                                className={cn(
                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
                                    selectedModel === 'random_forest'
                                        ? "border-green-500 bg-green-500/5 shadow-green-500/10"
                                        : "border-muted bg-card hover:border-primary/50"
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg", selectedModel === 'random_forest' ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-muted text-muted-foreground")}>
                                            <Layers className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Random Forest</h3>
                                            <p className="text-xs text-muted-foreground">Robusto y estable. Ideal para iniciarse.</p>
                                        </div>
                                    </div>
                                    {rowCount !== null && rowCount < 1000 && (
                                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                            Recomendado
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* XGBoost Card */}
                            <div
                                onClick={() => setSelectedModel('xgboost')}
                                className={cn(
                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
                                    selectedModel === 'xgboost'
                                        ? "border-blue-500 bg-blue-500/5 shadow-blue-500/10"
                                        : "border-muted bg-card hover:border-primary/50"
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg", selectedModel === 'xgboost' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "bg-muted text-muted-foreground")}>
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">XGBoost</h3>
                                            <p className="text-xs text-muted-foreground">Alta velocidad y precisión. Estándar industrial.</p>
                                        </div>
                                    </div>
                                    {rowCount !== null && rowCount >= 1000 && rowCount < 5000 && (
                                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                            Recomendado
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* TensorFlow Card */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            onClick={() => !isTensorFlowDisabled && setSelectedModel('tensorflow')}
                                            className={cn(
                                                "relative p-4 rounded-xl border-2 transition-all duration-200",
                                                isTensorFlowDisabled
                                                    ? "opacity-60 cursor-not-allowed border-dashed"
                                                    : "cursor-pointer hover:shadow-md",
                                                selectedModel === 'tensorflow'
                                                    ? "border-orange-500 bg-orange-500/5 shadow-orange-500/10"
                                                    : !isTensorFlowDisabled ? "border-muted bg-card hover:border-primary/50" : "border-muted"
                                            )}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("p-2 rounded-lg", selectedModel === 'tensorflow' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600" : "bg-muted text-muted-foreground")}>
                                                        <Brain className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold flex items-center gap-2">
                                                            TensorFlow
                                                            {isTensorFlowDisabled && <AlertCircle className="h-3 w-3 text-muted-foreground" />}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground">Deep Learning para patrones complejos.</p>
                                                    </div>
                                                </div>
                                                {rowCount !== null && rowCount >= 5000 && (
                                                    <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                                        Disponible
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    {isTensorFlowDisabled && (
                                        <TooltipContent>
                                            <p>Requiere mínimo +5,000 filas para resultados confiables.<br />Total actual: {rowCount || 0}</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-base">
                            <Target className="h-4 w-4 text-primary" />
                            Columna Objetivo (Target)
                        </Label>
                        <Select onValueChange={setTargetColumn} value={targetColumn} disabled={!selectedDataset}>
                            <SelectTrigger className="bg-background/50 backdrop-blur-sm h-12">
                                <SelectValue placeholder="¿Qué quieres predecir?" />
                            </SelectTrigger>
                            <SelectContent>
                                {columns.map((col) => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Right Column: Features & Details */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-base">Nombre del Modelo</Label>
                        <Input
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            placeholder="Ej: Predicción de Clientes 2024"
                            className="bg-background/50 backdrop-blur-sm h-12"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-2 text-base">
                                <Sparkles className="h-4 w-4 text-blue-500" />
                                Features (Variables de Entrada)
                            </Label>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                {featureColumns.length} seleccionadas
                            </span>
                        </div>

                        <div className="border rounded-xl p-4 h-[320px] overflow-y-auto bg-background/30 grid grid-cols-1 gap-2 custom-scrollbar">
                            {columns.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2 opacity-60">
                                    <Database className="h-8 w-8" />
                                    <p>Selecciona un dataset para ver columnas</p>
                                </div>
                            )}
                            {columns.map((col) => (
                                <div
                                    key={col}
                                    className={cn(
                                        "flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 border",
                                        featureColumns.includes(col)
                                            ? "bg-blue-500/10 border-blue-500/30"
                                            : "hover:bg-muted/50 border-transparent bg-card/50"
                                    )}
                                >
                                    <Checkbox
                                        id={`col-${col}`}
                                        checked={featureColumns.includes(col)}
                                        onCheckedChange={() => toggleFeature(col)}
                                        disabled={col === targetColumn}
                                        className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                    />
                                    <label
                                        htmlFor={`col-${col}`}
                                        className={cn(
                                            "text-sm font-medium leading-none cursor-pointer flex-1 py-1",
                                            col === targetColumn && "opacity-50 line-through text-muted-foreground"
                                        )}
                                    >
                                        {col}
                                    </label>
                                    {col === targetColumn && <Target className="h-3 w-3 text-muted-foreground" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <Label className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                            Epocas de Entrenamiento
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent><p>Número de veces que el modelo verá los datos completos.</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </Label>
                        <Input
                            type="number"
                            value={epochs}
                            onChange={(e) => setEpochs(parseInt(e.target.value))}
                            min={1}
                            max={500}
                            className="bg-background/50 backdrop-blur-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-center pt-4">
                <Button
                    type="submit"
                    className="w-full max-w-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg cursor-pointer"
                    disabled={loading || !selectedDataset || !selectedModel}
                >
                    {loading ? (
                        <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Entrenando Modelo Inteligente...</>
                    ) : (
                        <><Brain className="mr-3 h-6 w-6" /> Iniciar Entrenamiento IA</>
                    )}
                </Button>
            </div>
        </form >
    );
}
