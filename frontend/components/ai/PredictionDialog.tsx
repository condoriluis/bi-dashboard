"use client";

import React, { useState, useEffect } from 'react';
import {
    Loader2,
    Brain,
    Sparkles,
    Calendar,
    Hash,
    Type,
    TrendingUp,
    Activity,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { cn } from "@/lib/utils";

interface Model {
    id: string;
    name: string;
    feature_columns: string[];
    target_column: string;
    status: string;
    type?: string;
    metrics?: any;
}

export default function PredictionDialog({ model }: { model: Model }) {
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [prediction, setPrediction] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<'input' | 'result'>('input');

    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setStep('input');
                setPrediction(null);
                setInputs({});
            }, 300);
        }
    }, [open]);

    const handlePredict = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    model_id: model.id,
                    input_data: inputs
                }),
            });

            if (!response.ok) throw new Error('Error en la predicción');
            const data = await response.json();

            await new Promise(resolve => setTimeout(resolve, 600));

            setPrediction(data);
            setStep('result');
            toast.success("Predicción generada exitosamente");
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar la predicción");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (col: string, val: string) => {
        setInputs(prev => ({ ...prev, [col]: val }));
    };

    const getInputIcon = (colName: string) => {
        const lower = colName.toLowerCase();
        if (lower.includes('fecha') || lower.includes('date') || lower.includes('year') || lower.includes('time')) return <Calendar className="w-4 h-4" />;
        if (lower.includes('cantidad') || lower.includes('monto') || lower.includes('precio') || lower.includes('valor') || lower.includes('total')) return <Hash className="w-4 h-4" />;
        return <Type className="w-4 h-4" />;
    };

    const getInputType = (colName: string) => {
        const lower = colName.toLowerCase();
        if (lower.includes('fecha') || lower.includes('date')) return "datetime-local";
        if (lower.includes('year')) return "number";
        if (lower.includes('cantidad') || lower.includes('monto') || lower.includes('precio') || lower.includes('valor')) return "number";
        return "text";
    };

    const resetPrediction = () => {
        setStep('input');
        setPrediction(null);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-200"
                    disabled={model.status !== 'completed'}
                >
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    Probar Modelo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl border shadow-2xl bg-background/95 backdrop-blur-xl duration-300">

                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <span className="block font-bold">Ejecutar Predicción</span>
                            <span className="text-sm font-normal text-muted-foreground">Modelo: {model.name}</span>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="pt-2">
                        {step === 'input'
                            ? `Configura las variables de entrada a continuación. El sistema utilizará la red neuronal entrenada para estimar el resultado.`
                            : `Análisis completado por el modelo.`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 overflow-hidden relative min-h-[300px]">
                    <div className={cn(
                        "transition-all duration-500 ease-in-out transform",
                        step === 'input' ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 absolute inset-0"
                    )}>
                        <form id="prediction-form" onSubmit={handlePredict} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {model.feature_columns.map((col, idx) => (
                                    <div key={col} className="space-y-2 group animate-in slide-in-from-bottom-2 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <Label htmlFor={col} className="text-xs uppercase font-bold text-muted-foreground/70 group-hover:text-primary transition-colors flex items-center gap-2">
                                            {getInputIcon(col)}
                                            {col.replace(/_/g, ' ')}
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id={col}
                                                type={getInputType(col)}
                                                placeholder={`Ingresar valor...`}
                                                onChange={(e) => handleInputChange(col, e.target.value)}
                                                className="bg-muted/30 border-input focus:bg-background transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20 h-11"
                                                required
                                                step="any"
                                                value={inputs[col] || ''}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </form>
                    </div>

                    <div className={cn(
                        "transition-all duration-500 ease-in-out transform absolute inset-0 flex flex-col items-center justify-center",
                        step === 'result' ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
                    )}>
                        {prediction && (
                            <div className="w-full max-w-md space-y-6 text-center">
                                <div className="relative group mx-auto w-full">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative p-8 rounded-2xl bg-card border border-border/50 shadow-xl overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <Sparkles className="h-32 w-32 rotate-12" />
                                        </div>

                                        <div className="relative z-10">
                                            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">
                                                Resultado Estimado
                                            </p>
                                            <h3 className="text-5xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-6 tracking-tighter">
                                                {(() => {
                                                    const val = typeof prediction === 'object' ? prediction.prediction : prediction;
                                                    const target = model.target_column.toLowerCase();
                                                    if (['venta', 'sales', 'monto', 'precio', 'price', 'costo', 'revenue', 'income'].some(t => target.includes(t))) {
                                                        return formatCurrency(val);
                                                    }
                                                    return formatNumber(val);
                                                })()}
                                            </h3>

                                            {typeof prediction === 'object' && (
                                                <div className="grid grid-cols-2 gap-3 mt-6">
                                                    {prediction.confidence_score !== undefined && (
                                                        <div className="flex flex-col items-center p-2 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800">
                                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Confianza</span>
                                                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                                {(prediction.confidence_score * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    )}
                                                    {prediction.mae !== undefined && (
                                                        <div className="flex flex-col items-center p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800">
                                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Margen Error</span>
                                                            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                                                ±{formatNumber(prediction.mae)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">
                                        Predicción basada en {model.feature_columns.length} variables de entrada.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border/40 mt-4">
                    {step === 'input' ? (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                className="mr-auto"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                form="prediction-form"
                                className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                                        Analizando...
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp className="mr-2 h-4 w-4" />
                                        Generar Predicción con IA
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <div className="flex w-full gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="flex-1"
                            >
                                Cerrar
                            </Button>
                            <Button
                                type="button"
                                onClick={resetPrediction}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Activity className="w-4 h-4 mr-2" />
                                Modificar Consulta
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
