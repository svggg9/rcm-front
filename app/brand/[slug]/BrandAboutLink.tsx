"use client";
import { useEffect } from "react";
import styles from "./BrandPage.module.css";

export function BrandAboutLink() {
  useEffect(() => {
    const openFromHash = () => {
      const section = document.getElementById("brand-about");
      if (window.location.hash === "#brand-about" && section instanceof HTMLDetailsElement) section.open = true;
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);
  return <a className={styles.aboutLink} href="#brand-about" onClick={() => {
    const section = document.getElementById("brand-about");
    if (section instanceof HTMLDetailsElement) section.open = true;
  }}>О бренде</a>;
}
