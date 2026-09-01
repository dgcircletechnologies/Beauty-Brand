"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

const accountLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/profile", label: "Profile" },
  { href: "/addresses", label: "Addresses" },
];

const footerNavigation = {
  shop: [
    { name: "All products", href: "/shop" },
    { name: "Featured", href: "/shop?sort=featured" },
    { name: "Cart", href: "/cart" },
    { name: "Wishlist", href: "/wishlist" },
  ],
  account: [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Orders", href: "/orders" },
    { name: "Profile", href: "/profile" },
    { name: "Addresses", href: "/addresses" },
  ],
  support: [
    { name: "Contact", href: "/contact" },
    { name: "Shipping", href: "/shipping" },
    { name: "Returns", href: "/returns" },
  ],
  legal: [
    { name: "Privacy policy", href: "/privacy-policy" },
    { name: "Terms of service", href: "/terms-and-conditions" },
  ],
};

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6.5 8h14l-1.3 8.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.7L5 4H2.8M9 21h.01M17 21h.01" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SocialIcon({ label }: { label: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <text x="12" y="15" textAnchor="middle">
        {label}
      </text>
    </svg>
  );
}

function BrandLogo() {
  return (
    <span className="bitpan-brand-mark" aria-label="BlueWave Skincare">
      BlueWave
    </span>
  );
}

