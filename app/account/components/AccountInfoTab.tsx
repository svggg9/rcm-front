import Link from "next/link";
import styles from "./AccountInfoTab.module.css";
const links=[{title:"Помощь и контакты",href:"/contacts"},{title:"О проекте",href:"/about"},{title:"Политика конфиденциальности",href:"/legal/privacy"},{title:"Пользовательское соглашение",href:"/legal/terms"},{title:"Условия покупки",href:"/legal/offer"}];
export function AccountInfoTab(){
  return <section className={styles.page}><nav className={styles.linksGrid} aria-label="Помощь">{links.map(item=><Link className={styles.infoLink} key={item.href} href={item.href}><span>{item.title}</span><span aria-hidden="true">↗</span></Link>)}</nav></section>;
}