"use client";

import React, { useState } from 'react';
import { Brain, Cpu, History, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ModelList from '@/components/ai/ModelList';
import TrainingForm from '@/components/ai/TrainingForm';

import { Badge } from "@/components/ui/badge";

export default function AIPage() {
    const [activeTab, setActiveTab] = useState("models");

    return (
        <div className="space-y-4">
            <div className="space-y-1 animate-in slide-in-from-left duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold">
                            Inteligencia Artificial
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Entrena y gestiona modelos de predicción basados en tus datasets.
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-700/20 font-bold shadow-sm">
                            <Brain className="h-3 w-3 mr-1.5" />
                            Red Neuronal
                        </Badge>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
                <TabsList className="bg-background/60 backdrop-blur-md border">
                    <TabsTrigger value="models" className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Modelos Entrenados
                    </TabsTrigger>
                    <TabsTrigger value="train" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Entrenar Nuevo
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="models" className="space-y-4">
                    {activeTab === "models" && <ModelList />}
                </TabsContent>

                <TabsContent value="train" className="space-y-2">
                    <Card className="border-primary/20 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom duration-500">
                        <CardHeader>
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <Cpu className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle>Configurar Entrenamiento</CardTitle>
                                    <CardDescription>
                                        Selecciona un dataset y define los parámetros para entrenar tu Red Neuronal.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {activeTab === "train" && <TrainingForm onSuccess={() => setActiveTab('models')} />}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
