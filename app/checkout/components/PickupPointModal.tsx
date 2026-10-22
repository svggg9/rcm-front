"use client";

import { useState, type ReactNode } from "react";
import type { DeliveryOption } from "../types";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { CdekLogo } from "../../components/Delivery/CdekLogo";
import { SectionLoader } from "../../components/ui/SectionLoader";
import { PickupPointMap } from "./PickupPointMap";
import styles from "./PickupPointModal.module.css";

type Props = {
  open: boolean; loading: boolean; points: DeliveryOption[]; selectedId: string;
  deliveryPrice: number; cityField?: ReactNode; cityKey?: number; error?: string | null;
  onClose: () => void; onSelect: (id: string) => void; onConfirm: () => void; onRetry?: () => void;
};

function PickupPointPicker({ loading, points, selectedId, cityField, cityKey, error, onClose, onSelect, onConfirm, onRetry }: Omit<Props, "open">) {
  const [candidate, setCandidate] = useState({ cityKey, id: selectedId });
  const candidateId = candidate.cityKey === cityKey ? candidate.id : "";
  const setCandidateId = (id: string) => setCandidate({ cityKey, id });
  const selected = points.find(point => point.id === candidateId) ?? null;
  return <Dialog title="Выбрать пункт выдачи" actions={null} size="wide" mobileFullscreen onClose={onClose}>
    <div className={styles.picker}>
      {cityField}
      {error && <div role="alert" className={styles.error}>{error}{onRetry && <button type="button" onClick={onRetry} className={styles.textButton}>Повторить</button>}</div>}
      {loading ? <div className={`${styles.map} ${styles.loading}`}>
        <SectionLoader label="Загрузка пунктов выдачи" />
      </div> : !cityKey ? <p className={styles.muted}>Выберите город из списка</p> : <>
        {points.length > 0 && <div className={styles.map}><PickupPointMap points={points} selectedId={selected?.id ?? ""} onSelect={setCandidateId} /></div>}
        {selected ? <div className={styles.details}>
          <span className={styles.provider}><CdekLogo /></span><p>{selected.label}</p>
          {selected.hint && <div className={styles.instructions}><span>Как найти</span><p>{selected.hint}</p></div>}
          <Button type="button" variant="primary" className={styles.primary} onClick={() => { onSelect(selected.id); onConfirm(); }}>Выбрать этот пункт выдачи</Button>
          <Button type="button" variant="secondary" className={styles.primary} onClick={() => setCandidateId("")}>Выбрать другой пункт</Button>
        </div> : <div className={styles.list}>
          {!points.length && !error && <p className={styles.muted}>В этом городе нет доступных пунктов выдачи</p>}
          {points.map(point => <button type="button" key={point.id} className={styles.item} onClick={() => setCandidateId(point.id)}>
            <span><span className={styles.provider}><CdekLogo /></span><span>{point.label}</span></span><Icon name="chevron-right" size={20} strokeWidth={1} />
          </button>)}
        </div>}
      </>}
    </div>
  </Dialog>;
}

export function PickupPointModal(props: Props) {
  return props.open ? <PickupPointPicker {...props} /> : null;
}
