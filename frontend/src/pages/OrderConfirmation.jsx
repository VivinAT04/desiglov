import {
  Check,
  Package,
  ArrowRight
} from "lucide-react";

import {
  Link,
  useParams
} from "react-router-dom";

export default function OrderConfirmation() {
  const { id } = useParams();

  let order = null;

  try {
    order = JSON.parse(
      localStorage.getItem(
        "desiglov_last_order"
      )
    );
  } catch {
    order = null;
  }

  return (
    <section className="confirmation-page">

      <div className="confirmation-icon">
        <Check size={34} />
      </div>

      <p className="eyebrow">
        ORDER CONFIRMED
      </p>

      <h1>
        Thank you.
      </h1>

      <p className="confirmation-intro">
        Your Desiglov order has been
        received successfully.
      </p>

      <div className="confirmation-number">
        <span>
          ORDER NUMBER
        </span>

        <strong>
          {id}
        </strong>
      </div>

      {order && (
        <div className="confirmation-card">

          <div className="confirmation-card-heading">
            <Package size={21} />

            <div>
              <strong>
                Order summary
              </strong>

              <span>
                {
                  order.items.length
                }{" "}
                {
                  order.items.length ===
                  1
                    ? "item"
                    : "items"
                }
              </span>
            </div>
          </div>

          {order.items.map(
            (item) => (
              <div
                className="confirmation-product"
                key={`${item.id}-${item.size}`}
              >
                <img
                  src={item.image}
                  alt={item.name}
                />

                <div>
                  <strong>
                    {item.name}
                  </strong>

                  <span>
                    Qty{" "}
                    {item.quantity}
                    {item.size
                      ? ` • Size ${item.size}`
                      : ""}
                  </span>
                </div>

                <strong>
                  ₹
                  {item.price *
                    item.quantity}
                </strong>
              </div>
            )
          )}

          <div className="confirmation-total">
            <span>
              TOTAL
            </span>

            <strong>
              ₹{order.total}
            </strong>
          </div>

        </div>
      )}

      <p className="confirmation-message">
        Once we connect the live backend,
        customers will receive confirmation,
        payment and delivery updates by
        email or WhatsApp.
      </p>

      <div className="confirmation-actions">

        <Link
          to="/shop"
          className="button-dark"
        >
          CONTINUE SHOPPING
        </Link>

        <Link
          to="/account/orders"
          className="confirmation-order-link"
        >
          VIEW MY ORDERS
          <ArrowRight size={16} />
        </Link>

      </div>

    </section>
  );
}
