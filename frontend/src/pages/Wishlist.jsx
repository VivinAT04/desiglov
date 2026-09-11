import {
  Heart
} from "lucide-react";

import {
  Link
} from "react-router-dom";

import ProductCard from "../components/ProductCard";

import {
  useWishlist
} from "../context/WishlistContext";

export default function Wishlist() {
  const {
    wishlist
  } = useWishlist();

  if (
    wishlist.length === 0
  ) {
    return (
      <section className="wishlist-empty">

        <div className="wishlist-empty-icon">
          <Heart
            size={30}
          />
        </div>

        <p className="eyebrow">
          YOUR FAVOURITES
        </p>

        <h1>
          Your wishlist is empty.
        </h1>

        <p>
          Save pieces you love
          and come back to them
          whenever you want.
        </p>

        <Link
          to="/shop"
          className="button-dark"
        >
          DISCOVER DESIGLOV
        </Link>

      </section>
    );
  }

  return (
    <section className="wishlist-page">

      <div className="wishlist-heading">

        <p className="eyebrow">
          SAVED FOR LATER
        </p>

        <h1>
          Your Wishlist
        </h1>

        <p>
          {wishlist.length}{" "}
          {wishlist.length === 1
            ? "piece"
            : "pieces"}{" "}
          saved.
        </p>

      </div>

      <div className="product-grid">

        {wishlist.map(
          (product) => (
            <ProductCard
              key={
                product.id
              }
              product={
                product
              }
            />
          )
        )}

      </div>

    </section>
  );
}
