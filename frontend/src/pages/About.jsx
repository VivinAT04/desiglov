import { Link } from "react-router-dom";

export default function About() {
  return (
    <>
      <section className="about-hero">

        <p className="eyebrow">
          THE DesiGlov STORY
        </p>

        <h1>
          Style should feel
          like you.
        </h1>

        <p>
          DesiGlov is built around
          discovering expressive,
          wearable pieces that make
          everyday styling feel easy.
        </p>

      </section>

      <section className="about-story">

        <div className="about-image">
          <img
            src="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1300&q=90"
            alt="DesiGlov collection"
          />
        </div>

        <div className="about-copy">

          <p className="eyebrow">
            OUR APPROACH
          </p>

          <h2>
            Curated.
            <br />
            Expressive.
            <br />
            Effortless.
          </h2>

          <p>
            From clothing to jewellery,
            every DesiGlov collection is
            intended to help customers
            discover pieces that feel
            personal.
          </p>

          <p>
            We are building a fashion
            destination focused on
            thoughtful selection,
            approachable styling and
            pieces you'll want to wear
            again.
          </p>

          <Link
            to="/shop"
            className="button-dark"
          >
            SHOP DesiGlov
          </Link>

        </div>

      </section>
    </>
  );
}
