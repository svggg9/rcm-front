"use client";
import {useEffect,useRef,useState} from "react";
import {Button} from "../../components/ui/Button";
import {EditorSurface,requestEditorNavigation} from "../../components/ui/EditorSurface";
import {FormSelect} from "../../components/ui/FormSelect";
import {Price} from "../../components/ui/Price";
import {toast} from "../../components/ui/toast";
import {createOrderReturn,ReturnSubmitError,returnReasonLabels,returnStatusLabels,type ReturnReason,type ReturnRequest} from "../../lib/returns";
import {AccountProductRow} from "./AccountProductRow";
import type {Order,OrderItem} from "../types";
import styles from "./AccountReturnRequest.module.css";
const reasons:ReturnReason[]=["DOES_NOT_FIT","BUYER_CHANGED_MIND","DEFECT","WRONG_ITEM","DAMAGED_DELIVERY","OTHER"];
type Draft={quantity:number;reason:ReturnReason|"";comment:string;photos:File[];requestKey:string};
const keyOf=(item:OrderItem)=>`${item.productId}:${item.variantId}`;
function Photo({file,onRemove}:{file:File;onRemove:()=>void}){
  const image=useRef<HTMLImageElement>(null);
  useEffect(()=>{const next=URL.createObjectURL(file);if(image.current)image.current.src=next;return()=>URL.revokeObjectURL(next);},[file]);
  return <div className={styles.photo}>
    {/* eslint-disable-next-line @next/next/no-img-element -- Local file preview with a revoked object URL. */}
    <img ref={image} alt={file.name}/><button onClick={onRemove} aria-label={`Удалить ${file.name}`}>×</button>
  </div>;
}
export function AccountReturnRequest({order,existingReturns,onCreated}:{order:Order;existingReturns:ReturnRequest[];onCreated:(request:ReturnRequest)=>void}){
  const [open,setOpen]=useState(false),[drafts,setDrafts]=useState<Record<string,Draft>>({}),[editing,setEditing]=useState<string|null>(null);
  const [review,setReview]=useState(false),[submitting,setSubmitting]=useState(false),[error,setError]=useState<string|null>(null);
  const [uncertain,setUncertain]=useState(false);
  const busy=useRef(false);
  function available(item:OrderItem){return Math.max(0,item.quantity-existingReturns.filter(r=>r.productId===item.productId&&r.variantId===item.variantId&&r.status!=="REJECTED"&&(!r.requestKey||r.requestKey!==drafts[keyOf(item)]?.requestKey)).reduce((sum,r)=>sum+r.quantity,0));}
  const items=order.items.filter(item=>available(item)>0);
  const selected=items.filter(item=>drafts[keyOf(item)]);
  const total=selected.reduce((sum,item)=>sum+item.price*drafts[keyOf(item)].quantity,0);
  function update(key:string,patch:Partial<Draft>){setError(null);setDrafts(current=>({...current,[key]:{...current[key],...patch,requestKey:crypto.randomUUID()}}));}
  function toggle(item:OrderItem){
    const key=keyOf(item);
    setReview(false);setError(null);
    setDrafts(current=>{const next={...current};if(next[key])delete next[key];else next[key]={quantity:1,reason:"",comment:"",photos:[],requestKey:crypto.randomUUID()};return next;});
  }
  function proceed(){
    const missing=selected.find(item=>!drafts[keyOf(item)].reason||!drafts[keyOf(item)].photos.length);
    if(missing){setEditing(keyOf(missing));return;}
    setReview(true);
  }
  async function submit(){
    if(busy.current||!selected.length)return;
    busy.current=true;setSubmitting(true);setError(null);
    try{
      for(const item of selected){
        const key=keyOf(item),draft=drafts[key];
        const result=await createOrderReturn({orderId:order.id,productId:item.productId,variantId:item.variantId,quantity:draft.quantity,reason:draft.reason as ReturnReason,comment:draft.comment,photos:draft.photos,requestKey:draft.requestKey});
        onCreated(result);
        setDrafts(current=>{const next={...current};delete next[key];return next;});
      }
      setUncertain(false);setReview(false);requestEditorNavigation(()=>setOpen(false),{completed:true});toast.success("Заявки на возврат созданы");
    }catch(failure){setUncertain(failure instanceof ReturnSubmitError ? failure.resultUnknown : true);setError(failure instanceof Error?failure.message:"Не удалось отправить заявку");}
    finally{busy.current=false;setSubmitting(false);}
  }
  const activeItem=items.find(item=>keyOf(item)===editing);
  const active=editing?drafts[editing]:null;
  return <div className={styles.wrapper}>
    {existingReturns.map(request=><div className={styles.existing} key={request.id}><span>Возврат № {request.id} · {request.productTitle}</span><span>{returnStatusLabels[request.status]}</span>{request.adminComment?<p>{request.adminComment}</p>:null}</div>)}
    {items.length?<Button variant="secondary" onClick={()=>setOpen(true)}>Оформить возврат</Button>:null}
    {open?<EditorSurface className={styles.returnSurface} title={review?"Проверка возврата":"Выбор товаров для возврата"} onClose={()=>{if(!uncertain){setDrafts({});setReview(false);}setOpen(false);}} dirty={selected.length>0&&!uncertain} busy={submitting} guardNavigation
      actions={<><span className={styles.footerTotal}>{selected.reduce((sum,item)=>sum+drafts[keyOf(item)].quantity,0)} ед. <span>|</span> <Price amount={total}/></span>{review&&!uncertain?<Button variant="ghost" disabled={submitting} onClick={()=>setReview(false)}>Изменить</Button>:null}<Button variant="primary" loading={submitting} disabled={!selected.length} onClick={review?()=>void submit():proceed}>{review?(uncertain?"Повторить отправку":selected.length>1?"Отправить заявки":"Отправить заявку"):"Продолжить"}</Button></>}>
      {error?<p className={styles.error} role="alert">{error}</p>:null}
      {review?<p className={styles.hint}>Проверьте товары и причины возврата</p>:null}
      <div className={styles.items}>{(review?selected:items).map(item=>{
        const key=keyOf(item),draft=drafts[key];
        return <article className={styles.item} key={key}>
          <label className={styles.selection}><input type="checkbox" checked={Boolean(draft)} disabled={submitting||uncertain} onChange={()=>toggle(item)}/><span className="visuallyHidden">Вернуть {item.productTitle}</span></label>
          <AccountProductRow item={{...item,quantity:draft?.quantity??1,lineTotal:item.price*(draft?.quantity??1)}} linked={false}/>
          {draft?<div className={styles.itemControls}>
            {available(item)>1?<div className={styles.quantity}><FormSelect<number> label="Количество" value={draft.quantity} disabled={submitting||uncertain} options={Array.from({length:available(item)},(_,index)=>({value:index+1,label:String(index+1)}))} onChange={quantity=>{if(quantity!=="")update(key,{quantity});}}/></div>:null}
            <button className={styles.reasonButton} disabled={submitting||uncertain} onClick={()=>setEditing(key)}>{draft.reason?returnReasonLabels[draft.reason]:"Выбрать причину возврата"}<span>›</span></button>
            {draft.reason&&!draft.photos.length?<p className={styles.hint}>Добавьте фотографии товара</p>:null}
          </div>:null}
        </article>;
      })}</div>
      {review?<div className={styles.summary}><span>Стоимость выбранных товаров</span><Price amount={total}/><p>Сумма возврата будет подтверждена после рассмотрения заявки</p></div>:null}
      {active&&editing&&activeItem?<EditorSurface title="Причина возврата" className={styles.reasonPanel} onClose={()=>setEditing(null)} actions={<Button variant="primary" disabled={!active.reason||!active.photos.length} onClick={()=>setEditing(null)}>Готово</Button>}>
        <fieldset className={styles.reasons}><legend className="visuallyHidden">Выберите причину для {activeItem.productTitle}</legend>{reasons.map(reason=><label key={reason}><input type="radio" name="return-reason" checked={active.reason===reason} onChange={()=>update(editing,{reason})}/><span>{returnReasonLabels[reason]}</span></label>)}</fieldset>
        <label className={styles.comment}>Комментарий<textarea maxLength={1000} value={active.comment} onChange={event=>update(editing,{comment:event.target.value})}/></label>
        <label className={styles.upload}>Фотографии товара<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>{
          const next=Array.from(event.target.files??[]);event.target.value="";
          if(next.some(file=>!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024)||active.photos.length+next.length>5){setError("До 5 фотографий JPG, PNG или WebP, каждая до 10 МБ");return;}
          update(editing,{photos:[...active.photos,...next]});
        }}/><span>От 1 до 5 файлов · JPG, PNG или WebP · до 10 МБ каждый</span></label>
        <div className={styles.photos}>{active.photos.map((file,index)=><Photo key={index} file={file} onRemove={()=>update(editing,{photos:active.photos.filter((_,i)=>i!==index)})}/>)}</div>
        {error?<p className={styles.error} role="alert">{error}</p>:null}
      </EditorSurface>:null}
    </EditorSurface>:null}
  </div>;
}
