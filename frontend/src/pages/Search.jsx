import {
  Search as SearchIcon,
  X
} from "lucide-react";

import { useState } from "react";

import ProductCard from "../components/ProductCard";
import { products } from "../data/products";

export default function Search() {
  const [query, setQuery] =
    useState("");

  const cleanQuery =
    query.trim().toLowerCase();

  const results =
    cleanQuery.length === 0
      ? []
      : products.filter(
          (product) =>
            [
              product.name,
              product.category,
              product.parentCategory,
              product.colour,
              product.material,
              product.description
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(cleanQuery)
        );

  return (
    <section className="search-page">

      <div className="search-title">
        <p className="eyebrow">
          FIND YOUR STYLE
        </p>

        <h1>
          Search Desiglov
        </h1>

        <p>
          Search clothing,
          collections and jewellery.
        </p>
      </div>

      <div className="search-bar-large">

        <SearchIcon size={24} />

        <input
          autoFocus
          type="text"
          value={query}
          onChange={(event) =>
            setQuery(
              event.target.value
            )
          }
          placeholder="Try 'Neelam', 'Coord Sets' or 'Earrings'"
        />

        {query && (
          <button
            onClick={() =>
              setQuery("")
            }
            aria-label="Clear search"
          >
            <X size={20} />
          </button>
        )}

      </div>

      {cleanQuery && (
        <div className="search-result-header">
          <span>
            {results.length}{" "}
            {results.length === 1
              ? "RESULT"
              : "RESULTS"}
          </span>

          <span>
            FOR "{query}"
          </span>
        </div>
      )}

      {results.length > 0 && (
        <div className="product-grid">
          {results.map(
            (product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            )
          )}
        </div>
      )}

      {cleanQuery &&
        results.length === 0 && (
          <div className="search-empty">
            <h2>
              Nothing matched.
            </h2>

            <p>
              Try searching for another
              product or collection.
            </p>
          </div>
        )}

      {!cleanQuery && (
        <div className="search-suggestions">

          <p>
            POPULAR SEARCHES
          </p>

          <div>
            {[
              "Kurtis",
              "Coord Sets",
              "Earrings",
              "Neelam",
              "Jewellery"
            ].map((item) => (
              <button
                key={item}
                onClick={() =>
                  setQuery(item)
                }
              >
                {item}
              </button>
            ))}
          </div>

        </div>
      )}

    </section>
  );
}
