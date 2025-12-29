"use client";

import React, { useEffect, useState, useRef } from 'react';
import { BatchPredictionDialog } from './BatchPredictionDialog';
import { Brain, CheckCircle2, Loader2, Play, AlertCircle, Trash2, RefreshCw, Layers, Zap, Database, Target, ListFilter, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from 'sonner';
import PredictionDialog from './PredictionDialog';

export interface Model {
    id: string;
    name: string;
    dataset_name: string;
    target_column: string;
    feature_columns: string[];
    model_type?: 'random_forest' | 'xgboost' | 'tensorflow';
    status: 'training' | 'completed' | 'failed';
    created_at: string;
    metrics?: Record<string, number>;
    error?: string;
}

export default function ModelList() {
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [modelToDelete, setModelToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [retrainingId, setRetrainingId] = useState<string | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchModels = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/models`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Error al cargar modelos');
            const data = await response.json();
            const sortedData = data.sort((a: Model, b: Model) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setModels(sortedData);

            if (retrainingId) {
                const targetModel = sortedData.find((m: Model) => m.id === retrainingId);
                if (targetModel && targetModel.status !== 'training') {
                    setRetrainingId(null);
                    if (targetModel.status === 'completed') {
                        toast.success(`Modelo "${targetModel.name}" actualizado correctamente`);
                    } else if (targetModel.status === 'failed') {
                        toast.error(`Error al actualizar modelo: ${targetModel.error}`);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("No se pudieron cargar los modelos");
        } finally {
            setLoading(false);
        }
    };

    const openDeleteDialog = (modelId: string, modelName: string) => {
        setModelToDelete({ id: modelId, name: modelName });
        setDeleteDialogOpen(true);
    };

    const handleRetrain = async (modelId: string, modelName: string) => {
        setRetrainingId(modelId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/models/${modelId}/retrain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al iniciar reentrenamiento');

            toast.info("Reentrenamiento iniciado", {
                description: `El modelo "${modelName}" se está actualizando con los datos más recientes.`,
                duration: 4000
            });
        } catch (error) {
            console.error(error);
            toast.error("Error", { description: "No se pudo reentrenar el modelo" });
            setRetrainingId(null);
        }
    };

    const handleDelete = async () => {
        if (!modelToDelete) return;

        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/models/${modelToDelete.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Error al eliminar modelo');

            toast.success(`Modelo "${modelToDelete.name}" eliminado correctamente`);
            setDeleteDialogOpen(false);
            setModelToDelete(null);
            fetchModels();
        } catch (error) {
            console.error(error);
            toast.error("No se pudo eliminar el modelo");
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        fetchModels();

        pollingIntervalRef.current = setInterval(() => {
            fetchModels();
        }, 5000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [retrainingId]);

    const getModelIcon = (type?: string) => {
        switch (type) {
            case 'random_forest':
                return { icon: <Layers className="h-5 w-5" />, color: "text-green-500", label: "Random Forest" };
            case 'xgboost':
                return { icon: <Zap className="h-5 w-5" />, color: "text-blue-500", label: "XGBoost" };
            case 'tensorflow':
            default:
                return { icon: <Brain className="h-5 w-5" />, color: "text-orange-500", label: "Deep Learning" };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-muted-foreground">Cargando modelos de IA...</p>
            </div>
        );
    }

    if (models.length === 0) {
        return (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <CardTitle className="text-xl">No hay modelos entrenados</CardTitle>
                <CardDescription>
                    Entrena tu primer modelo en la pestaña "Entrenar Nuevo"
                </CardDescription>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {models.map((model) => {
                const { icon, color, label } = getModelIcon(model.model_type);

                return (
                    <Card key={model.id} className="group flex flex-col h-full border-primary/20 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 overflow-hidden relative animate-in fade-in-50 slide-in-from-bottom duration-500 bg-card/50 backdrop-blur-sm">
                        <div className="absolute top-0 right-0 p-4 flex gap-2 z-10">
                            <Badge variant="outline" className={`${color} bg-background/80 backdrop-blur-md border-current/20 shadow-sm`}>
                                {label}
                            </Badge>
                            <StatusBadge status={model.status} />
                        </div>

                        <CardHeader className="pb-2 relative overflow-hidden">

                            <CardTitle className={`flex items-center gap-2 text-lg transition-colors ${color} pt-2`}>
                                <div className="p-2 rounded-lg bg-background/50 shadow-sm border border-border/50">
                                    {icon}
                                </div>
                                <span className="text-foreground group-hover:text-primary transition-colors truncate" title={model.name}>{model.name}</span>
                            </CardTitle>
                            <CardDescription className="line-clamp-1 flex items-center gap-1 text-xs mt-1">
                                <Database className="h-3 w-3" />
                                <span className="truncate">{model.dataset_name}</span>
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4 flex-grow">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-background/40 p-2.5 rounded-lg border border-border/50">
                                    <span className="text-muted-foreground text-xs block mb-0.5">Objetivo</span>
                                    <div className="font-medium text-primary flex items-center gap-1.5 truncate" title={model.target_column}>
                                        <Target className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{model.target_column}</span>
                                    </div>
                                </div>
                                <div className="bg-background/40 p-2.5 rounded-lg border border-border/50">
                                    <span className="text-muted-foreground text-xs block mb-0.5">Variables</span>
                                    <div className="font-medium flex items-center gap-1.5">
                                        <ListFilter className="h-3.5 w-3.5 shrink-0" />
                                        {model.feature_columns.length} campos
                                    </div>
                                </div>
                            </div>

                            {model.metrics && (
                                <div className="pt-3 border-t border-border/50 space-y-2">
                                    <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                                        <Award className="h-3 w-3" />
                                        Métricas
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(model.metrics).map(([key, val]) => {
                                            const friendlyName = {
                                                'loss': 'Error',
                                                'mae': 'MAE',
                                                'accuracy': 'Precisión',
                                                'mse': 'MSE',
                                            }[key] || key;

                                            return (
                                                <div key={key} className="bg-background/50 p-2 rounded border border-border/50 flex flex-col justify-between hover:bg-background/80 transition-colors">
                                                    <p className="text-[10px] text-muted-foreground uppercase truncate" title={key}>{friendlyName}</p>
                                                    <p className="text-sm font-bold truncate">{typeof val === 'number' ? val.toFixed(2) : val}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {model.error && (
                                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex gap-2 items-start border border-destructive/20 animate-in fade-in zoom-in-95">
                                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                    <span className="break-words">{model.error}</span>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="bg-muted/30 p-4 border-t border-border/50 grid gap-3">
                            {/* Primary Actions - Full Width */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                <PredictionDialog model={model} />
                                <BatchPredictionDialog model={model} />
                            </div>

                            {/* Secondary Actions - Right Aligned but adapted for mobile */}
                            <div className="flex gap-2 w-full justify-between sm:justify-end items-center pt-1 border-t border-border/10 sm:border-t-0 sm:pt-0">
                                <span className="text-[10px] text-muted-foreground sm:hidden">Acciones de gestión</span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                                        onClick={() => handleRetrain(model.id, model.name)}
                                        disabled={model.status === 'training' || retrainingId === model.id}
                                        title="Reentrenar"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${model.status === 'training' || retrainingId === model.id ? 'animate-spin' : ''}`} />
                                        <span className="hidden sm:inline">Reentrenar</span>
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        onClick={() => openDeleteDialog(model.id, model.name)}
                                        title="Eliminar"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        <span className="hidden sm:inline">Eliminar</span>
                                    </Button>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                );
            })}

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el modelo
                            <span className="font-bold text-foreground"> "{modelToDelete?.name}" </span>
                            y todos sus datos asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                "Eliminar"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function StatusBadge({ status }: { status: Model['status'] }) {
    switch (status) {
        case 'completed':
            return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Listo</Badge>;
        case 'training':
            return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 animate-pulse"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Entrenando</Badge>;
        case 'failed':
            return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="h-3 w-3 mr-1" /> Error</Badge>;
    }
}
