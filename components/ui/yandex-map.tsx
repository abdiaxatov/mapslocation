"use client";

import { YMaps, Map, Placemark, ZoomControl, FullscreenControl, TypeSelector, TrafficControl } from "@pbe/react-yandex-maps";
import { Loader2, Target } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";

interface YandexMapProps {
    center?: { lat: number; lng: number };
    zoom?: number;
    onLocationSelect?: (lat: number, lng: number) => void;
    markers?: Array<{ lat: number; lng: number; title?: string }>;
}

const DEFAULT_CENTER = [41.2995, 69.2401];

export default function YandexMap({
    center,
    zoom = 15,
    onLocationSelect,
    markers = []
}: YandexMapProps) {
    const [apiLoaded, setApiLoaded] = useState(false);
    const [map, setMap] = useState<any>(null);
    const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

    // Track location via browser API to avoid 403 geocoding errors
    useEffect(() => {
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setMyLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => console.warn("Geo:", err.message),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    const focusMe = () => {
        if (map && myLocation) {
            map.setCenter([myLocation.lat, myLocation.lng], 16, { duration: 1000 });
        }
    };

    const mapState = useMemo(() => ({
        center: center ? [center.lat, center.lng] : DEFAULT_CENTER,
        zoom: zoom,
        controls: []
    }), [center, zoom]);

    const handleMapClick = (e: any) => {
        if (onLocationSelect) {
            const coords = e.get("coords");
            onLocationSelect(coords[0], coords[1]);
        }
    };

    return (
        <div className="relative w-full h-full min-h-[350px] rounded-2xl overflow-hidden border border-border bg-secondary/5">
            {!apiLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/30 backdrop-blur-sm z-20">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {/* Custom focus button to replace 403-triggering GeolocationControl */}
            {apiLoaded && (
                <button
                    onClick={focusMe}
                    className="absolute top-4 left-4 z-10 p-3 bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg hover:bg-white transition-all active:scale-95 text-blue-600"
                    title="Mening joylashuvim"
                >
                    <Target className="w-5 h-5" />
                </button>
            )}

            <YMaps query={{ apikey: apiKey, lang: "uz_UZ", coordorder: "latlong" }}>
                <Map
                    onLoad={() => setApiLoaded(true)}
                    state={mapState}
                    width="100%"
                    height="100%"
                    onClick={handleMapClick}
                    instanceRef={(ref) => setMap(ref)}
                    options={{
                        suppressMapOpenBlock: true,
                        yandexMapDisablePoiInteractivity: true,
                        yandexMapAutoReverseGeocoding: false, // Critical Fix
                    }}
                >
                    <FullscreenControl options={{ position: { right: 10, bottom: 40 } }} />
                    <ZoomControl options={{ position: { right: 10, top: 100 } }} />
                    <TypeSelector options={{ position: { right: 10, top: 15 } }} />
                    <TrafficControl options={{ position: { right: 10, top: 55 } }} />

                    {myLocation && (
                        <Placemark
                            geometry={[myLocation.lat, myLocation.lng]}
                            options={{
                                preset: 'islands#blueCircleDotIcon',
                                iconColor: '#3b82f6',
                            }}
                            properties={{
                                hintContent: "Mening joylashuvim",
                            }}
                        />
                    )}

                    {center && (
                        <Placemark
                            geometry={[center.lat, center.lng]}
                            options={{
                                preset: 'islands#dotIcon',
                                iconColor: '#10b981',
                            }}
                            properties={{
                                iconCaption: "Tanlangan nuqta"
                            }}
                        />
                    )}

                    {markers.map((marker, idx) => (
                        <Placemark
                            key={idx}
                            geometry={[marker.lat, marker.lng]}
                            properties={{
                                balloonContent: marker.title,
                            }}
                            options={{
                                preset: 'islands#redDotIcon',
                            }}
                        />
                    ))}
                </Map>
            </YMaps>
        </div>
    );
}
