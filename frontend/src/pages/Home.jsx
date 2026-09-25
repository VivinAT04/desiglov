import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">DESIGNED TO BE DISCOVERED</p>

          <h1>
            Style that feels
            <br />
            effortlessly yours.
          </h1>

          <p className="hero-text">
            Discover curated clothing and jewellery designed for
            everyday confidence.
          </p>

          <Link to="/shop" className="button-dark">
            SHOP COLLECTION
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <p>EXPLORE DesiGlov</p>
          <h2>Shop by Category</h2>
        </div>

        <div className="category-grid">
          <Link to="/shop?category=Kurtis" className="category-card">
            <span>Kurtis</span>
          </Link>

          <Link
            to="/shop?category=Short%20Tops"
            className="category-card"
          >
            <span>Short Tops</span>
          </Link>

          <Link
            to="/shop?category=Coord%20Sets"
            className="category-card"
          >
            <span>Coord Sets</span>
          </Link>

          <Link
            to="/shop?category=3%20Piece%20Sets"
            className="category-card"
          >
            <span>3 Piece Sets</span>
          </Link>

          <Link
            to="/shop?category=Jewellery"
            className="category-card"
          >
            <span>Jewellery</span>
          </Link>
        </div>
      </section>
    </>
  );
}
