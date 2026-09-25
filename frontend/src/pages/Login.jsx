import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Login() {
  const navigate =
    useNavigate();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  function handleLogin(event) {
    event.preventDefault();

    localStorage.setItem(
      "desiglov_customer",
      JSON.stringify({
        email,
        loggedIn: true
      })
    );

    navigate("/account");
  }

  return (
    <section className="auth-page">

      <div className="auth-intro">
        <p className="eyebrow">
          WELCOME BACK
        </p>

        <h1>
          Your DesiGlov.
        </h1>

        <p>
          Sign in to view orders,
          addresses and saved pieces.
        </p>
      </div>

      <form
        className="auth-form"
        onSubmit={handleLogin}
      >
        <h2>
          Sign in
        </h2>

        <label>
          <span>
            EMAIL
          </span>

          <input
            required
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="Email address"
          />
        </label>

        <label>
          <span>
            PASSWORD
          </span>

          <input
            required
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Password"
          />
        </label>

        <button
          type="submit"
          className="auth-submit"
        >
          SIGN IN
          <ArrowRight size={17} />
        </button>

        <p className="auth-switch">
          New to DesiGlov?{" "}
          <Link to="/register">
            Create account
          </Link>
        </p>

        <p className="development-login-note">
          Authentication is currently
          local for development and will
          move to the backend later.
        </p>

      </form>

    </section>
  );
}
