"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import styles from "./Header.module.css";
import { useCartCount } from "../../lib/useCartCount";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useFavorites } from "../../lib/FavoritesContext";
import { useAuthModal } from "../AuthModal/useAuthModal";
import { Icon } from "../ui/Icon";
import { BuyerBottomNavigation } from "../BuyerNavigation/BuyerBottomNavigation";
import { getBuyerMobilePage } from "../../lib/buyerNavigation";
import { HeaderIcon } from "./HeaderIcon";
import { isSellerCabinetPath, SellerHeader } from "./SellerHeader";
import { Button } from "../ui/Button";
import { loadMenuCategories, type MenuCategory } from "./menuCategories";

type HeaderProps = {
  initialCategories: MenuCategory[] | null;
};

function isSellerRole(role: string | null) {
  return role === "SELLER" || role === "ROLE_SELLER";
}

function isAdminRole(role: string | null) {
  return role === "ADMIN" || role === "ROLE_ADMIN";
}

function HeaderContent({ initialCategories }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const headerRef = useRef<HTMLElement | null>(null);
  const menuDialogRef = useRef<HTMLDialogElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);

  const activeCategory = searchParams.get("category");
  const activeAudience = searchParams.get("audience") || "all";
  const activeSearch = searchParams.get("q") || "";
  const buyerMobilePage = getBuyerMobilePage(pathname, searchParams);

  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories ?? []);
  const [loadingCategories, setLoadingCategories] = useState(initialCategories === null);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoryLoadAttempt, setCategoryLoadAttempt] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(activeSearch);

  const { user, isAuthenticated: isAuth } = useCurrentUser();
  const cartCount = useCartCount();
  const role = user?.role ?? null;
  const { count: favoritesCount } = useFavorites();
  const { openAuth } = useAuthModal();


  useEffect(() => {
    if (!menuOpen) return;
    const dialog = menuDialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (initialCategories !== null && categoryLoadAttempt === 0) {
      setCategories(initialCategories);
      setLoadingCategories(false);
      setCategoriesError(false);
      return;
    }
    let cancelled = false;

    async function loadCategories() {
      setLoadingCategories(true);
      setCategoriesError(false);

      try {
        const data = await loadMenuCategories();

        if (!cancelled) {
          setCategories(data);
        }
      } catch {
        if (!cancelled) {
          setCategoriesError(true);
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
  }, [initialCategories, categoryLoadAttempt]);

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
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
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
    setSearchOpen(false);
    setMenuOpen(true);
  }

  function handleMobileCatalogClick() {
    setMenuOpen(false);
    router.push("/catalog");
  }

  function handleMobileCategoryClick(category: string) {
    setMenuOpen(false);
    router.push(buildCatalogUrl({ audience: null, category, q: null }));
  }



  return (
    <>
    <header className={styles.header} ref={headerRef} data-buyer-mobile={buyerMobilePage ? "true" : undefined}>
      {buyerMobilePage ? (
        <div className={styles.buyerBar}>
          <div className={styles.buyerLeading}>
            {buyerMobilePage.backHref ? (
              <Link href={buyerMobilePage.backHref} className={styles.buyerUtility} aria-label="Назад">
                <Icon name="chevron-left" size={22} />
              </Link>
            ) : (
              <button type="button" className={styles.buyerUtility} aria-label="Открыть меню" aria-expanded={menuOpen} aria-controls="site-menu" onClick={openMobileMenu}>
                <HeaderIcon name="menu" />
              </button>
            )}
          </div>
          {buyerMobilePage.title ? (
            <span className={styles.buyerTitle}>{buyerMobilePage.title}</span>
          ) : (
            <Link href="/" className={styles.buyerLogo} aria-label="рцмаркет — главная">
              <Image src="/brand/wordmark-gold-white.svg" alt="рцмаркет" width={794} height={100} priority />
            </Link>
          )}
          <div className={styles.buyerTrailing}>
            {buyerMobilePage.backHref ? (
              <button type="button" className={styles.buyerUtility} aria-label="Открыть меню" aria-expanded={menuOpen} aria-controls="site-menu" onClick={openMobileMenu}>
                <HeaderIcon name="menu" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {isSellerCabinetPath(pathname) ? <SellerHeader /> : (
      <div className={styles.top}>
        <div className={styles.inner}>
          <div className={styles.leadingActions}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={openMobileMenu}
          >
            <HeaderIcon name="menu" />
          </button>

          <Link href="/favorites" className={`${styles.iconBtn} ${favoritesCount > 0 ? styles.iconBtnActive : ""}`} aria-label={favoritesCount > 0 ? `Избранное: ${favoritesCount}` : "Избранное"}>
            <HeaderIcon name="heart" />
          </Link>
          </div>

          <Link href="/" className={styles.logo} aria-label="рцмаркет — главная">
            <Image
              src="/brand/wordmark-gold-white.svg"
              alt="рцмаркет"
              width={794}
              height={100}
              className={styles.logoImg}
              priority
            />
          </Link>

          <div className={styles.actions}>
            <button
              type="button"
              ref={searchButtonRef}
              className={styles.iconBtn}
              aria-label="Поиск"
              aria-expanded={searchOpen}
              aria-controls="site-search"
              onClick={() => {
                setSearchQuery(activeSearch);
                setSearchOpen(!searchOpen);
              }}
            >
              <HeaderIcon name="search" />
            </button>

            <Link
              href="/cart"
              className={`${styles.iconBtn} ${
                cartCount > 0 ? styles.iconBtnActive : ""
              }`.trim()}
              aria-label={
                cartCount > 0 ? `Корзина: ${cartCount}` : "Корзина"
              }
            >
              <HeaderIcon name="bag" />
            </Link>
          </div>
        </div>
      </div>

      )}

      {searchOpen && !isSellerCabinetPath(pathname) ? (
        <form id="site-search" role="search" className={styles.searchPanel} onSubmit={(event) => {
          event.preventDefault();
          setSearchOpen(false);
          router.push(buildCatalogUrl({ q: searchQuery.trim() }));
        }} onKeyDown={(event) => {
          if (event.key === "Escape") {
            setSearchOpen(false);
            searchButtonRef.current?.focus();
          }
        }}>
          <label htmlFor="site-search-query">Поиск по каталогу</label>
          <div className={styles.searchRow}>
            <input id="site-search-query" ref={searchInputRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} type="search" placeholder="Товар или бренд" />
            <button type="submit">Найти</button>
            <button type="button" className={styles.searchClose} aria-label="Закрыть поиск" onClick={() => { setSearchOpen(false); searchButtonRef.current?.focus(); }}><Icon name="x" size={24} /></button>
          </div>
        </form>
      ) : null}

      {menuOpen ? (
        <dialog
          id="site-menu"
          ref={menuDialogRef}
          className={styles.mobilePanel}
          aria-label="Меню сайта"
          onCancel={() => setMenuOpen(false)}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const controls = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]")
            ).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setMenuOpen(false);
          }}
        >
          <button
            type="button"
            className={styles.mobileClose}
            aria-label="Закрыть меню"
            onClick={() => setMenuOpen(false)}
          >
            <Icon name="x" size={36} strokeWidth={1.25} />
          </button>

          <div className={styles.mobileDrawer}>
            <nav className={styles.mobileCategories} aria-label="Категории">
              <button
                type="button"
                className={`${styles.mobileCategory} ${styles.mobileMenuEmphasis}`}
                onClick={handleMobileCatalogClick}
              >
                <span>Всё</span>
                <span className={styles.mobileChevron} aria-hidden="true" />
              </button>

              {loadingCategories ? (
                <div className={styles.mobileMenuMessage} role="status">
                  Загрузка категорий
                </div>
              ) : categoriesError ? (
                <div className={styles.mobileMenuMessage} role="status">
                  <p>Не удалось загрузить категории</p>
                  <Button onClick={() => setCategoryLoadAttempt((value) => value + 1)}>
                    Повторить
                  </Button>
                </div>
              ) : categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`${styles.mobileCategory} ${activeCategory?.split("/")[0].trim() === category.name ? styles.mobileCategoryActive : ""}`}
                  onClick={() => handleMobileCategoryClick(category.name)}
                >
                  <span>{category.name}</span>
                  <span className={styles.mobileChevron} aria-hidden="true" />
                </button>
              ))}
            </nav>

            <div className={styles.mobileAccount}>
              {isAuth === true && isAdminRole(role) ? (
                <Link href="/admin" className={styles.mobileProfileLink} onClick={() => setMenuOpen(false)}>
                  <span>Администрирование</span>
                  <span className={styles.mobileChevron} aria-hidden="true" />
                </Link>
              ) : null}

              {isAuth === true && isSellerRole(role) ? (
                <Link href="/seller" className={`${styles.mobileProfileLink} ${styles.mobileMenuEmphasis}`} onClick={() => setMenuOpen(false)}>
                  <span>Кабинет продавца</span>
                  <span className={styles.mobileChevron} aria-hidden="true" />
                </Link>
              ) : null}

              <div className={styles.mobileAuthActions}>
                {isAuth === true ? (
                  <Link href="/account" className={`buttonPrimary ${styles.mobileAction}`} onClick={() => setMenuOpen(false)}>
                    Личный кабинет
                  </Link>
                ) : (
                  <>
                    <Button variant="primary" className={styles.mobileAction} onClick={() => {
                      setMenuOpen(false);
                      openAuth("login", "/account");
                    }}>
                      Войти
                    </Button>
                    <Button className={styles.mobileAction} onClick={() => {
                      setMenuOpen(false);
                      openAuth("register", "/account");
                    }}>
                      Зарегистрироваться
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </dialog>
      ) : null}
    </header>
    {buyerMobilePage?.tab ? (
      <BuyerBottomNavigation
        activeTab={buyerMobilePage.tab}
        cartCount={cartCount}
        favoritesCount={favoritesCount}
        isAuthenticated={isAuth === true}
        onSignIn={() => openAuth("login", "/account")}
      />
    ) : null}
    </>
  );
}

export function Header({ initialCategories }: HeaderProps) {
  return (
    <Suspense fallback={null}>
      <HeaderContent initialCategories={initialCategories} />
    </Suspense>
  );
}
