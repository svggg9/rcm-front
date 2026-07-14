"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import styles from "./Header.module.css";
import { apiFetch, API_URL } from "../../lib/api";
import { useCartCount } from "../../lib/useCartCount";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useFavorites } from "../../lib/FavoritesContext";
import { useUserRole } from "../../lib/useUserRole";
import { useAuthModal } from "../AuthModal/useAuthModal";

type Category = {
  id: number;
  name: string;
};

const audienceItems = [
  { key: "all", label: "Для всех" },
  { key: "men", label: "Для него" },
  { key: "women", label: "Для нее" },
];

function isSellerRole(role: string | null) {
  return role === "SELLER" || role === "ROLE_SELLER";
}

function HeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const headerRef = useRef<HTMLElement | null>(null);

  const activeCategory = searchParams.get("category");
  const activeAudience = searchParams.get("audience") || "all";
  const activeSearch = searchParams.get("q") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAudience, setMenuAudience] = useState(activeAudience);

  const { user, isAuthenticated: isAuth } = useCurrentUser();
  const cartCount = useCartCount();
  const role = useUserRole();
  const { count: favoritesCount } = useFavorites();
  const { openAuth } = useAuthModal();


  useEffect(() => {
    if (!menuOpen) {
      setMenuAudience(activeAudience);
    }
  }, [activeAudience, menuOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);

      try {
        const response = await apiFetch(`${API_URL}/api/categories`);

        if (!response.ok) {
          throw new Error("Failed to load categories");
        }

        const data: unknown = await response.json();

        if (!cancelled) {
          setCategories(Array.isArray(data) ? (data as Category[]) : []);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const update = () => {
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${Math.ceil(node.getBoundingClientRect().height)}px`
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  function buildCatalogUrl(params: {
    category?: string | null;
    audience?: string | null;
    q?: string | null;
  }) {
    const qs = new URLSearchParams();

    const category =
      params.category === undefined ? activeCategory : params.category;
    const audience =
      params.audience === undefined ? activeAudience : params.audience;
    const q = params.q === undefined ? activeSearch : params.q;

    if (category) qs.set("category", category);
    if (audience && audience !== "all") qs.set("audience", audience);
    if (q) qs.set("q", q);

    const query = qs.toString();
    return query ? `/catalog?${query}` : "/catalog";
  }

  function openMobileMenu() {
    setMenuAudience(activeAudience);
    setMenuOpen(true);
  }

  function handleMobileAudienceClick(audience: string) {
    setMenuAudience(audience);
  }

  function handleMobileAudienceCatalogClick() {
    setMenuOpen(false);
    router.push(buildCatalogUrl({ audience: menuAudience, category: null }));
  }

  function handleMobileCategoryClick(category: string) {
    setMenuOpen(false);
    router.push(buildCatalogUrl({ audience: menuAudience, category }));
  }

  const selectedMenuAudience =
    audienceItems.find((item) => item.key === menuAudience) ?? audienceItems[0];
  const accountLabel = user?.username || "Профиль";


  return (
    <header className={styles.header} ref={headerRef}>
      <div className={styles.top}>
        <div className={styles.inner}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={openMobileMenu}
          >
            <span />
            <span />
            <span />
          </button>

          <Link href="/" className={styles.logo} aria-label="РЦМ">
            <Image
              src="/icons/logo-rcm.webp"
              alt="РЦМ"
              width={132}
              height={44}
              className={styles.logoImg}
              priority
            />
            <span className={styles.logoBeta}>beta</span>
          </Link>

          <div className={styles.actions}>
            {isAuth === true && isSellerRole(role) ? (
              <Link
                href="/seller?tab=products"
                className={styles.iconBtn}
                aria-label="Кабинет продавца"
              >
                <Image
                  src="/icons/seller.svg"
                  alt="Кабинет продавца"
                  width={22}
                  height={22}
                />
              </Link>
            ) : null}

            <Link href="/favorites" className={styles.iconBtn}>
              <span className={styles.iconWrap}>
                <Image
                  src="/icons/like.svg"
                  alt="Favorites"
                  width={22}
                  height={22}
                />
                {favoritesCount > 0 ? (
                  <span className={styles.badge}>{favoritesCount}</span>
                ) : null}
              </span>
            </Link>

            <Link href="/cart" className={styles.iconBtn}>
              <span className={styles.iconWrap}>
                <Image
                  src="/icons/bag.svg"
                  alt="Cart"
                  width={22}
                  height={22}
                />
                {cartCount > 0 ? (
                  <span className={styles.badge}>{cartCount}</span>
                ) : null}
              </span>
            </Link>

            {isAuth === true ? (
              <Link href="/account?tab=profile" className={styles.iconBtn}>
                <Image src="/icons/user.svg" alt="Profile" width={22} height={22} />
              </Link>
              ) : (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() =>
                    openAuth("login", "/account?tab=profile", {
                      placement: "anchored",
                    })
                  }
                  aria-label="Войти"
                >
                  <Image src="/icons/user.svg" alt="" width={22} height={22} />
                </button>
              )}
          </div>
        </div>
      </div>

      {menuOpen ? (
        <div className={styles.mobilePanel} role="dialog" aria-modal="true">
          <div className={styles.mobilePanelHead}>
            <Link
              href="/"
              className={styles.mobilePanelLogo}
              aria-label="РЦМ"
              onClick={() => setMenuOpen(false)}
            >
              <Image
                src="/icons/logo-rcm.webp"
                alt="РЦМ"
                width={132}
                height={44}
                className={styles.logoImg}
                priority
              />
            </Link>

            <button
              type="button"
              className={styles.mobileClose}
              aria-label="Закрыть меню"
              onClick={() => setMenuOpen(false)}
            >
              <span />
              <span />
            </button>
          </div>

          <nav className={styles.mobileAudience} aria-label="Разделы">
            {audienceItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`${styles.mobileAudienceBtn} ${
                  menuAudience === item.key ? styles.mobileAudienceBtnActive : ""
                }`}
                onClick={() => handleMobileAudienceClick(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <nav className={styles.mobileCategories} aria-label="Категории">
            <button
              type="button"
              className={styles.mobileCategory}
              onClick={handleMobileAudienceCatalogClick}
            >
              <span>{selectedMenuAudience.label}</span>
              <span aria-hidden="true">›</span>
            </button>

            {!loadingCategories
              ? categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`${styles.mobileCategory} ${
                      activeCategory === category.name
                        ? styles.mobileCategoryActive
                        : ""
                    }`}
                    onClick={() => handleMobileCategoryClick(category.name)}
                  >
                    <span>{category.name}</span>
                    <span aria-hidden="true">›</span>
                  </button>
                ))
              : null}
          </nav>

          <div className={styles.mobileAccount}>
            <div className={styles.mobileAccountTitle}>В личный кабинет</div>

            {isAuth === true ? (
              <Link
                href="/account?tab=profile"
                className={styles.mobileProfileLink}
                onClick={() => setMenuOpen(false)}
              >
                <span className={styles.mobileProfileMain}>
                  <Image src="/icons/user.svg" alt="" width={18} height={18} />
                  <span>{accountLabel}</span>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            ) : (
              <div className={styles.mobileAuthActions}>
                <button
                  type="button"
                  className={styles.mobilePrimary}
                  onClick={() => {
                    setMenuOpen(false);
                    openAuth("login", "/account?tab=profile");
                  }}
                >
                  Войти
                </button>
                <button
                  type="button"
                  className={styles.mobileSecondary}
                  onClick={() => {
                    setMenuOpen(false);
                    openAuth("register", "/account?tab=profile");
                  }}
                >
                  Зарегистрироваться
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderContent />
    </Suspense>
  );
}
