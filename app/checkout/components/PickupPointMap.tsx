"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "../../components/ui/Button";
import type { DeliveryOption } from "../types";
import styles from "./PickupPointMap.module.css";

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
  setCenter: (center: [number, number], zoom?: number) => PromiseLike<void> | void;
  setBounds: (
    bounds: [[number, number], [number, number]],
    options?: { zoomMargin?: number | number[]; duration?: number }
  ) => PromiseLike<void> | void;
  destroy: () => void;
};

type YandexMapsApi = {
  ready: (callback: () => void, errorCallback?: (error: unknown) => void) => void;
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

const SCRIPT_LOAD_TIMEOUT_MS = 15_000;
const API_READY_TIMEOUT_MS = 10_000;
let yandexMapsPromise: Promise<YandexMapsApi> | null = null;

class MapLoadError extends Error {}

function hasValidCoordinates(point: DeliveryOption): point is DeliveryOption & { latitude: number; longitude: number } {
  return typeof point.latitude === "number" && Number.isFinite(point.latitude)
    && point.latitude >= -90 && point.latitude <= 90
    && typeof point.longitude === "number" && Number.isFinite(point.longitude)
    && point.longitude >= -180 && point.longitude <= 180;
}

function escapeMapText(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function loadYandexMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new MapLoadError("Карта недоступна. Выберите пункт в списке."));
  }

  if (yandexMapsPromise) {
    return yandexMapsPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY?.trim();

  if (!window.ymaps && !apiKey) {
    return Promise.reject(new MapLoadError("Карта не настроена. Выберите пункт в списке."));
  }

  const request = new Promise<YandexMapsApi>((resolve, reject) => {
    let script: HTMLScriptElement | null = null;
    let readyTimer: number | undefined;
    let loadedApi: YandexMapsApi | undefined;
    let settled = false;

    function finish(error?: MapLoadError) {
      if (settled) return;
      settled = true;
      window.clearTimeout(loadTimer);
      window.clearTimeout(readyTimer);
      if (script) {
        script.onload = null;
        script.onerror = null;
        if (error) {
          script.remove();
          // Only reset the namespace created by this unsuccessful load.
          if (loadedApi && window.ymaps === loadedApi) delete window.ymaps;
        }
      }
      if (error) reject(error);
      else if (loadedApi) resolve(loadedApi);
    }

    function waitForReady() {
      if (settled) return;
      window.clearTimeout(loadTimer);
      loadedApi = window.ymaps;
      if (!loadedApi) {
        finish(new MapLoadError("Не удалось загрузить карту. Выберите пункт в списке."));
        return;
      }
      readyTimer = window.setTimeout(() => {
        finish(new MapLoadError("Карта не ответила вовремя. Попробуйте ещё раз или выберите пункт в списке."));
      }, API_READY_TIMEOUT_MS);
      try {
        loadedApi.ready(
          () => finish(),
          () => finish(new MapLoadError("Не удалось запустить карту. Попробуйте ещё раз или выберите пункт в списке."))
        );
      } catch {
        finish(new MapLoadError("Не удалось запустить карту. Выберите пункт в списке."));
      }
    }

    const loadTimer = window.setTimeout(() => {
      finish(new MapLoadError("Загрузка карты заняла слишком много времени. Попробуйте ещё раз или выберите пункт в списке."));
    }, SCRIPT_LOAD_TIMEOUT_MS);

    if (window.ymaps) {
      waitForReady();
      return;
    }

    script = document.createElement("script");
    const suggestApiKey = process.env.NEXT_PUBLIC_YANDEX_SUGGEST_API_KEY?.trim();
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey!)}&lang=ru_RU${
      suggestApiKey ? `&suggest_apikey=${encodeURIComponent(suggestApiKey)}` : ""
    }`;
    script.async = true;
    script.onload = waitForReady;
    script.onerror = () => finish(new MapLoadError("Не удалось загрузить карту. Проверьте соединение и попробуйте ещё раз."));
    document.head.appendChild(script);
  });

  yandexMapsPromise = request;
  void request.catch(() => {
    if (yandexMapsPromise === request) yandexMapsPromise = null;
  });
  return request;
}

export function PickupPointMap({ points, selectedId, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<YandexMapInstance | null>(null);
  const placemarksRef = useRef<YandexPlacemark[]>([]);
  const centeredPointsKeyRef = useRef("");
  const centeredSelectedIdRef = useRef<string | null>(null);
  const clickedMarkerIdRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const [mapState, setMapState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => () => {
    mapInstanceRef.current?.destroy();
    mapInstanceRef.current = null;
    placemarksRef.current = [];
    centeredPointsKeyRef.current = "";
    centeredSelectedIdRef.current = null;
    clickedMarkerIdRef.current = null;
  }, []);

  useEffect(() => {
    let disposed = false;

    async function init() {
      setMapState("loading");
      setError(null);
      const validPoints = points.filter(hasValidCoordinates);

      if (validPoints.length === 0) {
        mapInstanceRef.current?.destroy();
        mapInstanceRef.current = null;
        placemarksRef.current = [];
        centeredPointsKeyRef.current = "";
        centeredSelectedIdRef.current = null;
        clickedMarkerIdRef.current = null;
        setMapState("empty");
        return;
      }

      try {
        const mapsApi = await loadYandexMaps();
        if (disposed || !mapRef.current) {
          return;
        }

        const first = validPoints[0];
        const pointsKey = validPoints
          .map((point) => `${point.id}:${point.latitude}:${point.longitude}`)
          .join("|");
        const shouldCenter = centeredPointsKeyRef.current !== pointsKey;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new mapsApi.Map(mapRef.current, {
            center: [first.latitude, first.longitude],
            zoom: 12,
            controls: ["zoomControl"],
          });
        }

        const map = mapInstanceRef.current;

        placemarksRef.current.forEach((placemark) => {
          map.geoObjects.remove(placemark);
        });

        placemarksRef.current = [];
        validPoints.forEach((point) => {
          const label = escapeMapText(point.label);
          const placemark = new mapsApi.Placemark(
            [point.latitude, point.longitude],
            {
              balloonContent: label,
              hintContent: label,
            },
            {
              iconLayout: "default#image",
              iconImageHref: buildMarkerIcon(point.id === selectedId),
              iconImageSize: point.id === selectedId ? [34, 44] : [28, 36],
              iconImageOffset: point.id === selectedId ? [-17, -44] : [-14, -36],
            }
          );

          placemark.events.add("click", () => {
            clickedMarkerIdRef.current = point.id !== centeredSelectedIdRef.current ? point.id : null;
            onSelectRef.current(point.id);
          });

          map.geoObjects.add(placemark);
          placemarksRef.current.push(placemark);
        });

        if (shouldCenter) {
          const bounds: [[number, number], [number, number]] = [
            [first.latitude, first.longitude], [first.latitude, first.longitude],
          ];
          validPoints.forEach(point => {
            bounds[0][0] = Math.min(bounds[0][0], point.latitude);
            bounds[0][1] = Math.min(bounds[0][1], point.longitude);
            bounds[1][0] = Math.max(bounds[1][0], point.latitude);
            bounds[1][1] = Math.max(bounds[1][1], point.longitude);
          });
          if (bounds[0][0] === bounds[1][0] && bounds[0][1] === bounds[1][1]) {
            await map.setCenter([first.latitude, first.longitude], 14);
          } else {
            await map.setBounds(bounds, { zoomMargin: [48, 32, 32, 32], duration: 0 });
          }
          if (disposed) return;
          centeredPointsKeyRef.current = pointsKey;
        } else if (selectedId && selectedId !== centeredSelectedIdRef.current && selectedId !== clickedMarkerIdRef.current) {
          const selectedPoint = validPoints.find(point => point.id === selectedId);
          if (selectedPoint) {
            await map.setCenter([selectedPoint.latitude, selectedPoint.longitude], 14);
            if (disposed) return;
          }
        }
        centeredSelectedIdRef.current = selectedId;
        clickedMarkerIdRef.current = null;

        setMapState("ready");
      } catch (reason) {
        if (disposed) return;
        mapInstanceRef.current?.destroy();
        mapInstanceRef.current = null;
        placemarksRef.current = [];
        centeredPointsKeyRef.current = "";
        centeredSelectedIdRef.current = null;
        clickedMarkerIdRef.current = null;
        setError(reason instanceof MapLoadError ? reason.message : "Не удалось показать карту. Попробуйте ещё раз или выберите пункт в списке.");
        setMapState("error");
      }
    }

    void init();

    return () => {
      disposed = true;
    };
  }, [points, selectedId, attempt]);

  return (
    <div className={`pickup-point-map ${styles.container}`} role="region" aria-label="Карта пунктов СДЭК" aria-busy={mapState === "loading"}>
      {mapState === "loading" ? (
        <div className={`pickup-point-map__loader ${styles.loader}`} role="status" aria-label="Загрузка карты">
          <span aria-hidden="true" />
        </div>
      ) : null}
      {mapState === "error" || mapState === "empty" ? (
        <div className={styles.message} role={mapState === "error" ? "alert" : "status"}>
          <p>{mapState === "error" ? error : points.length ? "У этих пунктов нет корректных координат. Выберите пункт в списке." : "Нет пунктов для отображения на карте."}</p>
          {mapState === "error" ? <Button type="button" variant="secondary" onClick={() => setAttempt(current => current + 1)}>Повторить</Button> : null}
        </div>
      ) : null}
      <div className={`pickup-point-map__canvas ${styles.canvas}`} ref={mapRef} inert={mapState !== "ready"} aria-hidden={mapState !== "ready" || undefined} />
    </div>
  );
}
