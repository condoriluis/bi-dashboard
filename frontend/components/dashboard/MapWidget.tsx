"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { formatNumber } from "@/lib/utils";

function MapBounds({ points }: { points: [number, number][] }) {
    const map = useMap();

    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [points, map]);

    return null;
}

interface MapWidgetProps {
    data: any[];
    config: any;
    isDarkMode?: boolean;
}

export default function MapWidget({ data, config, isDarkMode = false }: MapWidgetProps) {
    const [mounted, setMounted] = useState(false);
    const [viewMode, setViewMode] = useState<'points' | 'heat'>('points');
    const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const validData = useMemo(() => {
        return data
            .map(row => ({
                ...row,
                lat: Number(row.lat),
                lon: Number(row.lon),
                size: (row.size !== undefined && row.size !== null && row.size !== '') ? Number(row.size) : undefined
            }))
            .filter(row => !isNaN(row.lat) && !isNaN(row.lon) && row.lat !== 0 && row.lon !== 0);
    }, [data]);

    const points = useMemo(() => {
        return validData.map(row => [row.lat, row.lon] as [number, number]);
    }, [validData]);

    const { minSize, maxSize } = useMemo(() => {
        if (!config.sizeAxis || validData.length === 0) return { minSize: 10, maxSize: 10 };
        const values = validData
            .map(d => Number(d.size))
            .filter(v => !isNaN(v));

        if (values.length === 0) return { minSize: 10, maxSize: 10 };

        return {
            minSize: Math.min(...values),
            maxSize: Math.max(...values)
        };
    }, [validData, config.sizeAxis]);

    const getRadius = (value: number) => {
        if (!config.sizeAxis) return 10;
        if (value === undefined || value === null || isNaN(value)) return 10;
        if (minSize === maxSize) return 15;
        const minR = 6;
        const maxR = 30;
        return minR + ((value - minSize) / (maxSize - minSize)) * (maxR - minR);
    };

    const heatPoints = useMemo(() => {
        return validData.map(d => [d.lat, d.lon, d.size ? Number(d.size) : 1]);
    }, [validData]);

    const handleResetView = () => {
        if (mapInstance && points.length > 0) {
            const bounds = L.latLngBounds(points);
            mapInstance.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
        }
    };

    if (!mounted) return <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />;

    const tileLayerUrl = isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const attribution = '&copy; <a href="https://carto.com/">CARTO</a>';

    const mapKey = `${config.id}-${isDarkMode ? 'dark' : 'light'}-${viewMode}`;

    return (
        <div className="relative h-full w-full group">
            <MapContainer
                key={mapKey}
                center={[-16.2902, -63.5887]}
                zoom={5}
                style={{ height: "100%", width: "100%", borderRadius: "0.5rem", zIndex: 0 }}
                scrollWheelZoom={true}
                ref={setMapInstance}
                zoomControl={true}
            >
                <TileLayer
                    attribution={attribution}
                    url={tileLayerUrl}
                />

                <MapBounds points={points} />

                {viewMode === 'points' && validData.map((row, i) => {
                    let fillColor = config.color && config.color !== 'default' ? config.color : "#3b82f6";
                    if (row.color) {
                        const colors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
                        let hash = 0;
                        const str = String(row.color);
                        for (let j = 0; j < str.length; j++) {
                            hash = str.charCodeAt(j) + ((hash << 5) - hash);
                        }
                        const index = Math.abs(hash) % colors.length;
                        fillColor = colors[index];
                    }

                    return (
                        <CircleMarker
                            key={`${i}-${row.lat}-${row.lon}`}
                            center={[row.lat, row.lon]}
                            pathOptions={{
                                fillColor: fillColor,
                                color: isDarkMode ? "#ffffff" : "#000000",
                                weight: 1.5,
                                opacity: 0.3,
                                fillOpacity: 0.7,
                                className: "transition-all duration-300 hover:fill-opacity-90 cursor-pointer"
                            }}
                            radius={getRadius(Number(row.size))}
                            eventHandlers={{
                                mouseover: (e) => {
                                    e.target.setStyle({ weight: 2, opacity: 0.8, fillOpacity: 1 });
                                    e.target.openPopup();
                                },
                                mouseout: (e) => {
                                    e.target.setStyle({ weight: 1.5, opacity: 0.3, fillOpacity: 0.7 });
                                    e.target.closePopup();
                                }
                            }}
                        >
                            <Popup className="custom-popup" closeButton={false}>
                                <div className="p-1 space-y-1.5 min-w-[160px]">
                                    <h4 className="font-bold text-sm border-b border-border/50 pb-1.5">{row.label}</h4>
                                    <div className="text-xs space-y-1.5">
                                        {Object.entries(row)
                                            .filter(([key]) => !['lat', 'lon', 'size', 'color', 'label'].includes(key) && row[key] !== null)
                                            .map(([key, value]) => (
                                                <div key={key} className="flex justify-between items-center gap-4">
                                                    <span className="text-muted-foreground capitalize text-[10px]">{key.replace(/_/g, ' ')}</span>
                                                    <span className="font-mono font-medium text-xs truncate max-w-[100px]" title={String(value)}>
                                                        {typeof value === 'number' ? formatNumber(value) : String(value)}
                                                    </span>
                                                </div>
                                            ))}
                                        <div className="pt-2 border-t border-border/50 mt-1 flex justify-between text-[10px] text-muted-foreground/50 font-mono">
                                            <span>Lat: {row.lat.toFixed(4)}</span>
                                            <span>Lon: {row.lon.toFixed(4)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </CircleMarker>
                    );
                })}

                {viewMode === 'heat' && (
                    <HeatmapLayer points={heatPoints} />
                )}

            </MapContainer>

            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
                <div className="bg-background/90 backdrop-blur-md border border-border/50 p-1.5 rounded-lg shadow-lg flex flex-col gap-1">
                    <button
                        onClick={() => setViewMode('points')}
                        className={`p-2 rounded-md transition-all text-xs font-medium flex items-center justify-center gap-2 ${viewMode === 'points'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        title="Ver puntos"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
                    </button>
                    <button
                        onClick={() => setViewMode('heat')}
                        className={`p-2 rounded-md transition-all text-xs font-medium flex items-center justify-center gap-2 ${viewMode === 'heat'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        title="Mapa de calor"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 1 0 5" /></svg>
                    </button>
                </div>

                <button
                    onClick={handleResetView}
                    className="bg-background/90 backdrop-blur-md border border-border/50 p-2.5 rounded-lg shadow-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Centrar mapa"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m16 12-4-4-4 4" /><path d="M12 16V8" /></svg>
                </button>
            </div>

            {config.sizeAxis && viewMode === 'points' && (
                <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
                    <div className="bg-background/90 backdrop-blur-md border border-border/50 p-2 rounded-lg shadow-lg flex flex-col items-center gap-1 min-w-[80px]">
                        <span className="text-[10px] font-medium text-muted-foreground">Magnitud</span>
                        <div className="flex items-end gap-2 h-8">
                            <div className="w-2 h-2 rounded-full bg-primary/50"></div>
                            <div className="w-3 h-3 rounded-full bg-primary/60"></div>
                            <div className="w-5 h-5 rounded-full bg-primary/80"></div>
                        </div>
                        <div className="flex justify-between w-full text-[9px] text-muted-foreground font-mono">
                            <span>{formatNumber(minSize)}</span>
                            <span>{formatNumber(maxSize)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Heatmap Component Wrapper
function HeatmapLayer({ points }: { points: any[] }) {
    const map = useMap();

    useEffect(() => {
        let heatLayer: any = null;
        let cancelled = false;

        const loadAndRender = async () => {
            if (!(L as any).heatLayer) {
                try {
                    await import("leaflet.heat");
                } catch (e) {
                    console.error("Error cargando leaflet.heat:", e);
                    return;
                }
            }

            if (cancelled) return;

            if ((L as any).heatLayer) {
                try {
                    heatLayer = (L as any).heatLayer(points, {
                        radius: 25,
                        blur: 15,
                        maxZoom: 10,
                        gradient: {
                            0.4: 'blue',
                            0.6: 'cyan',
                            0.7: 'lime',
                            0.8: 'yellow',
                            1.0: 'red'
                        }
                    });

                    if (map && !cancelled) {
                        heatLayer.addTo(map);
                    }
                } catch (e) {
                    console.error("Error adding heat layer", e);
                }
            }
        };

        loadAndRender();

        return () => {
            cancelled = true;
            try {
                if (heatLayer && map) {
                    map.removeLayer(heatLayer);
                }
            } catch (e) {
                // Ignore cleanup errors if map is gone
            }
        };
    }, [points, map]);

    return null;
}
