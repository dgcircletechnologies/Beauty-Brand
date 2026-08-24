"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { UserShell } from "@/components/customer/user-shell";
import { useAuth } from "@/contexts/auth-context";
import { useCurrency } from "@/contexts/currency-context";
import * as customerApi from "@/lib/api/customer";

export default function CartPage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { formatPrice } = useCurrency();
  const [cart, setCart] = useState<customerApi.CustomerCart | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

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
        <section className="dashboard-header">
          <div>
            <p className="eyebrow">Cart</p>
            <h1>Your cart items</h1>
            <p>Use this page to check whether add to cart is working.</p>
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
                      selectedItemIds.length ===
                        cart.items.filter((item) => item.availability.isAvailable)
                          .length
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
                  <div>
                    <h2>{item.product.name}</h2>
                    <p>SKU: {item.variant.sku}</p>
                    <p>{item.availability.message}</p>
                  </div>
                  <div className="quantity-controls">
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      disabled={updatingItemId === item.id || item.quantity <= 1}
                      onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      disabled={updatingItemId === item.id}
                      onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <strong>{formatPrice(item.baseLineTotal)}</strong>
                  <button
                    className="danger-button compact-button"
                    type="button"
                    disabled={updatingItemId === item.id}
                    onClick={() => void removeItem(item.id)}
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
            <aside className="cart-summary">
              <p className="eyebrow">Summary</p>
              <h2>{cart.itemCount} item(s)</h2>
              <strong>{formatPrice(cart.baseSubtotal)}</strong>
              <button
                className="primary-button"
                disabled={cart.hasUnavailableItems && selectedItemIds.length === 0}
                type="button"
                onClick={goToCheckout}
              >
                {selectedItemIds.length ? "Checkout Selected" : "Checkout All"}
              </button>
              {cart.hasUnavailableItems && selectedItemIds.length === 0 ? (
                <p>Select available items or remove unavailable ones first.</p>
              ) : null}
            </aside>
          </section>
        ) : (
          <section className="empty-surface">
            <h2>Your cart is empty</h2>
            <p>Add a product from the dashboard and it will show here.</p>
          </section>
        )}
      </main>
    </UserShell>
  );
}
