"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/contexts/auth-context";

const productLinks = [
  {
    href: "/admin/products/all",
    label: "View All Products",
  },
  {
    href: "/admin/products/add",
    label: "Add Product",
  },
];

const categoryLinks = [
  {
    href: "/admin/categories",
    label: "View Categories",
  },
  {
    href: "/admin/categories/add",
    label: "Add Category",
  },
];

const attributeLinks = [
  {
    href: "/admin/attributes",
    label: "View Attributes",
  },
  {
    href: "/admin/attributes/add",
    label: "Add Attribute",
  },
  {
    href: "/admin/attributes/options/add",
    label: "Add Attribute Option",
  },
];

const metadataLinks = [
  {
    href: "/admin/product-metadata",
    label: "View Metadata",
  },
  {
    href: "/admin/product-metadata/ingredients/add",
    label: "Add Ingredient",
  },
  {
    href: "/admin/product-metadata/skin-types/add",
    label: "Add Skin Type",
  },
  {
    href: "/admin/product-metadata/age-groups/add",
    label: "Add Age Group",
  },
  {
    href: "/admin/product-metadata/audiences/add",
    label: "Add Audience",
  },
  {
    href: "/admin/product-metadata/hair-profiles/add",
    label: "Add Hair Profile",
  },
  {
    href: "/admin/product-metadata/concerns/add",
    label: "Add Concern",
  },
  {
    href: "/admin/product-metadata/benefits/add",
    label: "Add Benefit",
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(
    pathname.startsWith("/admin/products"),
  );
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(
    pathname.startsWith("/admin/categories"),
  );
  const [isAttributesOpen, setIsAttributesOpen] = useState(
    pathname.startsWith("/admin/attributes"),
  );
  const [isMetadataOpen, setIsMetadataOpen] = useState(
    pathname.startsWith("/admin/product-metadata"),
  );
  const isProductsActive = pathname.startsWith("/admin/products");
  const isCategoriesActive = pathname.startsWith("/admin/categories");
  const isAttributesActive = pathname.startsWith("/admin/attributes");
  const isCurrenciesActive = pathname.startsWith("/admin/currencies");
  const isMetadataActive = pathname.startsWith("/admin/product-metadata");

  return (
    <div
      className={`admin-layout ${
        isSidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-brand">
            <p className="eyebrow">BlueWave</p>
            <h2>Admin</h2>
          </div>
          <button
            aria-label={
              isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            className="icon-button sidebar-toggle"
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            <PanelIcon />
          </button>
        </div>
        <nav className="admin-nav" aria-label="Admin navigation">
          <Link
            aria-current={pathname === "/admin" ? "page" : undefined}
            className={pathname === "/admin" ? "active nav-link" : "nav-link"}
            href="/admin"
          >
            <ChartIcon />
            <span>Analytics</span>
          </Link>

          <Link
            aria-current={pathname === "/admin/currencies" ? "page" : undefined}
            className={isCurrenciesActive ? "active nav-link" : "nav-link"}
            href="/admin/currencies"
          >
            <CurrencyIcon />
            <span>Currencies</span>
          </Link>

          <div className={`nav-group ${isCategoriesActive ? "active" : ""}`}>
            <div className="nav-group-row">
              <Link
                aria-current={
                  pathname === "/admin/categories" ? "page" : undefined
                }
                className={isCategoriesActive ? "active nav-link" : "nav-link"}
                href="/admin/categories"
              >
                <CategoryIcon />
                <span>Categories</span>
              </Link>
              <button
                aria-expanded={isCategoriesOpen}
                aria-label="Toggle category options"
                className="icon-button nav-options-button"
                type="button"
                onClick={() => {
                  setIsCategoriesOpen((current) => !current);
                  setIsSidebarCollapsed(false);
                }}
              >
                <ChevronIcon />
              </button>
            </div>
            {isCategoriesOpen && !isSidebarCollapsed ? (
              <div className="nav-submenu">
                {categoryLinks.map((link) => (
                  <Link
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={pathname === link.href ? "active" : undefined}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`nav-group ${isAttributesActive ? "active" : ""}`}>
            <div className="nav-group-row">
              <Link
                aria-current={
                  pathname === "/admin/attributes" ? "page" : undefined
                }
                className={isAttributesActive ? "active nav-link" : "nav-link"}
                href="/admin/attributes"
              >
                <SlidersIcon />
                <span>Attributes</span>
              </Link>
              <button
                aria-expanded={isAttributesOpen}
                aria-label="Toggle attribute options"
                className="icon-button nav-options-button"
                type="button"
                onClick={() => {
                  setIsAttributesOpen((current) => !current);
                  setIsSidebarCollapsed(false);
                }}
              >
                <ChevronIcon />
              </button>
            </div>
            {isAttributesOpen && !isSidebarCollapsed ? (
              <div className="nav-submenu">
                {attributeLinks.map((link) => (
                  <Link
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={pathname === link.href ? "active" : undefined}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`nav-group ${isProductsActive ? "active" : ""}`}>
            <div className="nav-group-row">
              <Link
                aria-current={
                  pathname === "/admin/products" ? "page" : undefined
                }
                className={isProductsActive ? "active nav-link" : "nav-link"}
                href="/admin/products"
              >
                <BoxIcon />
                <span>Products</span>
              </Link>
              <button
                aria-expanded={isProductsOpen}
                aria-label="Toggle product options"
                className="icon-button nav-options-button"
                type="button"
                onClick={() => {
                  setIsProductsOpen((current) => !current);
                  setIsSidebarCollapsed(false);
                }}
              >
                <ChevronIcon />
              </button>
            </div>
            {isProductsOpen && !isSidebarCollapsed ? (
              <div className="nav-submenu">
                {productLinks.map((link) => (
                  <Link
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={pathname === link.href ? "active" : undefined}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`nav-group ${isMetadataActive ? "active" : ""}`}>
            <div className="nav-group-row">
              <Link
                aria-current={
                  pathname === "/admin/product-metadata" ? "page" : undefined
                }
                className={isMetadataActive ? "active nav-link" : "nav-link"}
                href="/admin/product-metadata"
              >
                <DatabaseIcon />
                <span>Product Metadata</span>
              </Link>
              <button
                aria-expanded={isMetadataOpen}
                aria-label="Toggle product metadata options"
                className="icon-button nav-options-button"
                type="button"
                onClick={() => {
                  setIsMetadataOpen((current) => !current);
                  setIsSidebarCollapsed(false);
                }}
              >
                <ChevronIcon />
              </button>
            </div>
            {isMetadataOpen && !isSidebarCollapsed ? (
              <div className="nav-submenu">
                {metadataLinks.map((link) => (
                  <Link
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={pathname === link.href ? "active" : undefined}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>
        <div className="admin-user">
          <p>{user?.email}</p>
          <button className="secondary-button" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>
      <section className="admin-content">{children}</section>
    </div>
  );
}

function PanelIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4H18.5C19.33 4 20 4.67 20 5.5V18.5C20 19.33 19.33 20 18.5 20H5.5C4.67 20 4 19.33 4 18.5V5.5Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M9 4V20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M5 19V11"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M12 19V5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M19 19V8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M4.5 8.25L12 4L19.5 8.25V16.25L12 20.5L4.5 16.25V8.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M4.75 8.5L12 12.75L19.25 8.5"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path d="M12 13V20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M5 7C5 5.34 8.13 4 12 4C15.87 4 19 5.34 19 7C19 8.66 15.87 10 12 10C8.13 10 5 8.66 5 7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 7V12C5 13.66 8.13 15 12 15C15.87 15 19 13.66 19 12V7"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M5 12V17C5 18.66 8.13 20 12 20C15.87 20 19 18.66 19 17V12"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M12 3V21"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M17 7.5C16.17 6.57 14.76 6 12.95 6H10.75C8.68 6 7 7.34 7 9C7 10.66 8.68 12 10.75 12H13.25C15.32 12 17 13.34 17 15C17 16.66 15.32 18 13.25 18H11.05C9.24 18 7.83 17.43 7 16.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CategoryIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M4 7C4 5.9 4.9 5 6 5H10L12 7H18C19.1 7 20 7.9 20 9V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M8 12H16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path
        d="M5 7H13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M17 7H19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M5 17H7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M11 17H19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M15 5V9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M9 15V19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
