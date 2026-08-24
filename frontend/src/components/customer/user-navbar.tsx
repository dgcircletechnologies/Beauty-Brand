"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";

const guestLinks = [{ href: "/", label: "Home" }];
const customerLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cart", label: "Cart" },
  { href: "/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
];

export function UserNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, logout, user } = useAuth();
  const {
    currencies,
    isLoadingCurrencies,
    selectedCurrency,
    setSelectedCurrencyCode,
  } = useCurrency();
  const links = isAuthenticated ? customerLinks : guestLinks;

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <header className="user-navbar">
      <Link className="user-brand" href="/">
        <span>BlueWave</span>
        <small>Skincare</small>
      </Link>
      <nav className="user-nav-links" aria-label="Customer navigation">
        {links.map((link) => (
          <Link
            className={pathname === link.href ? "active" : undefined}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="user-nav-actions">
        <label className="currency-picker">
          <span>Currency</span>
          <select
            value={selectedCurrency?.code ?? ""}
            disabled={isLoadingCurrencies || currencies.length === 0}
            onChange={(event) => setSelectedCurrencyCode(event.target.value)}
          >
            {currencies.map((currency) => (
              <option value={currency.code} key={currency.code}>
                {currency.code} {currency.symbol ? `(${currency.symbol})` : ""}
              </option>
            ))}
          </select>
        </label>
        {isBootstrapping ? null : isAuthenticated ? (
          <>
            <span className="user-pill">{user?.firstName || user?.email}</span>
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="secondary-link-button compact-button" href="/login">
              Login
            </Link>
            <Link className="primary-link-button compact-button" href="/signup">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
