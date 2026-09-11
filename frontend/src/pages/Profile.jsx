import { Link } from "react-router-dom";

export default function Profile() {
  let customer = {};

  try {
    customer = JSON.parse(
      localStorage.getItem(
        "desiglov_customer"
      )
    ) || {};
  } catch {
    customer = {};
  }

  return (
    <section className="account-subpage">

      <p className="eyebrow">
        MY ACCOUNT
      </p>

      <h1>
        Profile
      </h1>

      <div className="profile-card">

        <div>
          <span>
            NAME
          </span>

          <strong>
            {
              [
                customer.firstName,
                customer.lastName
              ]
                .filter(Boolean)
                .join(" ") ||
              "Not provided"
            }
          </strong>
        </div>

        <div>
          <span>
            EMAIL
          </span>

          <strong>
            {
              customer.email ||
              "Not provided"
            }
          </strong>
        </div>

        <div>
          <span>
            PHONE
          </span>

          <strong>
            {
              customer.phone ||
              "Not provided"
            }
          </strong>
        </div>

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
