import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Register() {
  const navigate =
    useNavigate();

  const [form, setForm] =
    useState({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: ""
    });

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]:
        event.target.value
    });
  }

  function handleRegister(event) {
    event.preventDefault();

    const customer = {
      ...form,
      loggedIn: true
    };

    localStorage.setItem(
      "desiglov_customer",
      JSON.stringify(customer)
    );

    navigate("/account");
  }

  return (
    <section className="auth-page">

      <div className="auth-intro">
        <p className="eyebrow">
          JOIN DESIGLOV
        </p>

        <h1>
          Make it yours.
        </h1>

        <p>
          Create your account for a
          smoother Desiglov experience.
        </p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleRegister}
      >
        <h2>
          Create account
        </h2>

        <div className="auth-two-column">

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
            />
          </label>

        </div>

        <label>
          <span>
            EMAIL
          </span>

          <input
            required
            type="email"
            name="email"
            value={form.email}
            onChange={updateField}
          />
        </label>

        <label>
          <span>
            PHONE
          </span>

          <input
            required
            name="phone"
            value={form.phone}
            onChange={updateField}
          />
        </label>

        <label>
          <span>
            PASSWORD
          </span>

          <input
            required
            minLength="6"
            type="password"
            name="password"
            value={
              form.password
            }
            onChange={
              updateField
            }
          />
        </label>

        <button
          className="auth-submit"
          type="submit"
        >
          CREATE ACCOUNT
          <ArrowRight size={17} />
        </button>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">
            Sign in
          </Link>
        </p>

      </form>

    </section>
  );
}
