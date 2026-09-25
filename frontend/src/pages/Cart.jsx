import {
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  ShoppingBag
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import {
  useCart
} from "../context/CartContext";

export default function Cart() {
  const {
    cart,
    subtotal,
    updateQuantity,
    removeFromCart
  } = useCart();

  const shipping =
    subtotal >= 1999
      ? 0
      : 99;

  const total =
    subtotal + shipping;

  if (cart.length === 0) {
    return (
      <section className="cart-empty">

        <div className="cart-empty-icon">
          <ShoppingBag
            size={30}
          />
        </div>

        <p className="eyebrow">
          YOUR BAG
        </p>

        <h1>
          Your bag is empty.
        </h1>

        <p>
          Your next favourite
          DesiGlov piece might be
          waiting for you.
        </p>

        <Link
          to="/shop"
          className="button-dark"
        >
          SHOP COLLECTION
        </Link>

      </section>
    );
  }

  return (
    <section className="cart-page">

      <div className="cart-heading">

        <p className="eyebrow">
          YOUR SELECTION
        </p>

        <h1>
          Shopping Bag
        </h1>

        <span>
          {cart.length}{" "}
          {cart.length === 1
            ? "item"
            : "items"}
        </span>

      </div>

      <div className="cart-layout">

        <div className="cart-items">

          {cart.map(
            (item) => (
              <article
                className="cart-item"
                key={`${item.id}-${item.size}`}
              >

                <Link
                  to={`/product/${item.id}`}
                  className="cart-image-link"
                >
                  <img
                    src={
                      item.image
                    }
                    alt={
                      item.name
                    }
                  />
                </Link>

                <div className="cart-item-content">

                  <div className="cart-item-top">

                    <div>

                      <p className="cart-item-category">
                        {
                          item.category
                        }
                      </p>

                      <Link
                        to={`/product/${item.id}`}
                      >
                        <h2>
                          {
                            item.name
                          }
                        </h2>
                      </Link>

                      {item.size && (
                        <p className="cart-meta">
                          Size:{" "}
                          <strong>
                            {
                              item.size
                            }
                          </strong>
                        </p>
                      )}

                      <p className="cart-meta">
                        Colour:{" "}
                        <strong>
                          {
                            item.colour
                          }
                        </strong>
                      </p>

                    </div>

                    <button
                      className="cart-remove"
                      onClick={() =>
                        removeFromCart(
                          item.id,
                          item.size
                        )
                      }
                      aria-label="Remove item"
                    >
                      <Trash2
                        size={18}
                      />
                    </button>

                  </div>

                  <div className="cart-item-bottom">

                    <div className="cart-quantity">

                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.size,
                            item.quantity -
                              1
                          )
                        }
                      >
                        <Minus
                          size={14}
                        />
                      </button>

                      <span>
                        {
                          item.quantity
                        }
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.size,
                            item.quantity +
                              1
                          )
                        }
                      >
                        <Plus
                          size={14}
                        />
                      </button>

                    </div>

                    <div className="cart-item-price">

                      <strong>
                        ₹
                        {
                          item.price *
                          item.quantity
                        }
                      </strong>

                      {item.originalPrice && (
                        <span>
                          ₹
                          {
                            item.originalPrice *
                            item.quantity
                          }
                        </span>
                      )}

                    </div>

                  </div>

                </div>

              </article>
            )
          )}

        </div>

        <aside className="cart-summary">

          <p className="cart-summary-label">
            ORDER SUMMARY
          </p>

          <h2>
            Your order
          </h2>

          <div className="summary-line">

            <span>
              Subtotal
            </span>

            <strong>
              ₹{subtotal}
            </strong>

          </div>

          <div className="summary-line">

            <span>
              Shipping
            </span>

            <strong>
              {shipping === 0
                ? "FREE"
                : `₹${shipping}`}
            </strong>

          </div>

          {shipping >
            0 && (
            <p className="free-delivery-note">
              Add ₹
              {1999 -
                subtotal}{" "}
              more for free
              delivery.
            </p>
          )}

          <div className="summary-total">

            <span>
              Total
            </span>

            <strong>
              ₹{total}
            </strong>

          </div>

          <Link
            to="/checkout"
            className="cart-checkout-button"
          >
            CHECKOUT

            <ArrowRight
              size={17}
            />
          </Link>

          <Link
            to="/shop"
            className="continue-shopping"
          >
            Continue shopping
          </Link>

          <div className="cart-security">

            <span>
              SECURE CHECKOUT
            </span>

            <p>
              Taxes included.
              Shipping calculated
              at checkout.
            </p>

          </div>

        </aside>

      </div>

    </section>
  );
}
