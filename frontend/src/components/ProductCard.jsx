import { Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  return (
    <article className="product-card">

      <div className="product-image-wrap">

        {product.badge && (
          <span className="product-badge">
            {product.badge}
          </span>
        )}

        <button
          className="product-heart"
          aria-label="Add to wishlist"
        >
          <Heart size={18} />
        </button>

        <Link to={`/product/${product.id}`}>
          <img
            src={product.image}
            alt={product.name}
            className="product-image"
          />
        </Link>

        <Link
          to={`/product/${product.id}`}
          className="quick-view"
        >
          <ShoppingBag size={16} />
          VIEW PRODUCT
        </Link>

      </div>

      <div className="product-info">

        <p className="product-category">
          {product.category}
        </p>

        <Link to={`/product/${product.id}`}>
          <h3>{product.name}</h3>
        </Link>

        <div className="product-prices">

          <span className="current-price">
            ₹{product.price}
          </span>

          {product.originalPrice && (
            <span className="original-price">
              ₹{product.originalPrice}
            </span>
          )}

        </div>

      </div>

    </article>
  );
}
