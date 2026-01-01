"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Model {
    id: string;
    name: string;
    target_column: string;
    dataset_name: string;
}

interface ForecastingControlsProps {
    datasetName: string;
    onForecast: (data: any[], modelName: string, horizon: number) => void;
    currentChartType: string;
    isTimeSeries?: boolean;
    hasForecast?: boolean;
    onClear?: () => void;
}

export function ForecastingControls({ datasetName, onForecast, currentChartType, isTimeSeries = true, hasForecast, onClear }: ForecastingControlsProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [models, setModels] = useState<Model[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>("");
    const [horizon, setHorizon] = useState<string>("7");
    const [loadingModels, setLoadingModels] = useState(false);

    if (!['line', 'area', 'bar', 'column'].includes(currentChartType)) return null;

    const fetchModels = async () => {
        setLoadingModels(true);
        try {
            const res = await api.get("/ai/models");

            const normalize = (s: string) => s?.toLowerCase().replace(/[ _-]/g, '') || '';
            const targetName = normalize(datasetName);

            const sorted = res.data.sort((a: Model, b: Model) => {
                const matchA = normalize(a.dataset_name) === targetName;
                const matchB = normalize(b.dataset_name) === targetName;
                if (matchA && !matchB) return -1;
                if (!matchA && matchB) return 1;
                return 0;
            });

            setModels(sorted);

            if (sorted.length > 0) {
                const exists = sorted.find((m: { id: string; }) => m.id === selectedModelId);
                if (!exists) {
                    setSelectedModelId(sorted[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to load models", error);
        } finally {
            setLoadingModels(false);
        }
    };

    const handleRunForecast = async () => {
        if (!selectedModelId) return;
        setLoading(true);
        try {
            const res = await api.post(`/ai/models/${selectedModelId}/predict/range`, {
                periods: parseInt(horizon),
                frequency: 'D'
            });

            const modelName = models.find(m => m.id === selectedModelId)?.name || "IA";
            onForecast(res.data, modelName, parseInt(horizon));
            setOpen(false);
            toast.success("Proyección generada con éxito");
        } catch (error) {
            console.error(error);
            toast.error("Error al generar la proyección. Verifica el modelo seleccionado.");
        } finally {
            setLoading(false);
        }
    };

    const triggerButton = (
        <Button
            variant={hasForecast ? "secondary" : "outline"}
            size="sm"
            className={`flex items-center gap-1 h-6 text-xs border-dashed cursor-pointer px-2 sm:px-1 ${hasForecast
                ? "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800"
                : "border-purple-400 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-500/50 dark:hover:bg-purple-900/20"
                }`}
        >
            🤖 <span className="font-semibold hidden sm:inline md:hidden lg:inline">{hasForecast ? "Proyectado" : "Proyectar"}</span>
        </Button>
    );

    if (!isTimeSeries) return null;

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (val) fetchModels();
        }}>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        🤖
                        Proyectar Tendencias Futuras
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona un modelo para predecir el comportamiento futuro.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {loadingModels ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : models.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                            No tienes modelos entrenados aún.
                            <br />
                            <a href="/dashboard/ai" className="text-primary hover:underline mt-2 inline-block">Entrenar mi primer modelo</a>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label htmlFor="model" className="text-left sm:text-right">
                                    Modelo
                                </Label>
                                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                                    <SelectTrigger id="model" className="col-span-1 sm:col-span-3">
                                        <SelectValue placeholder="Selecciona un modelo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {models.map((m) => {
                                            const normalize = (s: string) => s?.toLowerCase().replace(/[ _-]/g, '') || '';
                                            const isMatch = normalize(m.dataset_name) === normalize(datasetName);
                                            return (
                                                <SelectItem key={m.id} value={m.id} className={isMatch ? "font-semibold" : "text-muted-foreground"}>
                                                    <span className="block w-full max-w-[200px] sm:max-w-[260px] truncate" title={`${m.name} (${m.dataset_name})`}>
                                                        {m.name} {isMatch ? "(Recomendado)" : `(${m.dataset_name})`}
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label htmlFor="horizon" className="text-left sm:text-right">
                                    Horizonte
                                </Label>
                                <Select value={horizon} onValueChange={setHorizon}>
                                    <SelectTrigger id="horizon" className="col-span-1 sm:col-span-3">
                                        <SelectValue placeholder="Duración de la proyección" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">Próximos 7 días</SelectItem>
                                        <SelectItem value="14">Próximos 14 días</SelectItem>
                                        <SelectItem value="30">Próximos 30 días</SelectItem>
                                        <SelectItem value="90">Próximos 3 meses</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>

                    {hasForecast && onClear && (
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onClear();
                                setOpen(false);
                                toast.success("Proyección eliminada");
                            }}
                            className="mr-auto"
                        >
                            Quitar
                        </Button>
                    )}

                    {models.length > 0 && (
                        <Button
                            onClick={handleRunForecast}
                            disabled={loading}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {hasForecast ? "Actualizar Proyección" : "Generar Proyección"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
