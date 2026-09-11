import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function Addresses() {
  return (
    <section className="account-subpage">

      <p className="eyebrow">
        MY ACCOUNT
      </p>

      <h1>
        Addresses
      </h1>

      <div className="address-placeholder">

        <MapPin size={33} />

        <h2>
          No saved addresses.
        </h2>

        <p>
          Saved delivery addresses
          will appear here once
          customer accounts are
          connected to the backend.
        </p>

        <button className="button-dark">
          ADD ADDRESS
        </button>

      </div>

      <Link
        to="/account"
        className="account-return"
      >
        ← BACK TO ACCOUNT
      </Link>

    </section>
  );
}
