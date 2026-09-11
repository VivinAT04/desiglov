import {
  Heart,
  LogIn,
  LogOut,
  MapPin,
  Package,
  UserRound
} from "lucide-react";

import {
  Link,
  useNavigate
} from "react-router-dom";

export default function Account() {
  const navigate =
    useNavigate();

  let customer = null;

  try {
    customer = JSON.parse(
      localStorage.getItem(
        "desiglov_customer"
      )
    );
  } catch {
    customer = null;
  }

  function logout() {
    localStorage.removeItem(
      "desiglov_customer"
    );

    navigate("/login");
  }

  if (!customer?.loggedIn) {
    return (
      <section className="account-guest">

        <UserRound size={45} />

        <p className="eyebrow">
          DESIGLOV ACCOUNT
        </p>

        <h1>
          Welcome.
        </h1>

        <p>
          Sign in to access your
          orders, profile and saved
          delivery information.
        </p>

        <div className="account-guest-actions">

          <Link
            to="/login"
            className="button-dark"
          >
            <LogIn size={16} />
            SIGN IN
          </Link>

          <Link
            to="/register"
            className="button-outline"
          >
            CREATE ACCOUNT
          </Link>

        </div>

      </section>
    );
  }

  return (
    <section className="account-page">

      <div className="account-heading">

        <div>
          <p className="eyebrow">
            MY DESIGLOV
          </p>

          <h1>
            Welcome
            {customer.firstName
              ? `, ${customer.firstName}`
              : ""}
            .
          </h1>

          <p>
            {customer.email}
          </p>
        </div>

        <button
          className="account-logout"
          onClick={logout}
        >
          <LogOut size={16} />
          SIGN OUT
        </button>

      </div>

      <div className="account-grid">

        <Link
          to="/account/profile"
          className="account-card"
        >
          <UserRound size={26} />

          <h2>
            Profile
          </h2>

          <p>
            View and manage your
            personal information.
          </p>

          <span>
            MANAGE PROFILE →
          </span>
        </Link>

        <Link
          to="/account/orders"
          className="account-card"
        >
          <Package size={26} />

          <h2>
            My Orders
          </h2>

          <p>
            View your recent
            Desiglov orders.
          </p>

          <span>
            VIEW ORDERS →
          </span>
        </Link>

        <Link
          to="/account/addresses"
          className="account-card"
        >
          <MapPin size={26} />

          <h2>
            Addresses
          </h2>

          <p>
            Manage your delivery
            addresses.
          </p>

          <span>
            VIEW ADDRESSES →
          </span>
        </Link>

        <Link
          to="/wishlist"
          className="account-card"
        >
          <Heart size={26} />

          <h2>
            Wishlist
          </h2>

          <p>
            Return to the pieces
            you've saved.
          </p>

          <span>
            VIEW WISHLIST →
          </span>
        </Link>

      </div>

    </section>
  );
}
