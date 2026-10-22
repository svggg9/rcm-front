"use client";

import { SectionLoader } from "../../components/ui/SectionLoader";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PickupPointMap } from "../../checkout/components/PickupPointMap";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { Dialog } from "../../components/ui/Dialog";
import { TextInput } from "../../components/ui/TextInput";
import { getCdekReceptionPoints, type CdekReceptionPoint } from "../lib/sellerLegalApi";
import styles from "./SellerReceptionPointPicker.module.css";

const MAP_POINT_LIMIT = 500;

type Props = {
  cityCode: number;
  cityName: string;
  currentId: string;
  onClose: () => void;
  onConfirm: (point: CdekReceptionPoint) => void;
};

export function SellerReceptionPointPicker({ cityCode, cityName, currentId, onClose, onConfirm }: Props) {
  const [points, setPoints] = useState<CdekReceptionPoint[]>([]);
  const [selectedId, setSelectedId] = useState(currentId);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await getCdekReceptionPoints(cityCode, undefined, MAP_POINT_LIMIT);
        if (active) setPoints(result);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Не удалось загрузить пункты приёма");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [cityCode, retry]);

  const visiblePoints = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("ru");
    return search ? points.filter(point => `${point.fullAddress ?? ""} ${point.name ?? ""} ${point.id}`.toLocaleLowerCase("ru").includes(search)) : points;
  }, [points, query]);
  const mapPoints = useMemo(() => visiblePoints.map(point => ({
    id: point.id, label: point.fullAddress || point.name || point.id,
    hint: point.instruction ?? undefined, latitude: point.latitude, longitude: point.longitude,
    cityCode: point.cityCode,
  })), [visiblePoints]);
  const selected = points.find(point => point.id === selectedId) ?? null;

  return createPortal(<Dialog title="Пункт приёма СДЭК" size="wide" onClose={onClose}
    actions={<><Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
      <Button type="button" variant="primary" disabled={loading || Boolean(error) || !selected}
        onClick={() => { if (selected) onConfirm(selected); }}>Выбрать пункт</Button></>}>
    <div className={styles.content}>
      <p className={styles.intro}>{cityName}. Выберите пункт, в который будете сдавать заказы.</p>
      {loading ? <div className={styles.loader}>
        <SectionLoader label="Загрузка пунктов приёма" />
      </div> : error ? <Banner tone="danger" actions={
        <Button type="button" variant="secondary" onClick={() => setRetry(value => value + 1)}>Повторить</Button>
      }>{error}</Banner> : points.length === 0 ? <p className={styles.empty}>В этом городе не найдены пункты, принимающие отправления. Выберите другой город.</p> : <>
        <div className={styles.layout}>
          <div className={styles.map} aria-label="Карта пунктов приёма">
            <PickupPointMap points={mapPoints} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className={styles.panel}>
            <TextInput label="Поиск по адресу или коду" fieldVariant="boxed" value={query} type="search"
              onChange={event => { setQuery(event.target.value); setSelectedId(""); }} />
            <div className={styles.list} role="group" aria-label="Пункты приёма СДЭК">
              {visiblePoints.length ? visiblePoints.map(point => <button type="button" key={point.id}
                className={`${styles.point} ${selectedId === point.id ? styles.selected : ""}`}
                aria-pressed={selectedId === point.id} onClick={() => setSelectedId(point.id)}>
                <strong>{point.fullAddress || point.name || point.id}</strong>
                <span>{point.name && point.fullAddress ? `${point.name} · ` : ""}{point.id}</span>
              </button>) : <p className={styles.empty}>По этому запросу ничего не найдено.</p>}
            </div>
          </div>
        </div>
        {selected ? <div className={styles.details} aria-live="polite">
          <strong>{selected.fullAddress || selected.name || selected.id}</strong>
          {selected.instruction ? <p>{selected.instruction}</p> : null}
        </div> : <p className={styles.hint}>Нажмите на метку на карте или выберите адрес в списке.</p>}
        {points.length >= MAP_POINT_LIMIT ? <Banner tone="warning">Показаны первые {MAP_POINT_LIMIT} пунктов города. Другие адреса можно найти в поле «Пункт приёма СДЭК».</Banner> : null}
      </>}
      <p className={styles.hint}>После выбора сохраните данные на странице.</p>
    </div>
  </Dialog>, document.body);
}
