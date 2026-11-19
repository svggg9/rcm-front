import styles from "./DeliveryProgress.module.css";

const stages = [
  { status: "PENDING", label: "Создан" },
  { status: "READY_FOR_SHIPMENT", label: "Готовится к отправке" },
  { status: "IN_TRANSIT", label: "В пути" },
  { status: "READY_FOR_PICKUP", label: "Можно получить" },
  { status: "DELIVERED", label: "Получен" },
] as const;

/** Unknown, canceled or returned deliveries must not imply that a stage was reached. */
export function DeliveryProgress({ status }: { status: string }) {
  const current = stages.findIndex(stage => stage.status === status);
  if (current < 0) return null;

  return <ol className={styles.progress} aria-label="Этапы доставки">
    {stages.map((stage, index) => {
      const state = index < current ? "complete" : index === current ? "current" : "future";
      return <li key={stage.status} className={styles.stage} data-state={state}
        aria-current={state === "current" ? "step" : undefined}>
        <span>{state === "complete" && <><span aria-hidden="true">✓ </span><span className="visuallyHidden">Завершён: </span></>}
          {state === "future" && <span className="visuallyHidden">Ожидается: </span>}{stage.label}</span>
        {state === "current" && <span className={styles.currentLabel}>Текущий этап</span>}
      </li>;
    })}
  </ol>;
}
