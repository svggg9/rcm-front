"use client";
import {useState} from "react";
import Image from "next/image";
import {Price} from "../../../../../components/ui/Price";
import {ProductDescriptionText} from "../../../../../product/[id]/components/ProductDescriptionText";
import type {ProductVariant,ProductImageItem} from "../types";
import styles from "../ProductEditPage.module.css";
export function ProductDraftPreview({title,brand,description,composition,variants,images}:{title:string;brand:string;description:string;composition:string;variants:ProductVariant[];images:ProductImageItem[]}){
 const [selected,setSelected]=useState(0);const [photo,setPhoto]=useState(0);const variant=variants[selected] ?? variants[0];
 const visibleImages=images.filter(i=>!variant?.colorwayId || i.colorwayId === variant.colorwayId || !i.colorwayId);
 const image=visibleImages[photo] ?? visibleImages[0];
 return <div className={styles.draftPreview}>
 <p>Предпросмотр текущих изменений. Сохранение не требуется.</p>
 {image && <div className={styles.draftPreviewImage}><Image src={image.url} alt={title} fill sizes="600px" style={{objectFit:"contain"}} /></div>}
 {visibleImages.length > 1 && <div className={styles.descriptionEditorToolbar}>{visibleImages.map((_,i)=><button type="button" key={i} aria-pressed={photo === i} onClick={()=>setPhoto(i)}>Фото {i+1}</button>)}</div>}
 <span>{brand}</span><h2>{title || "Название товара"}</h2>
 {variant && Number.isFinite(variant.price) && <Price amount={variant.price} />}
 <div className={styles.descriptionEditorToolbar}>{variants.map((v,i)=><button type="button" key={v.id ?? v.clientKey ?? i} aria-pressed={selected === i} onClick={()=>{setSelected(i);setPhoto(0);}}>{[v.color,v.size].filter(Boolean).join(" / ") || "Без размера"}{v.availableQuantity === 0 ? " — нет в наличии" : ""}</button>)}</div>
 <h3>Описание</h3><ProductDescriptionText text={description} fallback="Описание не заполнено" />
 {composition && <><h3>Состав</h3><ProductDescriptionText text={composition} fallback="" /></>}
 </div>;
}
