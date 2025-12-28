"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Workflow, Plus, Trash2, Edit, Eye, Database, Filter, FilterX, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useDashboard } from "@/contexts/DashboardContext";
import { DashboardBadge } from "@/components/dashboard/DashboardBadge";
import TransformationDialog from "@/components/transformations/TransformationDialog";
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

interface Transformation {
    id: number;
    name: string;
    description?: string;
    source_table: string;
    sql_definition: string;
    dashboard_id?: string | null;
    created_at: string;
    updated_at: string;
}

export default function TransformationsPage() {
    const { user } = useAuth();
    const { getDatasetsUsedByCurrentDashboard, currentDashboard } = useDashboard();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTransformation, setEditingTransformation] = useState<Transformation | null>(null);
    const [initialAutoRun, setInitialAutoRun] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [transformationToDelete, setTransformationToDelete] = useState<number | null>(null);
    const [showOnlyDashboardTransformations, setShowOnlyDashboardTransformations] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);

    const { data: transformations, isLoading } = useQuery({
        queryKey: ["transformations"],
        queryFn: async () => {
            const res = await api.get("/transformations/");
            return res.data as Transformation[];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/transformations/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transformations"] });
            queryClient.invalidateQueries({ queryKey: ["datasets"] });
            setDeleteDialogOpen(false);
            setTransformationToDelete(null);
        }
    });

    const handleEdit = (transformation: Transformation, autoRun: boolean = false) => {
        setEditingTransformation(transformation);
        setInitialAutoRun(autoRun);
        setDialogOpen(true);
    };

    const handleDelete = (id: number) => {
        setTransformationToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingTransformation(null);
        setInitialAutoRun(false);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in slide-in-from-left duration-500">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold">
                        Transformaciones de Datos
                    </h1>
                    <p className="text-muted-foreground">
                        Crea vistas SQL persistentes para limpiar, transformar y modelar tus datos.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                    <DashboardBadge />
                </div>
            </div>

            {/* Filter and Search Bar */}
            {!isLoading && (() => {
                const allTransformations = transformations || [];
                const dashboardDatasets = getDatasetsUsedByCurrentDashboard();
                const filteredCount = allTransformations.filter(t => {
                    const viewName = t.name;
                    if (showOnlyDashboardTransformations) {
                        const isUsed = dashboardDatasets.includes(viewName);
                        const isLinked = t.dashboard_id === currentDashboard?.id;
                        if (!isUsed && !isLinked) return false;
                    }
                    if (searchQuery) {
                        const normalize = (str: string) => str.toLowerCase();
                        const query = normalize(searchQuery);
                        return normalize(t.name).includes(query) ||
                            normalize(t.source_table).includes(query) ||
                            (t.description && normalize(t.description).includes(query));
                    }
                    return true;
                }).length;

                // Reset to page 1 when filters change
                const filterKey = `${showOnlyDashboardTransformations}-${searchQuery}`;
                if (typeof window !== 'undefined') {
                    const prevFilterKey = (window as any).__prevFilterKey;
                    if (prevFilterKey !== filterKey) {
                        setCurrentPage(1);
                        (window as any).__prevFilterKey = filterKey;
                    }
                }

                return (
                    <div className="space-y-3">
                        {/* Count Display */}
                        <div className="text-sm text-muted-foreground">
                            {showOnlyDashboardTransformations || searchQuery ? (
                                <span>
                                    Mostrando <span className="font-semibold text-foreground">{filteredCount}</span> de{" "}
                                    <span className="font-semibold text-foreground">{allTransformations.length}</span> transformaciones
                                </span>
                            ) : (
                                <span>
                                    <span className="font-semibold text-foreground">{allTransformations.length}</span> transformaciones totales
                                </span>
                            )}
                        </div>

                        {/* Search and Filter Bar */}
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                            {/* Search Input */}
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                <Input
                                    placeholder="Buscar transformaciones..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 border-primary/20 focus:border-primary bg-background/50 backdrop-blur-sm"
                                />
                            </div>

                            {/* Filter and Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                <Button
                                    variant={showOnlyDashboardTransformations ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setShowOnlyDashboardTransformations(!showOnlyDashboardTransformations)}
                                    className="w-full sm:w-auto justify-center"
                                >
                                    {showOnlyDashboardTransformations ? (
                                        <><Filter className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Solo de este Dashboard</span><span className="sm:hidden">Este Dashboard</span></>
                                    ) : (
                                        <><FilterX className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Todas las Transformaciones</span><span className="sm:hidden">Todas</span></>
                                    )}
                                </Button>

                                {user?.is_superuser && (
                                    <Button
                                        onClick={() => setDialogOpen(true)}
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 w-full sm:w-auto dark:text-white justify-center cursor-pointer"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        <span className="hidden sm:inline">Nueva Transformación</span>
                                        <span className="sm:hidden">Nueva</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Transformations Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (() => {
                const dashboardDatasets = getDatasetsUsedByCurrentDashboard();
                const filteredTransformations = transformations?.filter(t => {
                    const viewName = t.name;
                    if (showOnlyDashboardTransformations) {
                        const isUsed = dashboardDatasets.includes(viewName);
                        const isLinked = t.dashboard_id === currentDashboard?.id;
                        if (!isUsed && !isLinked) return false;
                    }
                    if (searchQuery) {
                        const normalize = (str: string) => str.toLowerCase();
                        const query = normalize(searchQuery);
                        return normalize(t.name).includes(query) ||
                            normalize(t.source_table).includes(query) ||
                            (t.description && normalize(t.description).includes(query));
                    }
                    return true;
                }) || [];

                // Pagination logic
                const totalPages = Math.ceil(filteredTransformations.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedTransformations = filteredTransformations.slice(startIndex, endIndex);

                return filteredTransformations.length > 0 ? (
                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {paginatedTransformations.map((transformation) => {
                                const viewName = transformation.name;
                                const isUsedInDashboard = dashboardDatasets.includes(viewName);

                                return (
                                    <Card
                                        key={transformation.id}
                                        className="relative overflow-hidden border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group bg-gradient-to-br from-card via-card to-muted/20"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full bg-primary transition-opacity duration-500 group-hover:opacity-20" />

                                        <CardHeader className="relative z-10 pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                        <Workflow className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <CardTitle className="text-base font-semibold">
                                                                {transformation.name}
                                                            </CardTitle>
                                                            {isUsedInDashboard && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" title="Usado en este dashboard">
                                                                    En uso
                                                                </span>
                                                            )}
                                                        </div>
                                                        <CardDescription className="text-xs mt-1">
                                                            <Database className="inline h-3 w-3 mr-1" />
                                                            {transformation.source_table}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="relative z-10 space-y-3">
                                            {transformation.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {transformation.description}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(transformation, true)}
                                                    className="flex-1 hover:bg-primary/10 cursor-pointer"
                                                >
                                                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                    Ver
                                                </Button>
                                                {user?.is_superuser && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(transformation)}
                                                            className="hover:bg-primary/10"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(transformation.id)}
                                                            className="hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-primary/10">
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
                                    <span className="text-sm text-muted-foreground">Mostrar:</span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="px-3 py-1.5 text-sm border border-primary/20 rounded-md bg-background hover:bg-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value={6}>6</option>
                                        <option value={9}>9</option>
                                        <option value={12}>12</option>
                                        <option value={18}>18</option>
                                        <option value={24}>24</option>
                                    </select>
                                    <span className="text-sm text-muted-foreground">por página</span>
                                </div>

                                {/* Page info and navigation wrapper */}
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center sm:justify-end">
                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                        Página <span className="font-semibold text-foreground">{currentPage}</span> de{" "}
                                        <span className="font-semibold text-foreground">{totalPages}</span>
                                    </span>

                                    {/* Navigation buttons - Responsive layout */}
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0 hidden sm:inline-flex"
                                            title="Primera página"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            <ChevronLeft className="h-4 w-4 -ml-3" />
                                        </Button>

                                        {/* Previous page button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 w-8 p-0"
                                            title="Página anterior"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        {/* Page numbers - Fewer on mobile */}
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter(page => {
                                                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                                                    if (isMobile) {
                                                        if (Math.abs(page - currentPage) <= 1) return true;
                                                        return false;
                                                    } else {
                                                        if (page === 1 || page === totalPages) return true;
                                                        if (Math.abs(page - currentPage) <= 1) return true;
                                                        return false;
                                                    }
                                                })
                                                .map((page, index, array) => {
                                                    const prevPage = array[index - 1];
                                                    const showEllipsis = prevPage && page - prevPage > 1;

                                                    return (
                                                        <div key={page} className="flex items-center gap-1">
                                                            {showEllipsis && (
                                                                <span className="px-1 sm:px-2 text-muted-foreground text-xs sm:text-sm">...</span>
                                                            )}
                                                            <Button
                                                                variant={currentPage === page ? "default" : "outline"}
                                                                size="sm"
                                                                onClick={() => setCurrentPage(page)}
                                                                className="h-8 w-8 p-0 text-xs sm:text-sm"
                                                            >
                                                                {page}
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                        </div>

                                        {/* Next page button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0"
                                            title="Página siguiente"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>

                                        {/* Last page button - Hidden on small screens */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-8 p-0 hidden sm:inline-flex"
                                            title="Última página"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                            <ChevronRight className="h-4 w-4 -ml-3" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Card className="border-dashed border-2 border-primary/20">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Workflow className="h-16 w-16 text-muted-foreground/50 mb-4" />
                            <p className="text-lg font-medium text-muted-foreground mb-1">
                                {searchQuery ? `No se encontraron resultados para "${searchQuery}"` :
                                    showOnlyDashboardTransformations ? "No hay transformaciones en este dashboard" :
                                        "No hay transformaciones"}
                            </p>
                            <p className="text-sm text-muted-foreground mb-4">
                                {searchQuery ? "Intenta con otros términos de búsqueda" :
                                    showOnlyDashboardTransformations
                                        ? "No hay transformaciones usadas en este dashboard"
                                        : "Crea tu primera transformación para comenzar a modelar datos"}
                            </p>
                            {user?.is_superuser && !showOnlyDashboardTransformations && !searchQuery && (
                                <Button onClick={() => setDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nueva Transformación
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                );
            })()}

            {/* Dialogs */}
            <TransformationDialog
                open={dialogOpen}
                onClose={handleDialogClose}
                transformation={editingTransformation}
                initialAutoRun={initialAutoRun}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar Transformación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente la transformación y su vista asociada.
                            Los widgets que usen esta vista dejarán de funcionar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => transformationToDelete && deleteMutation.mutate(transformationToDelete)}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
