"use client";

import { useEffect, useRef } from "react";

import type { DeliveryOption } from "../types";

type Props = {
  points: DeliveryOption[];
  selectedId: string;
  onSelect: (id: string) => void;
};

type YandexPlacemark = {
  events: {
    add: (eventName: "click", callback: () => void) => void;
  };
};

type YandexMapInstance = {
  geoObjects: {
    add: (placemark: YandexPlacemark) => void;
    remove: (placemark: YandexPlacemark) => void;
  };
  setCenter: (center: [number, number], zoom?: number) => void;
};

type YandexMapsApi = {
  ready: (callback: () => void) => void;
  Map: new (
    element: HTMLElement,
    options: {
      center: [number, number];
      zoom: number;
      controls: string[];
    }
  ) => YandexMapInstance;
  Placemark: new (
    coordinates: [number, number],
    properties: {
      balloonContent: string;
      hintContent: string;
    },
    options: {
      preset: string;
    }
  ) => YandexPlacemark;
};

declare global {
  interface Window {
    ymaps?: YandexMapsApi;
  }
}

let yandexMapsPromise: Promise<void> | null = null;

function loadYandexMaps() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.ymaps) {
    return Promise.resolve();
  }

  if (yandexMapsPromise) {
    return yandexMapsPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(new Error("Yandex Maps API key is missing"));
  }

  yandexMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const suggestApiKey = process.env.NEXT_PUBLIC_YANDEX_SUGGEST_API_KEY;

    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU${
    suggestApiKey ? `&suggest_apikey=${suggestApiKey}` : ""
    }`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Yandex Maps"));

    document.head.appendChild(script);
  });

  return yandexMapsPromise;
}

export function PickupPointMap({ points, selectedId, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<YandexMapInstance | null>(null);
  const placemarksRef = useRef<YandexPlacemark[]>([]);

  useEffect(() => {
    let disposed = false;

    async function init() {
      const validPoints = points.filter(
        (point): point is DeliveryOption & {
          latitude: number;
          longitude: number;
        } => point.latitude != null && point.longitude != null
      );

      if (!mapRef.current || validPoints.length === 0) {
        return;
      }

      await loadYandexMaps();

      if (disposed || !window.ymaps || !mapRef.current) {
        return;
      }

      window.ymaps.ready(() => {
        if (disposed || !window.ymaps || !mapRef.current) {
          return;
        }

        const first = validPoints[0];

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
            center: [first.latitude, first.longitude],
            zoom: 12,
            controls: ["zoomControl"],
          });
        }

        const map = mapInstanceRef.current;

        placemarksRef.current.forEach((placemark) => {
          map.geoObjects.remove(placemark);
        });

        placemarksRef.current = validPoints.map((point) => {
          const placemark = new window.ymaps!.Placemark(
            [point.latitude, point.longitude],
            {
              balloonContent: point.label,
              hintContent: point.label,
            },
            {
              preset:
                point.id === selectedId
                  ? "islands#blackDotIcon"
                  : "islands#grayDotIcon",
            }
          );

          placemark.events.add("click", () => {
            onSelect(point.id);
          });

          map.geoObjects.add(placemark);

          return placemark;
        });

        const selected =
          validPoints.find((point) => point.id === selectedId) ?? first;

        map.setCenter([selected.latitude, selected.longitude], 13);
      });
    }

    void init();

    return () => {
      disposed = true;
    };
  }, [points, selectedId, onSelect]);

  const hasCoordinates = points.some(
    (point) => point.latitude != null && point.longitude != null
  );

  if (!hasCoordinates) {
    return <div>Карта появится после загрузки ПВЗ с координатами</div>;
  }

  if (!process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY) {
    return <div>Добавь NEXT_PUBLIC_YANDEX_MAPS_API_KEY для отображения карты</div>;
  }

  return <div style={{ width: "100%", height: 420 }} ref={mapRef} />;
}