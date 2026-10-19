"use client";
import Image from "next/image";
import {useEffect,useRef,useState} from "react";
import {Button} from "../../components/ui/Button";
import {EmptyState} from "../../components/ui/EmptyState";
import {AccountSkeleton} from "./AccountSkeleton";
import {ListLoadMore} from "../../components/ui/ListLoadMore";
import {EditorSurface} from "../../components/ui/EditorSurface";
import {Price} from "../../components/ui/Price";
import {apiFetch,API_URL} from "../../lib/api";
import {getAccountReturns,returnReasonLabels,returnStatusLabels,type AccountReturnListItem} from "../../lib/returns";
import {accountApiError,orderDate} from "../lib/presentation";
import {AccountOrdersTab} from "./AccountOrdersTab";
import type {OrderListItem,PageResponse} from "../types";
import styles from "./AccountReturnsTab.module.css";
export function AccountReturnsTab({onOpenOrders,onOpenOrder}:{onOpenOrders:()=>void;onOpenOrder?:(id:number)=>void}){
  const [items,setItems]=useState<AccountReturnListItem[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
  const [nextPage,setNextPage]=useState(1),[total,setTotal]=useState(0),[loadingMore,setLoadingMore]=useState(false);
  const [choosing,setChoosing]=useState(false),[purchases,setPurchases]=useState<OrderListItem[]|null>(null),[purchaseTotal,setPurchaseTotal]=useState(0),[purchasePage,setPurchasePage]=useState(0),[purchaseLoading,setPurchaseLoading]=useState(false),[purchaseError,setPurchaseError]=useState(false);
  const busy=useRef(false),purchaseBusy=useRef(false);
  const [documents,setDocuments]=useState<Record<number,boolean>>({}),[downloading,setDownloading]=useState<number|null>(null);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError(null);
    void getAccountReturns({signal:controller.signal}).then(result=>{setItems(result.items);setNextPage(result.page+1);setTotal(result.totalItems);}).catch(()=>{if(!controller.signal.aborted)setError("Не удалось загрузить возвраты");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[retry]);
  async function loadMore(){
    if(busy.current)return;busy.current=true;setLoadingMore(true);
    try{const result=await getAccountReturns({page:nextPage});setItems(current=>[...current,...result.items.filter(item=>!current.some(r=>r.id===item.id))]);setNextPage(result.page+1);setTotal(result.totalItems);}
    catch{setError("Не удалось загрузить возвраты");}finally{busy.current=false;setLoadingMore(false);}
  }
  async function choose(more=false){
    setChoosing(true);if(purchaseBusy.current)return;purchaseBusy.current=true;setPurchaseLoading(true);setPurchaseError(false);
    try{const response=await apiFetch(`${API_URL}/api/orders/my/list?paymentStatus=PAID&deliveryStatus=DELIVERED&page=${more?purchasePage:0}&size=20`);if(!response.ok)throw new Error();const page=await response.json() as PageResponse<OrderListItem>;
      setPurchases(current=>more?[...(current??[]),...page.content]:page.content);setPurchaseTotal(page.totalElements);setPurchasePage(page.number+1);
    }catch{setPurchaseError(true);}finally{purchaseBusy.current=false;setPurchaseLoading(false);}
  }
  async function download(id:number,type:"waybill"|"barcode"){
    if(downloading!==null)return;setDownloading(id);setError(null);
    try{
      if(!documents[id]){const ready=await apiFetch(`${API_URL}/api/returns/${id}/documents`);if(!ready.ok)throw new Error(await accountApiError(ready,"Документы пока недоступны"));setDocuments(current=>({...current,[id]:true}));}
      const response=await apiFetch(`${API_URL}/api/returns/${id}/documents/${type}`);
      if(!response.ok)throw new Error("Не удалось скачать документ");
      const url=URL.createObjectURL(await response.blob()),link=document.createElement("a");link.href=url;link.download=`return-${id}-${type}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    }catch(failure){setError(failure instanceof Error?failure.message:"Не удалось скачать документ");}finally{setDownloading(null);}
  }
  const eligible=(purchases??[]).filter(order=>order.returnAvailableUntil===undefined||Boolean(order.returnAvailableUntil&&new Date(order.returnAvailableUntil).getTime()>Date.now()));
  return <section className={styles.page}>
    {error?<div className={styles.error} role="alert">{error}<Button variant="ghost" onClick={()=>setRetry(value=>value+1)}>Повторить</Button></div>:null}
    {loading?<AccountSkeleton variant="returns"/>:!items.length&&!error?<EmptyState title="Возвратов пока нет" text="Выберите покупку, чтобы оформить возврат" actions={<Button variant="primary" onClick={()=>void choose()}>Выбрать покупку</Button>}/>:null}
    {items.length?<><div className={styles.list}>{items.map(request=><article className={styles.card} key={request.id}>
      <div className={styles.top}><span>Возврат № {request.id}</span><time dateTime={request.createdAt}>{orderDate(request.createdAt)}</time></div><span className={styles.status}>{returnStatusLabels[request.status]}</span>
      <div className={styles.product}>{request.imageUrl?<Image src={request.imageUrl} alt={request.productTitle} width={80} height={120}/>:null}<div><h2>{request.productTitle}</h2><p>{request.quantity} ед.{request.requestedAmount!==null?<> | <Price amount={request.requestedAmount}/></>:null}</p><p>{returnReasonLabels[request.reason]}</p></div></div>
      <button className={styles.orderLink} onClick={()=>onOpenOrder?onOpenOrder(request.orderId):onOpenOrders()}>Заказ № {request.orderId} ↗</button>
      {request.adminComment?<p className={styles.comment}>{request.adminComment}</p>:null}
      {request.approvedRefundAmount!==null?<p className={styles.comment}>Подтверждённая сумма: <Price amount={request.approvedRefundAmount}/></p>:null}
      {request.trackingUrl?<a className={styles.orderLink} href={request.trackingUrl} target="_blank" rel="noreferrer">Отследить возврат ↗</a>:null}
      {["WAITING_FOR_ITEM","IN_TRANSIT"].includes(request.status)?<div className={styles.documents}><Button variant="ghost" loading={downloading===request.id} onClick={()=>void download(request.id,"waybill")}>Накладная</Button><Button variant="ghost" disabled={downloading!==null} onClick={()=>void download(request.id,"barcode")}>Штрихкод</Button></div>:null}
    </article>)}</div><ListLoadMore loaded={items.length} total={total} loading={loadingMore} onLoadMore={loadMore}/><Button variant="secondary" onClick={()=>void choose()}>Оформить ещё возврат</Button></>:null}
    {choosing?<EditorSurface title="Выберите покупку" onClose={()=>setChoosing(false)}>
      {purchaseError?<div className={styles.error}>Не удалось загрузить покупки<Button variant="ghost" onClick={()=>void choose()}>Повторить</Button></div>:null}
      {purchaseLoading&&!purchases?<AccountSkeleton variant="orders"/>:eligible.length?<AccountOrdersTab orders={eligible} totalElements={eligible.length} buildOrderStatusLabel={()=>"Получен"} onOpenOrder={id=>{setChoosing(false);onOpenOrder?.(id);}}/>:!purchaseLoading&&!purchaseError?<EmptyState title="Нет доступных покупок" text="Здесь появятся полученные покупки, для которых доступна подача возврата" actions={<Button variant="primary" onClick={()=>{setChoosing(false);onOpenOrders();}}>Посмотреть заказы</Button>}/>:null}
      {purchases&&purchases.length<purchaseTotal?<Button variant="secondary" loading={purchaseLoading} onClick={()=>void choose(true)}>Показать ещё покупки</Button>:null}
    </EditorSurface>:null}
  </section>;
}
