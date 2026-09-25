import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div>
        <h2>DesiGlov</h2>
        <p>
          Curated fashion and jewellery for effortless everyday style.
        </p>
      </div>

      <div>
        <h4>SHOP</h4>
        <Link to="/shop?category=Kurtis">Kurtis</Link>
        <Link to="/shop?category=Short%20Tops">Short Tops</Link>
        <Link to="/shop?category=Coord%20Sets">Coord Sets</Link>
        <Link to="/shop?category=Jewellery">Jewellery</Link>
      </div>

      <div>
        <h4>HELP</h4>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/account">Account</Link>
      </div>

      <div>
        <h4>FOLLOW</h4>
        <a
          href="https://www.instagram.com/itz_desiglov/"
          target="_blank"
          rel="noreferrer"
        >
          Instagram
        </a>
      </div>
    </footer>
  );
}
