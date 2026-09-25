import { Link } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  UserRound
} from "lucide-react";

export default function Navbar() {
  return (
    <>
      <div className="announcement">
        DesiGlov • CURATED FASHION & JEWELLERY
      </div>

      <header className="navbar">
        <Link to="/" className="logo">
          DesiGlov
        </Link>

        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/shop?category=Kurtis">Kurtis</Link>
          <Link to="/shop?category=Short%20Tops">Short Tops</Link>
          <Link to="/shop?category=Coord%20Sets">Coord Sets</Link>
          <Link to="/shop?category=3%20Piece%20Sets">3 Piece Sets</Link>
          <Link to="/shop?category=Jewellery">Jewellery</Link>
        </nav>

        <div className="nav-icons">
          <Link to="/search">
            <Search size={20} />
          </Link>

          <Link to="/wishlist">
            <Heart size={20} />
          </Link>

          <Link to="/account">
            <UserRound size={20} />
          </Link>

          <Link to="/cart">
            <ShoppingBag size={20} />
          </Link>
        </div>
      </header>
    </>
  );
}
