"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
    YMaps,
    Map,
    Placemark,
    FullscreenControl,
    ZoomControl,
    TypeSelector,
    TrafficControl,
    SearchControl,
    GeolocationControl
} from "@pbe/react-yandex-maps";
import { Loader2, Target, Navigation2, X, Search } from "lucide-react";
import type { UserData } from "@/contexts/auth-context";
import { toast } from "sonner";

interface LocationMapProps {
    employees: UserData[];
    center?: { lat: number; lng: number };
    zoom?: number;
    selectedEmployee?: UserData | null;
    currentUserId?: string;
    dailyStats?: Record<string, number>;
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
    dailyStats,
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

            <div className="absolute top-2 right-2 sm:bottom-6 sm:left-4 sm:top-auto sm:right-auto z-10 flex flex-col sm:flex-col gap-2 sm:gap-3">
                <button
                    onClick={() => {
                        const searchInput = document.querySelector('.ymaps-2-1-79-searchbox-input__input') as HTMLInputElement;
                        if (searchInput) {
                            searchInput.focus();
                        } else {
                            toast.info("Qidiruv paneli tepadagi markazda joylashgan");
                        }
                    }}
                    className="p-2 sm:p-3 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl sm:rounded-2xl shadow-xl hover:bg-white transition-all active:scale-95 text-slate-700 group/search"
                    title="Qidirish"
                >
                    <Search className="w-5 h-5 sm:w-6 sm:h-6 group-hover/search:scale-110 transition-transform" />
                </button>

                <button
                    onClick={focusMe}
                    className="p-2 sm:p-3 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl sm:rounded-2xl shadow-xl hover:bg-white transition-all active:scale-95 text-blue-600 group/btn"
                    title="Mening joylashuvim"
                >
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 group-active/btn:rotate-12 transition-transform" />
                </button>

                {routeActive && (
                    <button
                        onClick={clearRoute}
                        className="p-2 sm:p-3 bg-red-500/90 backdrop-blur-md border border-red-600 rounded-xl sm:rounded-2xl shadow-xl hover:bg-red-500 transition-all active:scale-95 text-white flex items-center gap-2 font-bold text-[10px] sm:text-xs"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        TOZALASH
                    </button>
                )}
            </div>


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
                    {/* Native controls optimized for mobile/desktop spacing */}
                    <FullscreenControl options={{ position: { right: 10, top: 10 } }} />
                    <TypeSelector options={{ position: { right: 10, top: 45 } }} />
                    <TrafficControl options={{ position: { right: 10, top: 80 } }} />

                    <ZoomControl options={{
                        size: "small",
                        position: { right: 10, bottom: 120 }
                    }} />

                    <GeolocationControl options={{
                        position: { right: 10, bottom: 190 }
                    }} />

                    <SearchControl options={{
                        float: 'none',
                        position: { top: 10, left: 'center' },
                        maxWidth: [150, 250, 400],
                        placeholderContent: "Manzil..."
                    }} />

                    {myLocation && !employees.some(e => e.uid === currentUserId) && (
                        <Placemark
                            geometry={[myLocation.lat, myLocation.lng]}
                            properties={{
                                balloonContent: "Sizning joyingiz",
                                iconCaption: "Men"
                            }}
                            options={{
                                preset: 'islands#blueCircleDotIconWithCaption',
                                iconColor: '#3b82f6',
                            }}
                        />
                    )}

                    {employees.map((employee) => {
                        const loc = employee.currentLocation;
                        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;

                        const isOnline = employee.locationEnabled;
                        const todayTotal = dailyStats?.[employee.uid] || 0;
                        const markerColor = isOnline ? "#10b981" : "#64748b";
                        const iconPreset = isOnline
                            ? "islands#greenCircleDotIconWithCaption"
                            : "islands#greyCircleDotIconWithCaption";

                        const formatCurrency = (amount: number) => {
                            return new Intl.NumberFormat("uz-UZ").format(amount);
                        };

                        return (
                            <Placemark
                                key={employee.uid}
                                geometry={[loc.lat, loc.lng]}
                                properties={{
                                    iconCaption: `${employee.firstName} | ${formatCurrency(todayTotal)}`,
                                    balloonContentHeader: `
                                        <div style="padding: 10px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; margin: -10px -10px 10px -10px;">
                                            <div style="font-weight: 800; color: #1e293b; font-size: 16px;">${employee.firstName} ${employee.lastName}</div>
                                            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${employee.profession}</div>
                                        </div>
                                    `,
                                    balloonContentBody: `
                                        <div style="font-family: sans-serif; min-width: 220px; padding: 5px 0;">
                                            <div style="display: flex; align-items: center; justify-content: space-between; background: #f1f5f9; padding: 12px; border-radius: 12px; margin-bottom: 15px;">
                                                <div style="font-size: 12px; color: #475569; font-weight: 500;">Bugungi tushum:</div>
                                                <div style="font-size: 16px; font-weight: 800; color: #10b981;">
                                                    ${formatCurrency(todayTotal)} <span style="font-size: 10px; font-weight: 600;">so'm</span>
                                                </div>
                                            </div>
                                            
                                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; font-size: 12px;">
                                                <div style="width: 8px; height: 8px; border-radius: 50%; background: ${isOnline ? '#10b981' : '#64748b'}"></div>
                                                <span style="font-weight: 600; color: ${isOnline ? '#10b981' : '#64748b'}">${isOnline ? "Hozir onlayn" : "Oflayn"}</span>
                                            </div>

                                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                                <button onclick="setMapRoute(${loc.lat}, ${loc.lng})" style="
                                                    width: 100%; height: 42px; background: #3b82f6; color: white;
                                                    border: none; border-radius: 10px; font-weight: 700; cursor: pointer;
                                                    font-size: 13px; box-shadow: 0 4px 6px -1px rgb(59 130 246 / 0.2);
                                                ">
                                                    NAVIGATSIYA (YO'L)
                                                </button>
                                                <a href="https://yandex.uz/maps/?rtext=${myLocation ? `${myLocation.lat},${myLocation.lng}` : ''}~${loc.lat},${loc.lng}&rtt=auto" 
                                                   target="_blank" 
                                                   rel="noopener noreferrer"
                                                   style="
                                                    width: 100%; height: 42px; background: #10b981; color: white;
                                                    border: none; border-radius: 10px; font-weight: 700; cursor: pointer;
                                                    text-decoration: none; text-align: center; font-size: 13px;
                                                    display: flex; align-items: center; justify-content: center;
                                                    box-shadow: 0 4px 6px -1px rgb(16 185 129 / 0.2);
                                                ">
                                                    YANDEX MAPSDA OCHISH
                                                </a>
                                            </div>
                                        </div>
                                    `
                                }}
                                options={{
                                    preset: iconPreset,
                                    iconColor: markerColor,
                                    balloonMaxWidth: 300,
                                    balloonPanelMaxMapArea: 0,
                                    hideIconOnBalloonOpen: false
                                }}
                            />
                        );
                    })}
                </Map>
            </YMaps>
        </div>
    );
}
