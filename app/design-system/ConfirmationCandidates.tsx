"use client";

import { useState } from "react";
import { Button } from "../components/ui/Button";
import { Dialog } from "../components/ui/Dialog";
import styles from "./ConfirmationCandidates.module.css";

type Candidate = "confirmation-compact-left" | "confirmation-compact-center";

/** Shared dialogs with local state: the example never changes the cart. */
export function ConfirmationCandidates() {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [result, setResult] = useState(false);
  function open(value: Candidate) { setResult(false); setCandidate(value); }
  return <section className={styles.section} aria-labelledby="confirmation-candidates-title">
    <h3 id="confirmation-candidates-title">Компактные варианты подтверждения</h3>
    <p className="textHint">Примеры используют условные данные и не меняют корзину</p>
    <div className={styles.controls}>
      <Button type="button" variant="secondary" onClick={() => open("confirmation-compact-left")}>Слева</Button>
      <Button type="button" variant="secondary" onClick={() => open("confirmation-compact-center")}>По центру</Button>
    </div>
    {result && <p role="status" className="textHint">Очистка показана только в примере</p>}
    {candidate && <Dialog title="Очистить корзину?" variant={candidate} onClose={() => setCandidate(null)}
      actions={<><Button type="button" variant="secondary" onClick={() => setCandidate(null)}>Отмена</Button>
        <Button type="button" variant="primary" onClick={() => { setCandidate(null); setResult(true); }}>Очистить</Button></>}>
      <p>Из корзины будет удалён 1 товар</p>
    </Dialog>}
  </section>;
}
