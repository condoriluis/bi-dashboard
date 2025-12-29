"use client";

import React, { useState } from 'react';
import { Play, Loader2, Send, Brain, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface Model {
    id: string;
    name: string;
    feature_columns: string[];
    target_column: string;
    status: string;
}

export default function PredictionDialog({ model }: { model: Model }) {
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [prediction, setPrediction] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

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
            setPrediction(data);
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" className="flex-1 bg-blue-600 hover:bg-blue-700 cursor-pointer" disabled={model.status !== 'completed'}>
                    <Play className="h-4 w-4 mr-2" />
                    Probar Modelo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
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
                        Configura las variables de entrada a continuación. El sistema utilizará la red neuronal entrenada para estimar el resultado.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handlePredict} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[400px] overflow-y-auto px-1">
                        {model.feature_columns.map((col) => {
                            let inputType = "text";
                            if (col.toLowerCase().includes('fecha') || col.toLowerCase().includes('date')) {
                                inputType = "datetime-local";
                            } else if (col.toLowerCase().includes('cantidad') || col.toLowerCase().includes('monto') || col.toLowerCase().includes('precio') || col.toLowerCase().includes('valor')) {
                                inputType = "number";
                            }

                            return (
                                <div key={col} className="space-y-2 group">
                                    <Label htmlFor={col} className="text-xs uppercase font-bold text-muted-foreground group-hover:text-blue-500 transition-colors flex items-center gap-2">
                                        {col}
                                    </Label>
                                    <Input
                                        id={col}
                                        type={inputType}
                                        placeholder={`Ingresar ${col}...`}
                                        onChange={(e) => handleInputChange(col, e.target.value)}
                                        className="bg-muted/30 border-muted-foreground/20 focus:bg-background transition-all hover:border-blue-500/50"
                                        required
                                        step="any"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {prediction !== null && (
                        <div className="p-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-900/20 text-center animate-in slide-in-from-bottom-4 duration-500 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles className="h-20 w-20 text-white rotate-12" />
                            </div>

                            <p className="text-sm text-blue-100 uppercase font-bold mb-2 tracking-widest relative z-10">
                                Predicción Estimada ({model.target_column})
                            </p>
                            <h3 className="text-5xl font-black text-white mb-2 relative z-10 tracking-tight">
                                {(() => {

                                    const val = typeof prediction === 'object' ? prediction.prediction : prediction;
                                    const target = model.target_column.toLowerCase();

                                    if (['venta', 'sales', 'monto', 'precio', 'price', 'costo', 'revenue', 'income'].some(t => target.includes(t))) {
                                        return formatCurrency(val);
                                    }

                                    return formatNumber(val);
                                })()}
                            </h3>

                            {typeof prediction === 'object' && prediction.mae !== undefined && (
                                <div className="inline-flex flex-col items-center gap-1 relative z-10">
                                    <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs text-blue-50 backdrop-blur-sm border border-white/10">
                                        <Brain className="h-3 w-3" />
                                        <span>Confianza estimada: {(prediction.confidence_score * 100).toFixed(1)}%</span>
                                    </div>
                                    <span className="text-[10px] text-blue-200/80">
                                        Margen de error: +/- {formatNumber(prediction.mae)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="submit"
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity h-12 text-base font-semibold shadow-lg cursor-pointer"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            {loading ? "Analizando patrones..." : "Generar Predicción con IA"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
