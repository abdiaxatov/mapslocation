"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
    YMaps,
    Map,
    Placemark,
    FullscreenControl,
    ZoomControl,
    TypeSelector,
    TrafficControl
} from "@pbe/react-yandex-maps";
import { Loader2, Target, Navigation2, X } from "lucide-react";
import type { UserData } from "@/contexts/auth-context";
import { toast } from "sonner";

interface LocationMapProps {
    employees: UserData[];
    center?: { lat: number; lng: number };
    zoom?: number;
    selectedEmployee?: UserData | null;
    currentUserId?: string;
}

const DEFAULT_CENTER = { lat: 41.2995, lng: 69.2401 };

declare global {
    interface Window {
        setMapRoute: (lat: number, lng: number) => void;
    }
}

export default function LocationMap({
    employees,
    center = DEFAULT_CENTER,
    zoom = 13,
    selectedEmployee,
    currentUserId,
}: LocationMapProps) {
    const [map, setMap] = useState<any>(null);
    const [ymaps, setYmaps] = useState<any>(null);
    const [apiLoaded, setApiLoaded] = useState(false);
    const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [routeActive, setRouteActive] = useState(false);
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

    const currentRouteRef = useRef<any>(null);
    const myLocationRef = useRef<{ lat: number; lng: number } | null>(null);

    // Track location silently using browser API to avoid 403 geocoding errors
    useEffect(() => {
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const newLoc = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    setMyLocation(newLoc);
                    myLocationRef.current = newLoc;
                },
                (err) => console.warn("Geo:", err.message),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Professional Routing with ymaps.multiRouter
    useEffect(() => {
        if (!map || !ymaps) return;

        console.log("Initializing window.setMapRoute...");

        window.setMapRoute = (targetLat: number, targetLng: number) => {
            console.log("setMapRoute triggered for:", targetLat, targetLng);

            // SUPER DEFENSIVE CHECKS
            if (!ymaps || !map) {
                console.error("Map or YMaps instance is MISSING");
                return;
            }

            if (!ymaps.multiRouter || typeof ymaps.multiRouter.MultiRoute === 'undefined') {
                console.error("MultiRouter module is not available on ymaps object");
                toast.error("Xarita xizmati hali to'liq yuklanmadi. Iltimos 2-3 soniya kuting.");
                return;
            }

            if (currentRouteRef.current) {
                try {
                    map.geoObjects.remove(currentRouteRef.current);
                } catch (e) {
                    console.warn("Could not remove old route:", e);
                }
            }

            const currentLoc = myLocationRef.current;
            const startPoint = currentLoc ? [currentLoc.lat, currentLoc.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

            try {
                console.log("Creating new MultiRoute instance...");
                const MultiRouteConstructor = ymaps.multiRouter.MultiRoute;
                const multiRoute = new MultiRouteConstructor(
                    {
                        referencePoints: [startPoint, [targetLat, targetLng]],
                        params: { routingMode: "auto" }
                    },
                    {
                        routeStrokeColor: "#3b82f6",
                        routeStrokeWidth: 5,
                        routeActiveStrokeColor: "#2563eb",
                        routeActiveStrokeWidth: 6,
                        wayPointStartIconColor: "#3b82f6",
                        wayPointFinishIconColor: "#ef4444",
                        boundsAutoApply: true
                    }
                );

                map.geoObjects.add(multiRoute);
                currentRouteRef.current = multiRoute;
                setRouteActive(true);

                multiRoute.model.events.add("requestsuccess", () => {
                    const activeRoute = multiRoute.getActiveRoute();
                    if (activeRoute) {
                        const distance = activeRoute.properties.get("distance").text;
                        const duration = activeRoute.properties.get("duration").text;
                        toast.success(`Marshrut: ${distance}, ${duration}`);
                    }
                    const bounds = multiRoute.getBounds();
                    if (bounds) {
                        map.setBounds(bounds, { checkZoomRange: true, duration: 800 });
                    }
                });

                multiRoute.model.events.add("requestfail", (event: any) => {
                    console.error("Route request failed:", event.get("error"));
                    toast.error("Marshrutni qurib bo'lmadi");
                });

            } catch (err) {
                console.error("FATAL Routing Error:", err);
                toast.error("Marshrut tizimida kutilmagan xatolik");
            }
        };

        return () => {
            console.log("Cleaning up window.setMapRoute");
            delete (window as any).setMapRoute;
        };
    }, [map, ymaps]);

    const clearRoute = () => {
        if (map && currentRouteRef.current) {
            map.geoObjects.remove(currentRouteRef.current);
            currentRouteRef.current = null;
            setRouteActive(false);
            if (myLocation) {
                map.setCenter([myLocation.lat, myLocation.lng], 14, { duration: 1000 });
            } else {
                map.setCenter([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 13, { duration: 1000 });
            }
        }
    };

    const focusMe = () => {
        if (map && myLocation) {
            map.setCenter([myLocation.lat, myLocation.lng], 16, { duration: 1200 });
        }
    };

    useEffect(() => {
        if (map && selectedEmployee?.currentLocation) {
            map.setCenter([selectedEmployee.currentLocation.lat, selectedEmployee.currentLocation.lng], 16, {
                duration: 1000,
            });
        }
    }, [map, selectedEmployee]);

    const mapState = useMemo(() => ({
        center: center ? [center.lat, center.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        zoom: zoom,
        controls: [],
    }), [center, zoom]);

    const formatLastSeen = (timestamp: any) => {
        if (!timestamp) return "Noma'lum";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return new Intl.DateTimeFormat("uz-UZ", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
            }).format(date);
        } catch (e) {
            return "Noma'lum";
        }
    };

    return (
        <div className="relative w-full h-full min-h-[500px] rounded-3xl overflow-hidden border border-border bg-secondary/5 group">
            {!apiLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-md z-40">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            )}

            {/* Custom controls */}
            {apiLoaded && (
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <button
                        onClick={focusMe}
                        className="p-3 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg hover:bg-white transition-all active:scale-95 text-blue-600"
                        title="Mening joylashuvim"
                    >
                        <Target className="w-5 h-5" />
                    </button>

                    {routeActive && (
                        <button
                            onClick={clearRoute}
                            className="p-3 bg-red-500/90 backdrop-blur-md border border-red-600 rounded-xl shadow-lg hover:bg-red-500 transition-all active:scale-95 text-white flex items-center gap-2 font-bold text-xs"
                        >
                            <X className="w-4 h-4" />
                            TOZALASH
                        </button>
                    )}
                </div>
            )}

            <YMaps query={{ apikey: apiKey, lang: "uz_UZ", coordorder: "latlong", load: "package.full" }}>
                <Map
                    onLoad={(y) => {
                        console.log("Yandex Maps API with package.full loaded");
                        setYmaps(y);
                        setApiLoaded(true);
                    }}
                    state={mapState}
                    width="100%"
                    height="100%"
                    instanceRef={(ref) => setMap(ref)}
                    options={{
                        suppressMapOpenBlock: true,
                        yandexMapDisablePoiInteractivity: true,
                        yandexMapAutoReverseGeocoding: false,
                    }}
                >
                    <FullscreenControl options={{ position: { right: 10, bottom: 40 } }} />
                    <ZoomControl options={{ position: { right: 10, top: 120 } }} />
                    <TypeSelector options={{ position: { right: 10, top: 10 } }} />
                    <TrafficControl options={{ position: { right: 10, top: 50 } }} />

                    {myLocation && (
                        <Placemark
                            geometry={[myLocation.lat, myLocation.lng]}
                            properties={{ balloonContent: "Sizning joyingiz" }}
                            options={{
                                preset: 'islands#blueCircleDotIconWithCaption',
                                iconCaption: 'Men',
                                iconColor: '#3b82f6',
                            }}
                        />
                    )}

                    {employees.map((employee) => {
                        const loc = employee.currentLocation;
                        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;

                        const isOnline = employee.locationEnabled;
                        const markerColor = isOnline ? "#059669" : "#6b7280";
                        const iconPreset = isOnline ? "islands#greenCircleDotIcon" : "islands#greyCircleDotIcon";

                        return (
                            <Placemark
                                key={employee.uid}
                                geometry={[loc.lat, loc.lng]}
                                onClick={() => {
                                    if (typeof window !== "undefined" && window.setMapRoute) {
                                        window.setMapRoute(loc.lat, loc.lng);
                                    }
                                }}
                                properties={{
                                    balloonContentHeader: `<b>${employee.firstName} ${employee.lastName}</b>`,
                                    balloonContentBody: `
                                        <div style="font-family: sans-serif; min-width: 200px; padding: 5px;">
                                            <p><b>Kasbi:</b> ${employee.profession}</p>
                                            <p><b>Status:</b> ${isOnline ? "Online" : "Offline"}</p>
                                            <button onclick="setMapRoute(${loc.lat}, ${loc.lng})" style="
                                                width: 100%; padding: 10px; background: #2563eb; color: white;
                                                border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 10px;
                                            ">
                                                YO'L CHIZISH
                                            </button>
                                        </div>
                                    `
                                }}
                                options={{
                                    preset: iconPreset,
                                    iconColor: markerColor,
                                    balloonMaxWidth: 300,
                                }}
                            />
                        );
                    })}
                </Map>
            </YMaps>
        </div>
    );
}
