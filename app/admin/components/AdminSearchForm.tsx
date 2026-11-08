"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { AdminSellerPicker } from "./AdminSellerPicker";
import styles from "./AdminWorkspace.module.css";

export function AdminSearchForm({ label, placeholder = label, withSeller = false }: { label: string; placeholder?: string; withSeller?: boolean }) {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const seller = withSeller ? params.get("seller") ?? "" : "";
  return <Search key={`${query}:${seller}`} query={query} seller={seller} withSeller={withSeller} label={label} placeholder={placeholder} />;
}

function Search({ query, seller, withSeller, label, placeholder }: { query: string; seller: string; withSeller: boolean; label: string; placeholder: string }) {
  const params = useSearchParams();
  const [draft, setDraft] = useState(query);
  const [sellerDraft, setSellerDraft] = useState(seller);
  function apply(value: string, owner: string) {
    const next = new URLSearchParams(params);
    if (value.trim()) next.set("q", value.trim()); else next.delete("q");
    if (withSeller) {
      if (owner) next.set("seller", owner); else next.delete("seller");
    }
    next.delete("page"); next.delete("chatPage"); next.delete("productId"); next.delete("orderId");
    window.history.pushState(null, "", `/admin?${next}`);
  }
  return <form className={styles.search} role="search" aria-label={label} onSubmit={event => { event.preventDefault(); apply(draft, sellerDraft); }}>
    <TextInput type="search" label={label} hideLabel placeholder={placeholder} maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} />
    {withSeller && <div className={styles.sellerFilter}><AdminSellerPicker value={sellerDraft} onChange={setSellerDraft} /></div>}
    <Button variant="secondary" type="submit">Найти</Button>
    {(query || seller) && <Button variant="ghost" onClick={() => { setDraft(""); setSellerDraft(""); apply("", ""); }}>Сбросить</Button>}
  </form>;
}
