"use client";

import React, { useState, useRef } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Model } from './ModelList';
import * as XLSX from 'xlsx';

interface BatchPredictionDialogProps {
    model: Model;
}

export function BatchPredictionDialog({ model }: BatchPredictionDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const templateData = [
            model.feature_columns.reduce((acc, col) => ({ ...acc, [col]: "" }), {})
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");

        XLSX.writeFile(wb, `${model.name}_template.xlsx`);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                throw new Error("El archivo está vacío");
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/models/${model.id}/predict/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jsonData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Error al procesar predicciones");
            }

            const predictions = await response.json();

            const mergedResults = jsonData.map((row: any, i) => ({
                ...row,
                "Predicción IA": typeof predictions[i] === 'object' ? predictions[i].prediction : predictions[i].prediction,
                "Confianza": typeof predictions[i] === 'object' ? `${(predictions[i].confidence_score * 100).toFixed(1)}%` : '-'
            }));

            setResults(mergedResults);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const downloadResults = () => {
        if (results.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Predicciones");

        XLSX.writeFile(wb, `${model.name}_predicciones.xlsx`);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Generar Escenarios
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Predicciones Masivas: {model.name}</DialogTitle>
                    <DialogDescription>
                        Sube un archivo Excel con múltiples escenarios para obtener predicciones en lote.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Step 1: Download Template */}
                    <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-sm">1. Descarga la plantilla</h4>
                                <p className="text-xs text-muted-foreground">Obtén un Excel con las columnas exactas que necesita el modelo.</p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={downloadTemplate} className='gap-2'>
                                <Download className="h-4 w-4" />
                                Plantilla
                            </Button>
                        </div>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-3">
                        <div>
                            <h4 className="font-semibold text-sm">2. Sube tus escenarios</h4>
                            <p className="text-xs text-muted-foreground">Sube el Excel completado. Procesaremos todas las filas a la vez.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                                id="batch-file-upload"
                            />
                            <Button
                                disabled={isLoading}
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full sm:w-auto gap-2"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {isLoading ? "Procesando..." : "Subir Archivo y Predecir"}
                            </Button>
                        </div>
                        {error && (
                            <div className="text-red-500 text-sm flex items-center gap-2 mt-2">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Step 3: Results */}
                    {results.length > 0 && (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    Resultados ({results.length} filas)
                                </h4>
                                <Button size="sm" onClick={downloadResults} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                    <Download className="h-4 w-4" />
                                    Descargar Excel
                                </Button>
                            </div>

                            <div className="border rounded-md max-h-[300px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {/* Show first few columns and prediction */}
                                            {Object.keys(results[0]).slice(0, 3).map((key) => (
                                                <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>
                                            ))}
                                            <TableHead className="font-bold text-primary">Predicción IA</TableHead>
                                            <TableHead>Confianza</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.slice(0, 10).map((row, i) => (
                                            <TableRow key={i}>
                                                {Object.keys(row).slice(0, 3).map((key) => (
                                                    <TableCell key={key}>{row[key]}</TableCell>
                                                ))}
                                                <TableCell className="font-bold text-primary">
                                                    {typeof row["Predicción IA"] === 'number'
                                                        ? row["Predicción IA"].toLocaleString('es-BO', { style: 'currency', currency: 'BOB' })
                                                        : row["Predicción IA"]}
                                                </TableCell>
                                                <TableCell>{row["Confianza"]}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {results.length > 10 && (
                                <p className="text-xs text-center text-muted-foreground">Mostrando primeras 10 filas de {results.length}</p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
