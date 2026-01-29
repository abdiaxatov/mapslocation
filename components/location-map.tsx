"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { UserData } from "@/contexts/auth-context";

interface LocationMapProps {
  employees: UserData[];
  center?: [number, number];
  zoom?: number;
  selectedEmployee?: UserData | null;
}

const createMarkerIcon = (isOnline: boolean, isSelected: boolean, name: string) => {
  const size = isSelected ? 48 : 40;
  const bgColor = isOnline ? "#4ade80" : "#64748b";
  const borderColor = isSelected ? "#ffffff" : "#1e1e24";

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position: relative; display: flex; flex-col; align-items: center; justify-content: center;">
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${bgColor};
          border: 3px solid ${borderColor};
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
          transition: transform 0.2s ease;
          z-index: 10;
        ">
          <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="${borderColor}">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          top: ${size + 4}px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(30, 30, 36, 0.9);
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid #2a2a32;
          color: #f8fafc;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          z-index: 20;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          ${name}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

export default function LocationMap({
  employees,
  center = [41.2995, 69.2401],
  zoom = 12,
  selectedEmployee
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map with dark theme
    mapInstanceRef.current = L.map(mapRef.current, {
      zoomControl: false
    }).setView(center, zoom);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);

    // Dark tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    for (const marker of markersRef.current.values()) {
      marker.remove();
    }
    markersRef.current.clear();

    // Add markers for each employee with location
    for (const employee of employees) {
      if (employee.currentLocation) {
        const isSelected = selectedEmployee?.uid === employee.uid;
        const marker = L.marker(
          [employee.currentLocation.lat, employee.currentLocation.lng],
          { icon: createMarkerIcon(employee.locationEnabled ?? false, isSelected, employee.firstName) }
        ).addTo(mapInstanceRef.current);

        // Format timestamp
        let lastSeenText = "Noma'lum";
        if (employee.currentLocation.timestamp) {
          try {
            const ts = employee.currentLocation.timestamp as any;
            const date = ts.toDate ? ts.toDate() : new Date(ts);
            lastSeenText = new Intl.DateTimeFormat('uz-UZ', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit'
            }).format(date);
          } catch (e) {
            console.error("Date formatting error", e);
          }
        }

        marker.bindPopup(`
          <div style="
            min-width: 180px; 
            font-family: system-ui, -apple-system, sans-serif;
            padding: 4px;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 10px;
            ">
              <div style="
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: ${employee.locationEnabled ? '#4ade8020' : '#64748b20'};
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${employee.locationEnabled ? '#4ade80' : '#64748b'}">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #f8fafc;">
                  ${employee.firstName} ${employee.lastName}
                </h3>
                <p style="margin: 2px 0 0; font-size: 12px; color: #94a3b8;">
                  ${employee.profession}
                </p>
              </div>
            </div>
            <div style="
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px 10px;
              background: ${employee.locationEnabled ? '#4ade8015' : '#64748b15'};
              border-radius: 8px;
            ">
              <div style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${employee.locationEnabled ? '#4ade80' : '#64748b'};
              "></div>
              <span style="font-size: 12px; color: ${employee.locationEnabled ? '#4ade80' : '#94a3b8'};">
                ${employee.locationEnabled ? 'Online' : `Oxirgi: ${lastSeenText}`}
              </span>
            </div>
          </div>
        `, {
          className: 'custom-popup'
        });

        markersRef.current.set(employee.uid, marker);
      }
    }

    // Focus on selected employee
    if (selectedEmployee?.currentLocation && selectedEmployee.locationEnabled && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [selectedEmployee.currentLocation.lat, selectedEmployee.currentLocation.lng],
        15,
        { duration: 1 }
      );

      const marker = markersRef.current.get(selectedEmployee.uid);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [employees, selectedEmployee]);

  return (
    <>
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          background: #1e1e24 !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
          border: 1px solid #2a2a32 !important;
        }
        .leaflet-popup-tip {
          background: #1e1e24 !important;
          border: 1px solid #2a2a32 !important;
          border-top: none !important;
          border-right: none !important;
        }
        .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .leaflet-popup-close-button:hover {
          color: #f8fafc !important;
        }
        .leaflet-control-zoom {
          border: none !important;
          background: transparent !important;
        }
        .leaflet-control-zoom a {
          background: #1e1e24 !important;
          color: #f8fafc !important;
          border: 1px solid #2a2a32 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #2a2a32 !important;
        }
        .leaflet-control-attribution {
          background: rgba(30, 30, 36, 0.8) !important;
          color: #64748b !important;
        }
        .leaflet-control-attribution a {
          color: #4ade80 !important;
        }
        .leaflet-pane {
          z-index: 1 !important;
        }
        .leaflet-top, .leaflet-bottom {
          z-index: 10 !important;
        }
        .leaflet-popup-pane {
          z-index: 11 !important;
        }
      `}</style>
      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: "400px", background: "#0a0a0c" }}
      />
    </>
  );
}
