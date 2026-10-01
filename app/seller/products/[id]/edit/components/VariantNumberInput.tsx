"use client";
import { useState, type InputHTMLAttributes } from "react";
export function parseVariantNumber(raw: string, integer = false): number | null {
 const text=raw.replace(/[\s\u00a0]/g, "").replace(",", ".");
 if (!text) return null;
 if (!(integer ? /^\d+$/ : /^\d+(?:\.\d{0,2})?$/).test(text)) return NaN;
 const n=Number(text); return Number.isSafeInteger(n) || (!integer && Number.isFinite(n) && n <= Number.MAX_SAFE_INTEGER / 100) ? n : NaN;
}
export function VariantNumberInput({value, integer=false, onValue, ...props}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {value:number | null; integer?:boolean; onValue:(n:number | null)=>void}) {
 const format=(n:number | null)=>n === null || (!integer && n === 0) ? "" : Number.isNaN(n) ? "" : String(n).replace(".",",");
 const [text,setText]=useState(format(value)); const [previous,setPrevious]=useState(value);
 if(!Object.is(previous,value)){setPrevious(value);setText(format(value));}
 const invalid=Number.isNaN(value);
 return <input {...props} type="text" inputMode={integer ? "numeric" : "decimal"} value={text} aria-invalid={invalid || props["aria-invalid"]}
 onChange={e=>{const next=parseVariantNumber(e.target.value,integer);setText(e.target.value);setPrevious(next);onValue(next);}}
 onBlur={()=>{if(!invalid)setText(format(value));}} />;
}