export function UserNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isBootstrapping, logout, user } = useAuth();
  const {
    currencies,
    isLoadingCurrencies,
    selectedCurrency,
    setSelectedCurrencyCode,
  } = useCurrency();
  const [categories, setCategories] = useState<customerApi.CustomerCategory[]>(
    [],
  );
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");
  const exploreCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const nextCategories = await customerApi.getCustomerCategories();

        if (isMounted) {
          setCategories(nextCategories);
        }
      } catch {
        if (isMounted) {
          setCategories([]);
        }
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchParams.get("q") ?? "");
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (exploreCloseTimeoutRef.current) {
        clearTimeout(exploreCloseTimeoutRef.current);
      }
    };
  }, []);

  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories],
  );

  const featuredCategories = rootCategories.slice(0, 3);

  async function handleLogout() {
    await logout();
    setIsAccountMenuOpen(false);
    setIsMobileOpen(false);
    router.push("/");
  }

  function closeMenus() {
    setIsAccountMenuOpen(false);
    setIsExploreOpen(false);
    setIsMobileOpen(false);
  }

  function openExploreMenu() {
    if (exploreCloseTimeoutRef.current) {
      clearTimeout(exploreCloseTimeoutRef.current);
    }

    setIsExploreOpen(true);
  }

  function scheduleExploreMenuClose() {
    exploreCloseTimeoutRef.current = setTimeout(() => {
      setIsExploreOpen(false);
    }, 160);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();
    const nextParams = new URLSearchParams(
      pathname === "/shop" ? searchParams.toString() : "",
    );

    nextParams.delete("page");

    if (query) {
      nextParams.set("q", query);
    } else {
      nextParams.delete("q");
    }

    const nextQuery = nextParams.toString();
    router.push(`/shop${nextQuery ? `?${nextQuery}` : ""}`);
    closeMenus();
  }

  return (
    <header className="user-navbar">
      <nav className="user-navbar-inner" aria-label="Global">
        <div className="user-navbar-row">
          <div className="user-navbar-brand">
            <Link href="/" onClick={closeMenus}>
              <BrandLogo />
            </Link>
          </div>

          <div className="user-nav-links" aria-label="Customer navigation">
            <Link className={pathname === "/" ? "active" : undefined} href="/">
              Home
            </Link>
            <div className="explore-menu">
              <button
                className="explore-trigger"
                type="button"
                aria-expanded={isExploreOpen}
                onMouseEnter={openExploreMenu}
                onMouseLeave={scheduleExploreMenuClose}
                onClick={() => setIsExploreOpen((current) => !current)}
              >
                Explore
                <ChevronIcon />
              </button>
              {isExploreOpen ? (
                <div
                  className="explore-panel"
                  onMouseEnter={openExploreMenu}
                  onMouseLeave={scheduleExploreMenuClose}
                >
                  <div className="explore-panel-content">
                    <div className="explore-link-groups">
                      <div>
                        <h2>Categories</h2>
                        <ul className="explore-category-grid">
                          {rootCategories.length ? (
                            rootCategories.map((category) => (
                              <li key={category.id}>
                                <Link
                                  href={`/categories/${category.slug}`}
                                  onClick={closeMenus}
                                >
                                  {category.name}
                                </Link>
                              </li>
                            ))
                          ) : (
                            <li>
                              <span>No child categories yet</span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                    {featuredCategories.length ? (
                      <div className="explore-featured">
                        {featuredCategories.map((category) => {
                          const image = category.images?.[0];

                          return (
                            <Link
                              className="explore-feature-card"
                              href={`/categories/${category.slug}`}
                              key={category.id}
                              onClick={closeMenus}
                            >
                              {image ? (
                                <img
                                  alt={image.altText ?? category.name}
                                  src={image.url}
                                />
                              ) : (
                                <span>{category.name.slice(0, 1)}</span>
                              )}
                              <strong>{category.name}</strong>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <Link href="/categories">Categories</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/checkout">Checkout</Link>
          </div>

          <div className="user-nav-actions">
            <label className="currency-picker desktop-currency-picker">
              <select
                aria-label="Select currency"
                value={selectedCurrency?.code ?? ""}
                disabled={isLoadingCurrencies || currencies.length === 0}
                onChange={(event) => setSelectedCurrencyCode(event.target.value)}
              >
                {currencies.map((currency) => (
                  <option value={currency.code} key={currency.code}>
                    {currency.code}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="nav-icon-button mobile-menu-button"
              type="button"
              aria-label="Open menu"
              aria-expanded={isMobileOpen}
              onClick={() => setIsMobileOpen((current) => !current)}
            >
              <MenuIcon/>
            </button>
            <form
              className="nav-search-form desktop-nav-search"
              onSubmit={handleSearchSubmit}
            >
              <input
                aria-label="Search products"
                placeholder="Search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button type="submit" aria-label="Search">
                <SearchIcon />
              </button>
            </form>
            <div className="account-menu">
              <button
                className="nav-icon-button"
                type="button"
                aria-label="Account"
                aria-expanded={isAccountMenuOpen}
                onClick={() => setIsAccountMenuOpen((current) => !current)}
              >
                <UserIcon />
              </button>
              {isAccountMenuOpen ? (
                <div className="account-menu-panel">
                  {isBootstrapping ? null : isAuthenticated ? (
                    <>
                      <span className="user-pill">
                        {user?.firstName || user?.email}
                      </span>
                      {accountLinks.map((link) => (
                        <Link
                          href={link.href}
                          key={link.href}
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          {link.label}
                        </Link>
                      ))}
                      <button type="button" onClick={handleLogout}>
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={closeMenus}>
                        Login
                      </Link>
                      <Link href="/signup" onClick={closeMenus}>
                        Register
                      </Link>
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <Link className="nav-icon-button" href="/cart" aria-label="Cart">
              <CartIcon />
            </Link>
          </div>
        </div>

        {isMobileOpen ? (
          <div className="mobile-nav-panel">
            <div className="mobile-nav-controls">
              <form
                className="nav-search-form mobile-nav-search"
                onSubmit={handleSearchSubmit}
              >
                <input
                  aria-label="Search products"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button type="submit" aria-label="Search">
                  <SearchIcon />
                </button>
              </form>
              <label className="currency-picker mobile-currency-picker">
                <select
                  aria-label="Select currency"
                  value={selectedCurrency?.code ?? ""}
                  disabled={isLoadingCurrencies || currencies.length === 0}
                  onChange={(event) =>
                    setSelectedCurrencyCode(event.target.value)
                  }
                >
                  {currencies.map((currency) => (
                    <option value={currency.code} key={currency.code}>
                      {currency.code}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Link href="/" onClick={closeMenus}>
              Home
            </Link>
            <Link href="/shop" onClick={closeMenus}>
              Shop
            </Link>
            <Link href="/categories" onClick={closeMenus}>
              Explore
            </Link>
            <Link href="/checkout" onClick={closeMenus}>
              Checkout
            </Link>
          </div>
        ) : null}
      </nav>
    </header>
  );
}

export function UserFooter() {
  return (
    <footer className="user-footer">
      <div className="user-footer-grid">
        <div>
          <BrandLogo />
        </div>
        <div className="user-footer-links">
          <FooterColumn title="Shop" links={footerNavigation.shop} />
          <FooterColumn title="Account" links={footerNavigation.account} />
          <FooterColumn title="Support" links={footerNavigation.support} />
          <FooterColumn title="Legal" links={footerNavigation.legal} />
        </div>
      </div>
      <div className="user-footer-bottom">
        <div className="user-social-links">
          {["f", "i", "x", "y"].map((label) => (
            <Link href="#" key={label} aria-label={label}>
              <SocialIcon label={label} />
            </Link>
          ))}
        </div>
        <p>&copy; 2026 BlueWave Skincare. All rights reserved.</p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { name: string; href: string }[];
}) {
  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.name}>
            <Link href={link.href}>{link.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
