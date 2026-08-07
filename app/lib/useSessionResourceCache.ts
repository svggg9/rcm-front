"use client";

import { useCallback, useEffect, useRef } from "react";

type LoadOptions = {
  force?: boolean;
};

export function useSessionResourceCache<Key, Value>(
  loader: (key: Key) => Promise<Value>
) {
  const loaderRef = useRef(loader);
  const cacheRef = useRef(new Map<Key, Value>());
  const pendingRef = useRef(new Map<Key, Promise<Value>>());
  const generationRef = useRef(new Map<Key, number>());

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const get = useCallback(async (key: Key, options?: LoadOptions) => {
    if (!options?.force) {
      const cached = cacheRef.current.get(key);
      if (cached !== undefined) return cached;

      const pending = pendingRef.current.get(key);
      if (pending) return pending;
    }

    const generation = (generationRef.current.get(key) ?? 0) + 1;
    generationRef.current.set(key, generation);

    const request = loaderRef.current(key)
      .then((value) => {
        if (generationRef.current.get(key) === generation) {
          cacheRef.current.set(key, value);
        }
        return value;
      })
      .finally(() => {
        if (pendingRef.current.get(key) === request) {
          pendingRef.current.delete(key);
        }
      });

    pendingRef.current.set(key, request);
    return request;
  }, []);

  const peek = useCallback((key: Key) => cacheRef.current.get(key), []);

  const seed = useCallback((key: Key, value: Value) => {
    generationRef.current.set(key, (generationRef.current.get(key) ?? 0) + 1);
    pendingRef.current.delete(key);
    cacheRef.current.set(key, value);
  }, []);

  const prefetch = useCallback(
    (key: Key) => {
      void get(key).catch(() => undefined);
    },
    [get]
  );

  const invalidate = useCallback((key: Key) => {
    generationRef.current.set(key, (generationRef.current.get(key) ?? 0) + 1);
    pendingRef.current.delete(key);
    cacheRef.current.delete(key);
  }, []);

  return { get, peek, seed, prefetch, invalidate };
}
