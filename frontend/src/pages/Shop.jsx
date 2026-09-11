import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import { products } from "../data/products";

export default function Shop() {
  const [searchParams] = useSearchParams();

  const selectedCategory =
    searchParams.get("category") || "All";

  const [sort, setSort] = useState("featured");

  const categories = [
    "All",
    "Kurtis",
    "Short Tops",
    "Coord Sets",
    "3 Piece Sets",
    "Jewellery",
    "Earrings",
    "Chains",
    "Bracelets"
  ];

  const displayedProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== "All") {
      if (selectedCategory === "Jewellery") {
        result = result.filter(
          (product) =>
            product.parentCategory === "Jewellery"
        );
      } else {
        result = result.filter(
          (product) =>
            product.category === selectedCategory
        );
      }
    }

    if (sort === "low") {
      result.sort((a, b) => a.price - b.price);
    }

    if (sort === "high") {
      result.sort((a, b) => b.price - a.price);
    }

    if (sort === "name") {
      result.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    }

    return result;
  }, [selectedCategory, sort]);

  return (
    <>
      <section className="shop-hero">

        <p className="eyebrow">
          DESIGLOV COLLECTION
        </p>

        <h1>
          {selectedCategory === "All"
            ? "Shop All"
            : selectedCategory}
        </h1>

        <p>
          Pieces curated for effortless,
          expressive everyday styling.
        </p>

      </section>

      <section className="shop-container">

        <div className="shop-toolbar">

          <div className="category-filters">

            {categories.map((category) => (
              <Link
                key={category}
                className={
                  selectedCategory === category
                    ? "category-filter active"
                    : "category-filter"
                }
                to={
                  category === "All"
                    ? "/shop"
                    : `/shop?category=${encodeURIComponent(
                        category
                      )}`
                }
              >
                {category}
              </Link>
            ))}

          </div>

          <select
            className="sort-select"
            value={sort}
            onChange={(event) =>
              setSort(event.target.value)
            }
          >
            <option value="featured">
              Featured
            </option>

            <option value="low">
              Price: Low to High
            </option>

            <option value="high">
              Price: High to Low
            </option>

            <option value="name">
              Name: A-Z
            </option>
          </select>

        </div>

        <div className="shop-info">

          <span>
            {displayedProducts.length} PRODUCTS
          </span>

        </div>

        <div className="product-grid">

          {displayedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}

        </div>

        {displayedProducts.length === 0 && (
          <div className="empty-shop">

            <h2>No products found.</h2>

            <p>
              Try another Desiglov collection.
            </p>

            <Link
              to="/shop"
              className="button-dark"
            >
              VIEW ALL PRODUCTS
            </Link>

          </div>
        )}

      </section>
    </>
  );
}
