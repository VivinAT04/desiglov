import {
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Truck
} from "lucide-react";

import { useState } from "react";

import {
  Link,
  useParams
} from "react-router-dom";

import { products } from "../data/products";
import ProductCard from "../components/ProductCard";

export default function Product() {
  const { id } = useParams();

  const product = products.find(
    (item) => item.id === id
  );

  const [quantity, setQuantity] = useState(1);

  const [selectedSize, setSelectedSize] =
    useState(product?.sizes?.[0] || null);

  if (!product) {
    return (
      <section className="product-not-found">

        <p className="eyebrow">
          DESIGLOV
        </p>

        <h1>
          Product not found.
        </h1>

        <Link
          className="button-dark"
          to="/shop"
        >
          RETURN TO SHOP
        </Link>

      </section>
    );
  }

  const discount = Math.round(
    ((product.originalPrice - product.price) /
      product.originalPrice) *
      100
  );

  const relatedProducts = products
    .filter(
      (item) =>
        item.id !== product.id &&
        (
          item.category === product.category ||
          (
            product.parentCategory &&
            item.parentCategory ===
              product.parentCategory
          )
        )
    )
    .slice(0, 4);

  return (
    <>
      <section className="product-detail-page">

        <div className="product-gallery">

          <div className="main-product-image">

            {product.badge && (
              <span className="detail-badge">
                {product.badge}
              </span>
            )}

            <img
              src={product.image}
              alt={product.name}
            />

          </div>

        </div>

        <div className="product-details">

          <div className="product-breadcrumb">

            <Link to="/">
              HOME
            </Link>

            <span>/</span>

            <Link to="/shop">
              SHOP
            </Link>

            <span>/</span>

            <span>
              {product.category.toUpperCase()}
            </span>

          </div>

          <p className="eyebrow">
            {product.category}
          </p>

          <h1>
            {product.name}
          </h1>

          <div className="detail-prices">

            <strong>
              ₹{product.price}
            </strong>

            <span className="detail-original-price">
              ₹{product.originalPrice}
            </span>

            <span className="discount-label">
              {discount}% OFF
            </span>

          </div>

          <p className="tax-text">
            Inclusive of all taxes
          </p>

          <p className="detail-description">
            {product.description}
          </p>

          <div className="product-divider" />

          {product.sizes.length > 0 && (
            <div className="product-option">

              <div className="option-heading">

                <strong>
                  SELECT SIZE
                </strong>

                <button>
                  SIZE GUIDE
                </button>

              </div>

              <div className="size-list">

                {product.sizes.map((size) => (
                  <button
                    key={size}
                    className={
                      selectedSize === size
                        ? "size-option selected"
                        : "size-option"
                    }
                    onClick={() =>
                      setSelectedSize(size)
                    }
                  >
                    {size}
                  </button>
                ))}

              </div>

            </div>
          )}

          <div className="product-meta-grid">

            <div>
              <span>COLOUR</span>
              <strong>
                {product.colour}
              </strong>
            </div>

            <div>
              <span>MATERIAL</span>
              <strong>
                {product.material}
              </strong>
            </div>

            <div>
              <span>STOCK</span>

              <strong
                className={
                  product.stock > 5
                    ? "stock-good"
                    : "stock-low"
                }
              >
                {product.stock > 0
                  ? `${product.stock} available`
                  : "Out of stock"}
              </strong>
            </div>

          </div>

          <div className="purchase-row">

            <div className="quantity-selector">

              <button
                onClick={() =>
                  setQuantity(
                    Math.max(
                      1,
                      quantity - 1
                    )
                  )
                }
              >
                <Minus size={16} />
              </button>

              <span>
                {quantity}
              </span>

              <button
                onClick={() =>
                  setQuantity(
                    quantity + 1
                  )
                }
              >
                <Plus size={16} />
              </button>

            </div>

            <button className="add-bag-button">

              <ShoppingBag size={18} />

              ADD TO BAG

            </button>

            <button className="detail-heart">

              <Heart size={20} />

            </button>

          </div>

          <div className="delivery-note">

            <Truck size={20} />

            <div>
              <strong>
                Delivery information
              </strong>

              <span>
                Shipping calculated at checkout.
              </span>
            </div>

          </div>

          <div className="detail-accordions">

            <details open>

              <summary>
                PRODUCT DETAILS
              </summary>

              <p>
                {product.description}
              </p>

              <p>
                Colour: {product.colour}
              </p>

              <p>
                Material: {product.material}
              </p>

            </details>

            <details>

              <summary>
                CARE INSTRUCTIONS
              </summary>

              <p>
                Follow the care instructions
                provided with your Desiglov
                product for best results.
              </p>

            </details>

            <details>

              <summary>
                SHIPPING & RETURNS
              </summary>

              <p>
                Full shipping and returns
                information will be connected
                before the store launches.
              </p>

            </details>

          </div>

        </div>

      </section>

      {relatedProducts.length > 0 && (
        <section className="related-section">

          <div className="related-heading">

            <p className="eyebrow">
              KEEP DISCOVERING
            </p>

            <h2>
              You may also like
            </h2>

          </div>

          <div className="product-grid">

            {relatedProducts.map(
              (related) => (
                <ProductCard
                  key={related.id}
                  product={related}
                />
              )
            )}

          </div>

        </section>
      )}

    </>
  );
}
