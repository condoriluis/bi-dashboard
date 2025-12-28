"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Edit3 } from "lucide-react";
import { dashboardService } from "@/services/dashboard";
import { toast } from "sonner";

interface DashboardManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDashboardCreated: (dashboard: any) => void;
    mode: 'create' | 'edit' | 'delete';
    currentDashboard?: any;
}

export function DashboardManager({ open, onOpenChange, onDashboardCreated, mode, currentDashboard }: DashboardManagerProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            if (mode === 'edit' && currentDashboard) {
                setName(currentDashboard.name || "");
                setDescription(currentDashboard.description || "");
            } else if (mode === 'create') {
                setName("");
                setDescription("");
            }
        }
    }, [open, mode, currentDashboard]);

    const handleSubmit = async () => {
        if (mode === 'create' && !name.trim()) {
            toast.error("El nombre del dashboard es requerido");
            return;
        }

        setLoading(true);
        try {
            if (mode === 'create') {
                const newDashboard = await dashboardService.create(name, description);
                toast.success(`Dashboard "${name}" creado exitosamente`);
                onDashboardCreated(newDashboard);
            } else if (mode === 'edit' && currentDashboard) {
                await dashboardService.update(currentDashboard.id, name, description);
                toast.success(`Dashboard actualizado`);
                onDashboardCreated({ ...currentDashboard, name, description });
            } else if (mode === 'delete' && currentDashboard) {
                await dashboardService.delete(currentDashboard.id);
                toast.success(`Dashboard eliminado`);
                onDashboardCreated(null);
            }
            onOpenChange(false);
            setName("");
            setDescription("");
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al procesar la solicitud");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setName(currentDashboard?.name || "");
            setDescription(currentDashboard?.description || "");
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {mode === 'create' && (
                            <>
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                    <Plus className="h-4 w-4 text-white" />
                                </div>
                                Crear Nuevo Dashboard
                            </>
                        )}
                        {mode === 'edit' && (
                            <>
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                    <Edit3 className="h-4 w-4 text-white" />
                                </div>
                                Editar Dashboard
                            </>
                        )}
                        {mode === 'delete' && (
                            <>
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
                                    <Trash2 className="h-4 w-4 text-white" />
                                </div>
                                Eliminar Dashboard
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'create' && "Crea un nuevo dashboard para organizar tus visualizaciones."}
                        {mode === 'edit' && "Actualiza el nombre y descripción de tu dashboard."}
                        {mode === 'delete' && "¿Estás seguro de que deseas eliminar este dashboard? Esta acción no se puede deshacer."}
                    </DialogDescription>
                </DialogHeader>

                {mode !== 'delete' ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre del Dashboard</Label>
                            <Input
                                id="name"
                                placeholder="Ej: Dashboard de Ventas"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción (Opcional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe el propósito de este dashboard..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={loading}
                                rows={3}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="py-4">
                        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                Dashboard: <span className="font-bold">{currentDashboard?.name}</span>
                            </p>
                            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2">
                                Todos los widgets asociados a este dashboard también serán eliminados.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || (mode !== 'delete' && !name.trim())}
                        className={
                            mode === 'delete'
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        }
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {mode === 'create' && "Crear Dashboard"}
                        {mode === 'edit' && "Guardar Cambios"}
                        {mode === 'delete' && "Eliminar Dashboard"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
