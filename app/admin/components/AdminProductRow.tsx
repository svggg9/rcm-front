"use client";

import styles from "../Admin.module.css";
import { approveProduct, blockProduct } from "../lib/adminApi";

export default function AdminProductRow({ product, onReload }: any) {
  const handleApprove = async () => {
    await approveProduct(product.id);
    onReload();
  };

  const handleBlock = async () => {
    await blockProduct(product.id);
    onReload();
  };

  return (
    <div className={styles.row}>
      <div>{product.id}</div>
      <div>{product.title}</div>
      <div>{product.status}</div>

      <div className={styles.actions}>
        <button onClick={handleApprove}>Approve</button>
        <button onClick={handleBlock}>Block</button>
      </div>
    </div>
  );
}