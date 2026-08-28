"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

function getAttributeDisplayValue(
  attributeValue: customerApi.CustomerProductAttributeValue,
) {
  if (attributeValue.option) {
    return attributeValue.option.label;
  }

  if (attributeValue.textValue) {
    return attributeValue.textValue;
  }

  if (attributeValue.numberValue) {
    return attributeValue.numberValue;
  }

  if (attributeValue.booleanValue !== null) {
    return attributeValue.booleanValue ? "Yes" : "No";
  }

  return null;
}

export default function CartPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { formatPrice } = useCurrency();
  const [cart, setCart] = useState<customerApi.CustomerCart | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const availableItemCount =
    cart?.items.filter((item) => item.availability.isAvailable).length ?? 0;

  useEffect(() => {
    let isMounted = true;

    async function loadCart() {
      if (!accessToken) {
        return;
      }

      try {
        const nextCart = await customerApi.getCart(accessToken);

        if (isMounted) {
          setCart(nextCart);
          setSelectedItemIds((currentIds) =>
            currentIds.filter((itemId) =>
              nextCart.items.some((item) => item.id === itemId),
            ),
          );
          setError(null);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load cart",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCart();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  async function updateQuantity(itemId: string, quantity: number) {
    if (!accessToken || quantity < 1) {
      return;
    }

    setUpdatingItemId(itemId);
    setError(null);

    try {
      setCart(await customerApi.updateCartItem(accessToken, itemId, { quantity }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update cart",
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((currentIds) =>
      currentIds.includes(itemId)
        ? currentIds.filter((currentId) => currentId !== itemId)
        : [...currentIds, itemId],
    );
  }

  function toggleAllSelection() {
    if (!cart) {
      return;
    }

    const availableItemIds = cart.items
      .filter((item) => item.availability.isAvailable)
      .map((item) => item.id);

    setSelectedItemIds((currentIds) =>
      currentIds.length === availableItemIds.length ? [] : availableItemIds,
    );
  }

  function goToCheckout() {
    const params = new URLSearchParams();

    if (selectedItemIds.length) {
      params.set("cartItemIds", selectedItemIds.join(","));
    }

    router.push(`/checkout${params.toString() ? `?${params.toString()}` : ""}`);
  }

  async function removeItem(itemId: string) {
    if (!accessToken) {
      return;
    }

    setUpdatingItemId(itemId);
    setError(null);

    try {
      setCart(await customerApi.removeCartItem(accessToken, itemId));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to remove cart item",
      );
    } finally {
      setUpdatingItemId(null);
    }
  }

  return (
    <UserShell>
      <main className="customer-page">
        <section className="dashboard-header cart-template-header">
          <div>
            <p className="eyebrow">Cart</p>
            <h1>
              Shopping <em>Cart</em>
            </h1>
          </div>
        </section>

        {error ? <p className="form-error">{error}</p> : null}

        {isLoading ? (
          <section className="empty-surface">
            <h2>Loading cart...</h2>
          </section>
        ) : cart?.items.length ? (
          <section className="cart-layout">
            <div className="cart-items">
              <div className="cart-selection-bar">
                <label className="checkbox-field">
                  <input
                    checked={
                      selectedItemIds.length > 0 &&
                      selectedItemIds.length === availableItemCount
                    }
                    type="checkbox"
                    onChange={toggleAllSelection}
                  />
                  <span>Select available items</span>
                </label>
                <p>
                  {selectedItemIds.length
                    ? `${selectedItemIds.length} selected for checkout`
                    : "Nothing selected, checkout will include all products"}
                </p>
              </div>
              {cart.items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <label className="cart-item-select" aria-label="Select item">
                    <input
                      checked={selectedItemIds.includes(item.id)}
                      disabled={!item.availability.isAvailable}
                      type="checkbox"
                      onChange={() => toggleItemSelection(item.id)}
                    />
                  </label>

                  <Link
                    className="cart-item-visual"
                    href={`/products/${item.product.slug}`}
                  >
                    {item.image ? (
                      <img
                        alt={item.image.altText ?? item.product.name}
                        src={item.image.url}
                      />
                    ) : (
                      <span>{item.product.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </Link>

                  <div className="cart-item-main">
                    <div className="cart-item-copy">
                      <h2>
                        <Link href={`/products/${item.product.slug}`}>
                          {item.product.name}
                        </Link>
                      </h2>
                      <div className="cart-item-attributes">
                        {(item.variant.attributeValues ?? [])
                          .map((attributeValue) =>
                            getAttributeDisplayValue(attributeValue),
                          )
                          .filter(Boolean)
                          .slice(0, 3)
                          .map((value) => (
                            <span key={value}>{value}</span>
                          ))}
                        <span>SKU {item.variant.sku}</span>
                      </div>
                      <strong>{formatPrice(item.displayUnitPrice)}</strong>
                    </div>

                    <div className="cart-item-controls">
                      <div className="quantity-controls">
                        <button
                          type="button"
                          disabled={updatingItemId === item.id || item.quantity <= 1}
                          onClick={() =>
                            void updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          disabled={updatingItemId === item.id}
                          onClick={() =>
                            void updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="cart-remove-button"
                        type="button"
                        disabled={updatingItemId === item.id}
                        onClick={() => void removeItem(item.id)}
                      >
                        <span aria-hidden="true">x</span>
                        <span className="sr-only">Remove</span>
                      </button>
                    </div>

                    <div className="cart-item-footer">
                      <p
                        className={
                          item.availability.isAvailable
                            ? "cart-stock-message available"
                            : "cart-stock-message"
                        }
                      >
                        <span aria-hidden="true">
                          {item.availability.isAvailable ? "OK" : "!"}
                        </span>
                        {item.availability.isAvailable
                          ? "In stock"
                          : item.availability.message}
                      </p>
                      <strong>{formatPrice(item.displayLineTotal)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <aside className="cart-summary">
              <h2>
                <em>Order</em> summary
              </h2>
              <dl>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(cart.displaySubtotal)}</dd>
                </div>
                <div>
                  <dt>Shipping estimate</dt>
                  <dd>At checkout</dd>
                </div>
                <div>
                  <dt>Tax estimate</dt>
                  <dd>At checkout</dd>
                </div>
                <div>
                  <dt>Order total</dt>
                  <dd>{formatPrice(cart.displaySubtotal)}</dd>
                </div>
              </dl>
              <button
                className="primary-button"
                disabled={cart.hasUnavailableItems && selectedItemIds.length === 0}
                type="button"
                onClick={goToCheckout}
              >
                Checkout
              </button>
              <p className="cart-summary-note">
                or{" "}
                <Link href="/shop">
                  Continue Shopping <span aria-hidden="true">-&gt;</span>
                </Link>
              </p>
              {cart.hasUnavailableItems && selectedItemIds.length === 0 ? (
                <p>Select available items or remove unavailable ones first.</p>
              ) : null}
            </aside>
          </section>
        ) : (
          <section className="empty-surface">
            <h2>Your cart is empty</h2>
            <p>Add a product from the shop and it will show here.</p>
            <Link className="primary-link-button compact-button" href="/shop">
              Continue Shopping
            </Link>
          </section>
        )}
      </main>
    </UserShell>
  );
}
