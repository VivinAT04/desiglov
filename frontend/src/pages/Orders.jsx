import { Package } from "lucide-react";
import { Link } from "react-router-dom";

export default function Orders() {
  let orders = [];

  try {
    orders =
      JSON.parse(
        localStorage.getItem(
          "desiglov_orders"
        )
      ) || [];
  } catch {
    orders = [];
  }

  return (
    <section className="account-subpage">

      <p className="eyebrow">
        MY ACCOUNT
      </p>

      <h1>
        My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="orders-empty">
          <Package size={35} />

          <h2>
            No orders yet.
          </h2>

          <p>
            Your DesiGlov orders
            will appear here.
          </p>

          <Link
            to="/shop"
            className="button-dark"
          >
            START SHOPPING
          </Link>
        </div>
      ) : (
        <div className="orders-list">

          {orders.map((order) => (
            <article
              className="order-card"
              key={order.id}
            >
              <div className="order-card-top">

                <div>
                  <span>
                    ORDER
                  </span>

                  <strong>
                    {order.id}
                  </strong>
                </div>

                <div>
                  <span>
                    TOTAL
                  </span>

                  <strong>
                    ₹{order.total}
                  </strong>
                </div>

                <div>
                  <span>
                    STATUS
                  </span>

                  <strong className="order-status">
                    {order.status}
                  </strong>
                </div>

              </div>

              <div className="order-products">

                {order.items.map(
                  (item) => (
                    <div
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
                        </span>
                      </div>
                    </div>
                  )
                )}

              </div>

            </article>
          ))}

        </div>
      )}

      <Link
        to="/account"
        className="account-return"
      >
        ← BACK TO ACCOUNT
      </Link>

    </section>
  );
}
