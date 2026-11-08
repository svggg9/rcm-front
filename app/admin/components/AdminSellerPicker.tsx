"use client";

import { useEffect, useState } from "react";
import { FormCombobox } from "../../components/ui/FormCombobox";
import { RequestError } from "../../components/ui/RequestError";
import { useAdminResource, type WorkspacePage } from "../lib/workspaceApi";

export type SellerRow = { id: number; username: string; name: string | null; email: string | null; phone: string | null; approved: boolean; verified?: boolean | null; brands?: string | null; products?: number; orders?: number };
export type SellerDetail = { seller: SellerRow; brands: {id:number;name:string;slug:string;isActive:boolean}[] };

export function AdminSellerPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [query,setQuery]=useState(""); const [search,setSearch]=useState("");
  useEffect(()=>{const timer=setTimeout(()=>setSearch(query.trim()),250);return ()=>clearTimeout(timer);},[query]);
  const list=useAdminResource<WorkspacePage<SellerRow>>(`sellers?q=${encodeURIComponent(search)}&size=30`);
  const selected=useAdminResource<SellerDetail>(/^[1-9]\d*$/.test(value)?`sellers/${value}`:null);
  const rows=list.data?.content??[];
  const current=selected.data?.seller;
  const options=rows.map(row=>({value:row.id,label:row.brands?`${row.brands} — ${row.name||row.username}`:row.name||row.username,searchTerms:[row.username,row.email||"",String(row.id)]}));
  if(current && !options.some(option=>option.value===current.id))options.unshift({value:current.id,label:current.name||current.username,searchTerms:[String(current.id)]});
  const error=list.error||selected.error;
  return <div><FormCombobox label="Продавец" value={value?Number(value):""} customValue={value?`Продавец №${value}`:""} options={options}
    placeholder="Имя или бренд" showPlaceholderOption={false} emptyOptionLabel="Все продавцы" allowCustomValue={false} showModerationBadge={false}
    loading={list.loading||query.trim()!==search} onQueryChange={setQuery} emptyText="Продавцы не найдены" onChange={id=>onChange(String(id))} />
    {error && <RequestError variant="inline" message={error} onRetry={()=>{list.refresh();selected.refresh();}} />}</div>;
}
