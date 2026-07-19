"use client";

import { useEffect, useRef, useState } from "react";

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
      preset?: string;
      iconLayout?: string;
      iconImageHref?: string;
      iconImageSize?: [number, number];
      iconImageOffset?: [number, number];
    }
  ) => YandexPlacemark;
};

declare global {
  interface Window {
    ymaps?: YandexMapsApi;
  }
}

function buildMarkerIcon(selected: boolean) {
  const fill = selected ? "#c7a35a" : "#111111";
  const stroke = selected ? "#111111" : "#ffffff";
  const inner = selected ? "#111111" : "#ffffff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44" fill="none">
    <path d="M17 42C17 42 31 27.9 31 15.9C31 7.7 24.7 2 17 2C9.3 2 3 7.7 3 15.9C3 27.9 17 42 17 42Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <circle cx="17" cy="16" r="5" fill="${inner}"/>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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
  const centeredPointsKeyRef = useRef("");
  const onSelectRef = useRef(onSelect);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let disposed = false;

    async function init() {
      setIsLoading(true);

      const validPoints = points.filter(
        (point): point is DeliveryOption & {
          latitude: number;
          longitude: number;
        } => point.latitude != null && point.longitude != null
      );

      if (validPoints.length === 0) {
        placemarksRef.current.forEach((placemark) => {
          mapInstanceRef.current?.geoObjects.remove(placemark);
        });
        placemarksRef.current = [];
        centeredPointsKeyRef.current = "";
        setIsLoading(false);
        return;
      }

      if (!mapRef.current) {
        setIsLoading(false);
        return;
      }

      try {
        await loadYandexMaps();
      } catch {
        setIsLoading(false);
        return;
      }

      if (disposed || !window.ymaps || !mapRef.current) {
        return;
      }

      window.ymaps.ready(() => {
        if (disposed || !window.ymaps || !mapRef.current) {
          return;
        }

        const first = validPoints[0];
        const pointsKey = validPoints
          .map((point) => `${point.id}:${point.latitude}:${point.longitude}`)
          .join("|");
        const shouldCenter = centeredPointsKeyRef.current !== pointsKey;

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
              iconLayout: "default#image",
              iconImageHref: buildMarkerIcon(point.id === selectedId),
              iconImageSize: point.id === selectedId ? [34, 44] : [28, 36],
              iconImageOffset: point.id === selectedId ? [-17, -44] : [-14, -36],
            }
          );

          placemark.events.add("click", () => {
            onSelectRef.current(point.id);
          });

          map.geoObjects.add(placemark);

          return placemark;
        });

        if (shouldCenter) {
          map.setCenter([first.latitude, first.longitude], 12);
          centeredPointsKeyRef.current = pointsKey;
        }

        setIsLoading(false);
      });
    }

    void init();

    return () => {
      disposed = true;
    };
  }, [points, selectedId]);

  return (
    <div className="pickup-point-map">
      {isLoading ? (
        <div className="pickup-point-map__loader" aria-label="Загрузка карты">
          <span />
        </div>
      ) : null}
      <div className="pickup-point-map__canvas" ref={mapRef} />
    </div>
  );
}
