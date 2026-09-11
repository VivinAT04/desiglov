import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Lock,
  MapPin,
  Package
} from "lucide-react";

import { useCart } from "../context/CartContext";

export default function Checkout() {
  const navigate = useNavigate();

  const {
    cart,
    subtotal,
    clearCart
  } = useCart();

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "India"
  });

  const [paymentMethod, setPaymentMethod] =
    useState("online");

  const shipping =
    subtotal >= 1999 ? 0 : 99;

  const total =
    subtotal + shipping;

  function updateField(event) {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function placeOrder(event) {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    const orderNumber =
      `DG${Date.now()
        .toString()
        .slice(-8)}`;

    const order = {
      id: orderNumber,
      date: new Date().toISOString(),
      customer: form,
      paymentMethod,
      items: cart,
      subtotal,
      shipping,
      total,
      status: "Order received"
    };

    const previousOrders =
      JSON.parse(
        localStorage.getItem(
          "desiglov_orders"
        ) || "[]"
      );

    localStorage.setItem(
      "desiglov_orders",
      JSON.stringify([
        order,
        ...previousOrders
      ])
    );

    localStorage.setItem(
      "desiglov_last_order",
      JSON.stringify(order)
    );

    clearCart();

    navigate(
      `/order-confirmation/${orderNumber}`
    );
  }

  if (cart.length === 0) {
    return (
      <section className="checkout-empty">
        <Package size={42} />

        <p className="eyebrow">
          DESIGLOV CHECKOUT
        </p>

        <h1>
          Your bag is empty.
        </h1>

        <p>
          Add something you love
          before continuing to checkout.
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
    <section className="checkout-page">

      <div className="checkout-main">

        <Link
          to="/cart"
          className="checkout-back"
        >
          <ArrowLeft size={16} />
          RETURN TO BAG
        </Link>

        <p className="eyebrow">
          SECURE CHECKOUT
        </p>

        <h1>
          Checkout
        </h1>

        <form
          className="checkout-form"
          onSubmit={placeOrder}
        >
          <section className="checkout-form-section">

            <div className="checkout-section-heading">
              <span>
                01
              </span>

              <div>
                <h2>
                  Contact details
                </h2>

                <p>
                  We'll use this for
                  your order updates.
                </p>
              </div>
            </div>

            <div className="checkout-fields">

              <label className="field-full">
                <span>
                  EMAIL ADDRESS
                </span>

                <input
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="you@example.com"
                />
              </label>

              <label>
                <span>
                  FIRST NAME
                </span>

                <input
                  required
                  name="firstName"
                  value={
                    form.firstName
                  }
                  onChange={
                    updateField
                  }
                  placeholder="First name"
                />
              </label>

              <label>
                <span>
                  LAST NAME
                </span>

                <input
                  required
                  name="lastName"
                  value={
                    form.lastName
                  }
                  onChange={
                    updateField
                  }
                  placeholder="Last name"
                />
              </label>

              <label className="field-full">
                <span>
                  PHONE NUMBER
                </span>

                <input
                  required
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  placeholder="+91"
                />
              </label>

            </div>

          </section>

          <section className="checkout-form-section">

            <div className="checkout-section-heading">
              <span>
                02
              </span>

              <div>
                <h2>
                  Delivery address
                </h2>

                <p>
                  Where should we
                  send your order?
                </p>
              </div>
            </div>

            <div className="checkout-fields">

              <label className="field-full">
                <span>
                  ADDRESS LINE 1
                </span>

                <input
                  required
                  name="address1"
                  value={
                    form.address1
                  }
                  onChange={
                    updateField
                  }
                  placeholder="House / Flat / Street"
                />
              </label>

              <label className="field-full">
                <span>
                  ADDRESS LINE 2
                </span>

                <input
                  name="address2"
                  value={
                    form.address2
                  }
                  onChange={
                    updateField
                  }
                  placeholder="Area / Landmark (optional)"
                />
              </label>

              <label>
                <span>
                  CITY
                </span>

                <input
                  required
                  name="city"
                  value={form.city}
                  onChange={updateField}
                  placeholder="City"
                />
              </label>

              <label>
                <span>
                  STATE
                </span>

                <input
                  required
                  name="state"
                  value={form.state}
                  onChange={updateField}
                  placeholder="State"
                />
              </label>

              <label>
                <span>
                  POSTCODE
                </span>

                <input
                  required
                  name="postcode"
                  value={
                    form.postcode
                  }
                  onChange={
                    updateField
                  }
                  placeholder="Postcode"
                />
              </label>

              <label>
                <span>
                  COUNTRY
                </span>

                <select
                  name="country"
                  value={
                    form.country
                  }
                  onChange={
                    updateField
                  }
                >
                  <option>
                    India
                  </option>

                  <option>
                    United Kingdom
                  </option>
                </select>
              </label>

            </div>

          </section>

          <section className="checkout-form-section">

            <div className="checkout-section-heading">
              <span>
                03
              </span>

              <div>
                <h2>
                  Payment
                </h2>

                <p>
                  Choose how you want
                  to pay.
                </p>
              </div>
            </div>

            <div className="payment-options">

              <label
                className={
                  paymentMethod ===
                  "online"
                    ? "payment-option selected"
                    : "payment-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="online"
                  checked={
                    paymentMethod ===
                    "online"
                  }
                  onChange={() =>
                    setPaymentMethod(
                      "online"
                    )
                  }
                />

                <CreditCard
                  size={21}
                />

                <div>
                  <strong>
                    Online payment
                  </strong>

                  <span>
                    UPI, card and
                    supported payment
                    methods.
                  </span>
                </div>

                <Check
                  size={18}
                  className="payment-check"
                />
              </label>

              <label
                className={
                  paymentMethod ===
                  "cod"
                    ? "payment-option selected"
                    : "payment-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={
                    paymentMethod ===
                    "cod"
                  }
                  onChange={() =>
                    setPaymentMethod(
                      "cod"
                    )
                  }
                />

                <Package
                  size={21}
                />

                <div>
                  <strong>
                    Cash on delivery
                  </strong>

                  <span>
                    Availability can
                    later be controlled
                    from admin.
                  </span>
                </div>

                <Check
                  size={18}
                  className="payment-check"
                />
              </label>

            </div>

            {paymentMethod ===
              "online" && (
              <div className="payment-development-note">
                <Lock size={17} />

                <p>
                  This frontend checkout
                  currently records the
                  test order locally.
                  Razorpay/Stripe will
                  replace this section
                  when we connect the
                  backend.
                </p>
              </div>
            )}

          </section>

          <button
            type="submit"
            className="place-order-button"
          >
            PLACE ORDER • ₹{total}
          </button>

          <p className="checkout-agreement">
            By placing your order you
            agree to Desiglov's Terms
            and Privacy Policy.
          </p>

        </form>

      </div>

      <aside className="checkout-summary">

        <p className="eyebrow">
          YOUR ORDER
        </p>

        <h2>
          Order summary
        </h2>

        <div className="checkout-product-list">

          {cart.map((item) => (
            <div
              className="checkout-product"
              key={`${item.id}-${item.size}`}
            >
              <div className="checkout-product-image">
                <img
                  src={item.image}
                  alt={item.name}
                />

                <span>
                  {item.quantity}
                </span>
              </div>

              <div className="checkout-product-info">
                <strong>
                  {item.name}
                </strong>

                <span>
                  {item.category}
                </span>

                {item.size && (
                  <span>
                    Size {item.size}
                  </span>
                )}
              </div>

              <strong className="checkout-product-price">
                ₹
                {item.price *
                  item.quantity}
              </strong>
            </div>
          ))}

        </div>

        <div className="checkout-summary-lines">

          <div>
            <span>
              Subtotal
            </span>

            <strong>
              ₹{subtotal}
            </strong>
          </div>

          <div>
            <span>
              Shipping
            </span>

            <strong>
              {shipping === 0
                ? "FREE"
                : `₹${shipping}`}
            </strong>
          </div>

          <div className="checkout-summary-total">
            <span>
              Total
            </span>

            <strong>
              ₹{total}
            </strong>
          </div>

        </div>

        <div className="checkout-trust">
          <Lock size={18} />

          <div>
            <strong>
              Secure checkout
            </strong>

            <span>
              Your order information
              is handled securely.
            </span>
          </div>
        </div>

        <div className="checkout-trust">
          <MapPin size={18} />

          <div>
            <strong>
              Delivery tracking
            </strong>

            <span>
              Order tracking will be
              added with the backend.
            </span>
          </div>
        </div>

      </aside>

    </section>
  );
}
