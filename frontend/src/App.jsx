import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  authApi,
  addressApi,
  orderApi,
  adminApi,
  productApi,
  feedbackApi,
  reviewApi
} from "./api.js";

import { supabase } from "./lib/supabase.js";

const FALLBACK_PRODUCTS = [
  {
    id: 1,
    slug: "neelam",
    name: "Neelam",
    category: "Kurtis",
    priceINR: 599,
    badge: "NEW",
    colour: "Peacock Blue",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    stock: 10,
    material: "Kalamkari detailed fabric",
    description:
      "Peacock blue long kurti finished with contrasting mustard Kalamkari detailing, delicate lace work, practical pockets and full sleeves.",
    images: [
      "/products/neelam/1.jpg",
      "/products/neelam/2.jpg",
    ],
  },

  {
    id: 2,
    slug: "moonlight",
    name: "Moonlight",
    category: "Kurtis",
    priceINR: 669,
    badge: "SIGNATURE",
    colour: "Black & White",
    sizes: ["XS", "S", "M", "L"],
    stock: 10,
    material: "Comfort fabric",
    description:
      "A striking black-and-white kurti featuring a high-neck front pattern and an elegant oval back detail.",
    images: [
      "/products/moonlight/1.jpg",
      "/products/moonlight/2.jpg",
      "/products/moonlight/3.jpg",
      "/products/moonlight/4.jpg",
    ],
  },

  {
    id: 3,
    slug: "grape",
    name: "Grape",
    category: "Coord Sets",
    priceINR: 719,
    badge: "LIMITED",
    colour: "Lavender",
    sizes: ["M", "L", "XL"],
    stock: 5,
    material: "Comfort blend",
    description:
      "A soft lavender coord set with flowing palazzo pants, practical pockets, three-quarter sleeves and adjustable knot detailing.",
    images: [
      "/products/grape/1.jpg",
      "/products/grape/2.jpg",
    ],
  },

  {
    id: 4,
    slug: "chocolate",
    name: "Chocolate",
    category: "Coord Sets",
    priceINR: 799,
    badge: "LIMITED",
    colour: "Brown",
    sizes: ["M", "L", "XL"],
    stock: 3,
    material: "Comfort blend",
    description:
      "An earthy brown coord set with palazzo pants, practical pockets, short sleeves and adjustable knot detailing.",
    images: [
      "/products/chocolate/1.jpg",
    ],
  },

  {
    id: 5,
    slug: "softrose",
    name: "Softrose",
    category: "Coord Sets",
    priceINR: 799,
    badge: "NEW",
    colour: "Pink",
    sizes: ["M", "L", "XL", "XXL"],
    stock: 7,
    material: "Comfort blend",
    description:
      "A feminine pink side-close coord set paired with palazzo pants, pockets, three-quarter sleeves and adjustable knot detailing.",
    images: [
      "/products/softrose/1.jpg",
    ],
  },

  {
    id: 6,
    slug: "ivorybloom",
    name: "Ivorybloom",
    category: "3 Piece Sets",
    priceINR: 849,
    badge: "BESTSELLER",
    colour: "Ivory",
    sizes: ["M", "L", "XL", "XXL"],
    stock: 6,
    material: "Cotton blend with Zardosi bead work",
    description:
      "An elegant white three-piece ensemble with straight-fit pants and shawl, finished with intricate Zardosi bead work.",
    images: [
      "/products/ivorybloom/1.jpg",
      "/products/ivorybloom/2.jpg",
    ],
  },

  {
    id: 7,
    slug: "mulchanderi",
    name: "Mulchanderi",
    category: "3 Piece Sets",
    priceINR: 1200,
    badge: "PREMIUM",
    colour: "Mustard",
    sizes: ["M", "L", "XL"],
    stock: 3,
    material: "Space Silk",
    description:
      "A rich mustard Space Silk Anarkali set paired with a contrasting green cotton shawl and straight-fit trousers.",
    images: [
      "/products/mulchanderi/1.jpg",
    ],
  },

  {
    id: 8,
    slug: "hoops-and-gems",
    name: "Hoops & Gems",
    category: "Jewellery",
    subcategory: "Earrings",
    priceINR: 229,
    badge: "TRENDING",
    colour: "Gold",
    sizes: ["ONE SIZE"],
    stock: 10,
    material: "Anti-tarnish jewellery",
    description:
      "A contemporary anti-tarnish earring design made for effortless everyday styling.",
    images: [
      "/products/hoops-gems/1.png",
      "/products/hoops-gems/2.png",
    ],
  },

  {
    id: 9,
    slug: "tri-heart",
    name: "Tri Heart",
    category: "Jewellery",
    subcategory: "Earrings",
    priceINR: 299,
    badge: "NEW",
    colour: "Gold",
    sizes: ["ONE SIZE"],
    stock: 10,
    material: "Anti-tarnish jewellery",
    description:
      "A playful anti-tarnish heart design created to add a distinctive finishing touch to your everyday look.",
    images: [
      "/products/tri-heart/1.png",
      "/products/tri-heart/2.png",
      "/products/tri-heart/3.png",
    ],
  },

  {
    id: 10,
    slug: "spikes",
    name: "Spikes",
    category: "Jewellery",
    subcategory: "Earrings",
    priceINR: 479,
    badge: "STATEMENT",
    colour: "Gold",
    sizes: ["ONE SIZE"],
    stock: 10,
    material: "Anti-tarnish jewellery",
    description:
      "A bold anti-tarnish statement piece for styling beyond the ordinary.",
    images: [
      "/products/spikes/1.jpg",
    ],
  },
];


const CLOTHING_CATEGORIES = [
  "Kurtis",
  "Short Tops",
  "Coord Sets",
  "3 Piece Sets",
  "Anarkali Sets",
];

const CLOTHING_SEARCH_TERMS = [
  "dress",
  "dresses",
  "clothes",
  "clothing",
  "outfit",
  "outfits",
  "wear",
  "womens wear",
  "women's wear",
];

function isClothingSearch(value) {
  const query = String(value || "")
    .trim()
    .toLowerCase();

  return CLOTHING_SEARCH_TERMS.includes(query);
}

function productMatchesSearch(product, value) {
  const query = String(value || "")
    .trim()
    .toLowerCase();

  if (!query) {
    return false;
  }

  const searchableText = [
    product?.name,
    product?.category,
    product?.colour,
    product?.material,
    product?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
}


const CATEGORIES = [
  "Kurtis",
  "Short Tops",
  "Coord Sets",
  "3 Piece Sets",
  "Anarkali Sets",
  "Jewellery",
];

const COUNTRIES = {
  IN: {
    flag: "🇮🇳",
    name: "India",
    currency: "INR",
    symbol: "₹",
    rate: 1,
    freeShipping: 2999,
  },

  GB: {
    flag: "🇬🇧",
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    rate: 0.0087,
    freeShipping: 60,
  },

  US: {
    flag: "🇺🇸",
    name: "United States",
    currency: "USD",
    symbol: "$",
    rate: 0.0117,
    freeShipping: 75,
  },

  AE: {
    flag: "🇦🇪",
    name: "UAE",
    currency: "AED",
    symbol: "AED ",
    rate: 0.043,
    freeShipping: 275,
  },
};

function formatMoney(value, countryCode) {
  const country =
    COUNTRIES[countryCode] ||
    COUNTRIES.IN;

  const converted =
    value * country.rate;

  const decimals =
    countryCode === "IN"
      ? 0
      : 2;

  return `${country.symbol}${converted.toLocaleString(
    undefined,
    {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }
  )}`;
}

function currentRoute() {
  return (
    window.location.pathname +
    window.location.search
  );
}

function safeRead(key, fallback) {
  try {
    const result =
      JSON.parse(
        localStorage.getItem(key)
      );

    return result ?? fallback;
  } catch {
    return fallback;
  }
}

function App() {

  const [products, setProducts] =
    useState(
      FALLBACK_PRODUCTS
    );

  const [catalogueLoading, setCatalogueLoading] =
    useState(true);


  const [route, setRoute] =
    useState(currentRoute());

  const [country, setCountry] =
    useState(
      localStorage.getItem(
        "desiglov-country"
      ) || "IN"
    );

  const [countryOpen, setCountryOpen] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [searchOpen, setSearchOpen] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [cartOpen, setCartOpen] =
    useState(false);

  const [wishlist, setWishlist] =
    useState(() =>
      safeRead(
        "desiglov-wishlist",
        []
      )
    );

  const [cart, setCart] =
    useState(() =>
      safeRead(
        "desiglov-cart",
        []
      )
    );

  const [toast, setToast] =
    useState("");

  useEffect(() => {

    let active = true;


    async function loadProducts() {

      try {

        const result =
          await productApi.list();


        if (!active) {
          return;
        }


        if (
          Array.isArray(
            result.products
          )
        ) {

          setProducts(
            result.products.map(
              (product) => ({
                ...product,

                sizes:
                  Array.isArray(
                    product.sizes
                  )
                    ? product.sizes
                    : [],

                images:
                  Array.isArray(
                    product.images
                  ) &&
                  product.images.length > 0
                    ? product.images
                    : [],
              })
            )
          );
        }

      } catch (error) {

        console.warn(
          "Could not load database catalogue. Using fallback products.",
          error
        );

      } finally {

        if (active) {

          setCatalogueLoading(
            false
          );
        }
      }
    }


    loadProducts();


    return () => {

      active = false;
    };

  }, [route]);


  useEffect(() => {
    const listener = () => {
      setRoute(currentRoute());

      window.scrollTo(
        0,
        0
      );
    };

    window.addEventListener(
      "popstate",
      listener
    );

    return () =>
      window.removeEventListener(
        "popstate",
        listener
      );
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "desiglov-country",
      country
    );
  }, [country]);

  useEffect(() => {
    localStorage.setItem(
      "desiglov-wishlist",
      JSON.stringify(wishlist)
    );
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem(
      "desiglov-cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  useEffect(() => {
    if (!toast) return;

    const timer =
      setTimeout(
        () =>
          setToast(""),
        2200
      );

    return () =>
      clearTimeout(timer);
  }, [toast]);

  function navigate(path) {
    window.history.pushState(
      {},
      "",
      path
    );

    setRoute(
      currentRoute()
    );

    setMobileOpen(false);
    setSearchOpen(false);
    setCountryOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }

  function openProduct(product) {
    navigate(
      `/product/${product.slug}`
    );
  }

  function toggleWishlist(product) {
    setWishlist(
      (current) =>
        current.includes(product.id)
          ? current.filter(
              (id) =>
                id !== product.id
            )
          : [
              ...current,
              product.id,
            ]
    );

    setToast(
      wishlist.includes(
        product.id
      )
        ? "Removed from wishlist"
        : "Saved to wishlist"
    );
  }

  function addToCart(
    product,
    size
  ) {

    if (
      Number(product.stock) <=
      0
    ) {

      setToast(
        `${product.name} is currently out of stock`
      );

      return;
    }
    const chosenSize =
      size ||
      product.sizes[0];

    const key =
      `${product.id}-${chosenSize}`;

    setCart((current) => {
      const existing =
        current.find(
          (item) =>
            item.key === key
        );

      if (existing) {
        return current.map(
          (item) =>
            item.key === key
              ? {
                  ...item,
                  quantity:
                    item.quantity +
                    1,
                }
              : item
        );
      }

      return [
        ...current,
        {
          key,
          id: product.id,
          size: chosenSize,
          quantity: 1,
        },
      ];
    });

    setToast(
      `${product.name} added to bag`
    );

    setCartOpen(true);
  }

  function changeQty(
    key,
    amount
  ) {
    setCart((current) =>
      current
        .map((item) =>
          item.key === key
            ? {
                ...item,
                quantity:
                  item.quantity +
                  amount,
              }
            : item
        )
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  }

  function removeItem(key) {
    setCart((current) =>
      current.filter(
        (item) =>
          item.key !== key
      )
    );
  }

  const cartItems =
    cart
      .map((item) => {
        const product =
          products.find(
            (product) =>
              product.id ===
              item.id
          );

        if (!product)
          return null;

        return {
          ...item,
          product,
        };
      })
      .filter(Boolean);

  const cartCount =
    cartItems.reduce(
      (total, item) =>
        total +
        item.quantity,
      0
    );

  const cartTotalINR =
    cartItems.reduce(
      (total, item) =>
        total +
        item.product
          .priceINR *
          item.quantity,
      0
    );

  const pathname =
    route.split("?")[0];

  let page = null;

  if (
    pathname === "/admin"
  ) {
    page = (
      <AdminPage
        navigate={navigate}
      />
    );

  } else if (
    pathname.startsWith(
      "/product/"
    )
  ) {
    const slug =
      pathname
        .split("/")
        .pop();

    const product =
      products.find(
        (item) =>
          item.slug === slug
      );

    page = product ? (
      <ProductPage
        product={product}
        products={products}
        country={country}
        wishlist={wishlist}
        toggleWishlist={
          toggleWishlist
        }
        addToCart={
          addToCart
        }
        navigate={navigate}
        openProduct={
          openProduct
        }
      />
    ) : (
      <NotFound
        navigate={navigate}
      />
    );
  } else if (
    pathname === "/shop"
  ) {
    page = (
      <ShopPage
        route={route}
        products={products}
        country={country}
        wishlist={wishlist}
        toggleWishlist={
          toggleWishlist
        }
        openProduct={
          openProduct
        }
        navigate={navigate}
      />
    );
  } else if (
    pathname === "/wishlist"
  ) {
    page = (
      <WishlistPage
        products={products}
        country={country}
        wishlist={wishlist}
        toggleWishlist={
          toggleWishlist
        }
        openProduct={
          openProduct
        }
      />
    );
  } else if (
    pathname === "/cart"
  ) {
    page = (
      <CartPage
        items={cartItems}
        country={country}
        totalINR={
          cartTotalINR
        }
        changeQty={
          changeQty
        }
        removeItem={
          removeItem
        }
        navigate={navigate}
      />
    );
  } else if (
    pathname ===
    "/checkout"
  ) {
    page = (
      <CheckoutPage
        country={country}
        items={cartItems}
        totalINR={
          cartTotalINR
        }
        navigate={navigate}
        clearCart={() =>
          setCart([])
        }
      />
    );
  } else if (
    pathname ===
    "/contact"
  ) {

    page = (
      <ContactPage />
    );

  } else if (
    pathname ===
    "/feedback"
  ) {

    page = (
      <FeedbackPage />
    );

  } else if (
    pathname ===
    "/delivery"
  ) {

    page = (
      <DeliveryPage />
    );

  } else if (
    pathname ===
    "/returns"
  ) {

    page = (
      <ReturnsPage />
    );

  } else if (
    pathname ===
    "/privacy"
  ) {

    page = (
      <PrivacyPage />
    );

  } else if (
    pathname ===
    "/terms"
  ) {

    page = (
      <TermsPage />
    );

  } else if (
    pathname ===
    "/faq"
  ) {

    page = (
      <FaqPage />
    );

  } else if (
    pathname ===
    "/size-guide"
  ) {

    page = (
      <SizeGuidePage />
    );

  } else if (
    pathname ===
    "/forgot-password"
  ) {

    page = (
      <ForgotPasswordPage
        navigate={navigate}
      />
    );

  } else if (
    pathname ===
    "/reset-password"
  ) {

    page = (
      <ResetPasswordPage
        route={route}
        navigate={navigate}
      />
    );

  } else if (
    pathname ===
    "/account"
  ) {
    page = (
      <AccountPage
        navigate={navigate}
      />
    );
  } else {
    page = (
      <HomePage
        products={products}
        country={country}
        wishlist={wishlist}
        toggleWishlist={
          toggleWishlist
        }
        openProduct={
          openProduct
        }
        navigate={navigate}
      />
    );
  }

  return (
    <div className="site">
      <Announcement />

      <Header
        navigate={navigate}
        country={country}
        setCountry={setCountry}
        countryOpen={
          countryOpen
        }
        setCountryOpen={
          setCountryOpen
        }
        mobileOpen={
          mobileOpen
        }
        setMobileOpen={
          setMobileOpen
        }
        searchOpen={
          searchOpen
        }
        setSearchOpen={
          setSearchOpen
        }
        search={search}
        setSearch={setSearch}
        products={products}
        openProduct={openProduct}
        cartCount={
          cartCount
        }
        setCartOpen={
          setCartOpen
        }
      />


      <main>
        {page}
      </main>

      <Footer
        navigate={navigate}
      />

      <CartDrawer
        open={cartOpen}
        setOpen={
          setCartOpen
        }
        items={cartItems}
        country={country}
        totalINR={
          cartTotalINR
        }
        changeQty={
          changeQty
        }
        removeItem={
          removeItem
        }
        navigate={navigate}
      />

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}
    </div>
  );
}

function Announcement() {
  return (
    <div className="announcement">
      <span>
        FREE DELIVERY OVER
        ₹2,999
      </span>

      <i />

      <span>
        NEW COLLECTION
        NOW LIVE
      </span>

      <i />

      <span>
        SHIPPING ACROSS INDIA
      </span>
    </div>
  );
}

function Header({
  navigate,
  country,
  setCountry,
  countryOpen,
  setCountryOpen,
  mobileOpen,
  setMobileOpen,
  searchOpen,
  setSearchOpen,
  search,
  setSearch,
  products = [],
  openProduct,
  cartCount,
  setCartOpen,
}) {
  return (
    <>
      <header className="header">
        <button
          className="mobile-menu-button"
          onClick={() =>
            setMobileOpen(
              !mobileOpen
            )
          }
          aria-label="Menu"
        >
          ☰
        </button>

        <button
          className="brand"
          onClick={() =>
            navigate("/")
          }
        >
          <div className="brand-word">
            <span className="brand-desi">
              DESI
            </span>
            <span className="brand-glov">
              GLOV
            </span>
          </div>

          <div className="brand-line">
            RARE FINDS · REAL STYLE
          </div>
        </button>

        <div className="header-centre">
          <nav
            className={`desktop-nav ${
              searchOpen ? "desktop-nav-searching" : ""
            }`}
          >
            <button onClick={() => navigate("/")}>
              Home
            </button>

            <button onClick={() => navigate("/shop")}>
              Shop
            </button>

            <button
              onClick={() =>
                navigate("/shop?category=Kurtis")
              }
            >
              Kurtis
            </button>

            <button
              onClick={() =>
                navigate("/shop?category=Short%20Tops")
              }
            >
              Short Tops
            </button>

            <button
              onClick={() =>
                navigate("/shop?category=Coord%20Sets")
              }
            >
              Coord Sets
            </button>

            <button
              onClick={() =>
                navigate("/shop?category=3%20Piece%20Sets")
              }
            >
              3 Piece Sets
            </button>

            <button
              onClick={() =>
                navigate("/shop?category=Jewellery")
              }
            >
              Jewellery
            </button>
          </nav>

          <div
            className={`navbar-search ${
              searchOpen ? "navbar-search-open" : ""
            }`}
          >
            <SearchIcon />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search products..."
              aria-label="Search products"
            onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  search.trim()
                ) {
                  event.preventDefault();

                  navigate(
                    `/shop?search=${encodeURIComponent(
                      search.trim()
                    )}`
                  );

                  setSearchOpen(false);
                  setSearch("");
                }
              }}
              />

            {search && (
              <button
                type="button"
                className="navbar-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}

            <button
              type="button"
              className="navbar-search-close"
              onClick={() => {
                setSearchOpen(false);
                setSearch("");
              }}
              aria-label="Close search"
            >
              ×
            </button>

          </div>
        </div>

        <div className="header-tools">
          <button
            className="icon-button"
            onClick={() => {
              setSearchOpen((value) => !value);
              setMobileOpen(false);
            }}
            aria-label="Search"
          >
            <SearchIcon />
          </button>

          <button
            className="icon-button"
            onClick={() =>
              navigate(
                "/account"
              )
            }
            aria-label="Account"
          >
            <UserIcon />
          </button>

          <button
            className="icon-button"
            onClick={() =>
              navigate(
                "/wishlist"
              )
            }
            aria-label="Wishlist"
          >
            <HeartIcon />
          </button>

          <button
            className="icon-button cart-icon-button"
            onClick={() =>
              setCartOpen(true)
            }
            aria-label="Bag"
          >
            <BagIcon />

            {cartCount >
              0 && (
              <span className="cart-count">
                {
                  cartCount
                }
              </span>
            )}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="mobile-nav">
          {[
            ["Home", "/"],
            ["Shop", "/shop"],
            [
              "Kurtis",
              "/shop?category=Kurtis",
            ],
            [
              "Short Tops",
              "/shop?category=Short%20Tops",
            ],
            [
              "Coord Sets",
              "/shop?category=Coord%20Sets",
            ],
            [
              "3 Piece Sets",
              "/shop?category=3%20Piece%20Sets",
            ],
            [
              "Jewellery",
              "/shop?category=Jewellery",
            ],
            [
              "Wishlist",
              "/wishlist",
            ],
            [
              "Account",
              "/account",
            ],
          ].map(
            ([label, path]) => (
              <button
                key={
                  label
                }
                onClick={() => {
                  navigate(
                    path
                  );
                  setMobileOpen(
                    false
                  );
                }}
              >
                {label}
              </button>
            )
          )}
        </div>
      )}
    </>
  );
}

function HomePage({
  products = [],
  country,
  wishlist,
  toggleWishlist,
  openProduct,
  navigate,
}) {
  const featured =
    products.slice(0, 4);

  return (
    <>
      <section className="hero-new">
        <div className="hero-copy">
          <div className="eyebrow">
            THE NEW EDIT ·
            2026
          </div>

          <h1>
            Made for
            <br />
            <em>
              your story.
            </em>
          </h1>

          <p>
            Rare pieces.
            Thoughtful details.
            Contemporary Indian
            style made to feel
            distinctly yours.
          </p>

          <div className="hero-actions">
            <button
              className="button-dark"
              onClick={() =>
                navigate(
                  "/shop"
                )
              }
            >
              SHOP THE
              COLLECTION
              <span>
                →
              </span>
            </button>

            <button
              className="button-outline"
              onClick={() =>
                navigate(
                  "/shop?category=Kurtis"
                )
              }
            >
              EXPLORE KURTIS
            </button>
          </div>

          <div className="hero-note">
            <span>
              01
            </span>

            <div />

            <p>
              Limited pieces,
              curated with
              intention.
            </p>
          </div>
        </div>

        <div className="hero-visual">
          <img
            src={
              products[0]?.images?.[0] ||
              "/products/neelam/1.jpg"
            }
            alt={
              products[0]?.name ||
              "DEsiglov collection"
            }
            onError={(e) => {
              e.currentTarget.style.display =
                "none";
            }}
          />

          <div className="hero-visual-overlay" />

          <div className="hero-product-card">
            <small>
              FEATURED PIECE
            </small>

            <strong>
              {
                products[0]?.name ||
                "DEsiglov"
              }
            </strong>

            <span>
              {products[0]
                ? formatMoney(
                    products[0].priceINR,
                    country
                  )
                : ""}
            </span>

            <button
              onClick={() =>
                openProduct(
                  products[0]
                )
              }
            >
              VIEW PIECE →
            </button>
          </div>
        </div>
      </section>

      <section className="benefits">
        <Benefit
          number="01"
          title="Curated pieces"
          text="Rare finds chosen for their character."
        />

        <Benefit
          number="02"
          title="Made to be noticed"
          text="Thoughtful silhouettes and details."
        />

        <Benefit
          number="03"
          title="Secure shopping"
          text="Easy checkout and protected payments."
        />

        <Benefit
          number="04"
          title="Across India"
          text="Delivered carefully to your doorstep."
        />
      </section>

      <section className="home-section categories-section">
        <SectionHeading
          eyebrow="SHOP BY CATEGORY"
          title="Find your next favourite."
          text="From everyday silhouettes to finishing touches."
        />

        <div className="category-editorial-grid">
          <CategoryCard
            title="Kurtis"
            image="/products/neelam/1.jpg"
            className="category-large"
            onClick={() =>
              navigate(
                "/shop?category=Kurtis"
              )
            }
          />

          <CategoryCard
            title="Coord Sets"
            image="/products/grape/1.jpg"
            onClick={() =>
              navigate(
                "/shop?category=Coord%20Sets"
              )
            }
          />

          <CategoryCard
            title="3 Piece Sets"
            image="/products/ivorybloom/1.jpg"
            onClick={() =>
              navigate(
                "/shop?category=3%20Piece%20Sets"
              )
            }
          />

          <CategoryCard
            title="Jewellery"
            image="/products/tri-heart/1.png"
            onClick={() =>
              navigate(
                "/shop?category=Jewellery"
              )
            }
          />
        </div>
      </section>

      <section className="story-section">
        <div className="story-photo">
          <img
            src="/products/moonlight/1.jpg"
            alt="DEsiglov fashion"
            onError={(e) => {
              e.currentTarget.style.display =
                "none";
            }}
          />
        </div>

        <div className="story-copy">
          <div className="eyebrow">
            THE DESIGLOV
            STORY
          </div>

          <h2>
            Wear what
            <br />
            feels like
            <em>
              {" "}you.
            </em>
          </h2>

          <p>
            DEsiglov is about
            more than getting
            dressed. It is about
            discovering pieces
            that make you feel
            comfortable,
            confident and
            completely yourself.
          </p>

          <p>
            We bring together
            Indian-inspired
            styling and modern
            fashion for everyday
            life, celebrations
            and everything in
            between.
          </p>

          <button
            className="text-link"
            onClick={() =>
              navigate(
                "/shop"
              )
            }
          >
            DISCOVER THE
            COLLECTION
            <span>
              →
            </span>
          </button>
        </div>
      </section>

      <section className="home-section">
        <SectionHeading
          eyebrow="CURRENT FAVOURITES"
          title="The pieces we're loving."
          text="A selection from the latest DEsiglov edit."
        />

        <div className="products-grid home-products">
          {featured.map(
            (product) => (
              <ProductCard
                key={
                  product.id
                }
                product={
                  product
                }
                country={
                  country
                }
                wishlist={
                  wishlist
                }
                toggleWishlist={
                  toggleWishlist
                }
                openProduct={
                  openProduct
                }
              />
            )
          )}
        </div>

        <div className="center-button">
          <button
            className="button-outline dark-outline"
            onClick={() =>
              navigate(
                "/shop"
              )
            }
          >
            VIEW ALL PRODUCTS
          </button>
        </div>
      </section>

      <section className="quote-section">
        <small>
          RARE FINDS · REAL
          STYLE
        </small>

        <blockquote>
          Style should never
          feel ordinary.
        </blockquote>

        <p>
          Pieces worth finding.
          Details worth
          remembering.
        </p>
      </section>

      <Newsletter />
    </>
  );
}

function CategoryCard({
  title,
  image,
  onClick,
  className = "",
}) {
  return (
    <button
      className={`category-card ${className}`}
      onClick={onClick}
    >
      <img
        src={image}
        alt={title}
        onError={(e) => {
          e.currentTarget.style.display =
            "none";
        }}
      />

      <div className="category-shade" />

      <div className="category-text">
        <small>
          EXPLORE
        </small>

        <h3>
          {title}
        </h3>

        <span>
          SHOP NOW →
        </span>
      </div>
    </button>
  );
}

function ShopPage({
  route,
  products = [],
  country,
  wishlist,
  toggleWishlist,
  openProduct,
}) {
  const params =
    new URLSearchParams(
      route.split("?")[1] ||
        ""
    );

  const initialCategory =
    params.get("category");

  const initialSubcategory =
    params.get("subcategory") || "";

  const shopSearch =
    (params.get("search") || "")
      .trim()
      .toLowerCase();

  const searchJewellerySubcategory =
    {
      earing: "Earrings",
      earings: "Earrings",
      earring: "Earrings",
      earrings: "Earrings",
      chain: "Chains",
      chains: "Chains",
      bracelet: "Bracelets",
      bracelets: "Bracelets",
    }[shopSearch] || "";

  const searchIsJewellery =
    shopSearch === "jewellery" ||
    shopSearch === "jewelry" ||
    Boolean(
      searchJewellerySubcategory
    );

  const [category, setCategory] =
    useState(
      initialCategory ||
      (
        searchIsJewellery
          ? "Jewellery"
          : ""
      )
    );

  const [subcategory, setSubcategory] =
    useState(
      initialSubcategory ||
      searchJewellerySubcategory ||
      ""
    );

  const [manualFilter, setManualFilter] =
    useState(false);

  const [sort, setSort] =
    useState("featured");

  const [stockOnly, setStockOnly] =
    useState(false);

  useEffect(() => {
    setManualFilter(false);

    setCategory(
      initialCategory ||
      (
        searchIsJewellery
          ? "Jewellery"
          : ""
      )
    );

    setSubcategory(
      initialSubcategory ||
      searchJewellerySubcategory ||
      ""
    );
  }, [route]);

  const filteredProducts = useMemo(() => {
      let result =
        products.filter(
          (product) => {
            const categoryMatch =
              !category ||
              product.category ===
                category;

            const subcategoryMatch =
              !subcategory ||
              product.subcategory ===
                subcategory;

            const queryText =
              [
                product.name,
                product.category,
                product.subcategory,
                product.colour,
                product.material,
                product.description,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const dressSearch =
              [
                "dress",
                "dresses",
                "clothes",
                "clothing",
                "outfit",
                "outfits",
                "wear",
              ].includes(shopSearch);

            const jewellerySearchMap = {
              earing: "Earrings",
              earings: "Earrings",
              earring: "Earrings",
              earrings: "Earrings",
              chain: "Chains",
              chains: "Chains",
              bracelet: "Bracelets",
              bracelets: "Bracelets",
            };

            const jewellerySubcategory =
              jewellerySearchMap[
                shopSearch
              ] || "";

            const searchMatch =
              manualFilter ||
              !shopSearch ||
              jewellerySubcategory ||
              searchIsJewellery ||
              (
                dressSearch
                  ? CLOTHING_CATEGORIES.includes(
                      product.category
                    )
                  : queryText.includes(
                      shopSearch
                    )
              );

            const stockMatch =
              !stockOnly ||
              product.stock > 0;

            return (
              categoryMatch &&
              subcategoryMatch &&
              searchMatch &&
              stockMatch
            );
          }
        );

      if (sort === "low") {
        result = [
          ...result,
        ].sort(
          (a, b) =>
            a.priceINR -
            b.priceINR
        );
      }

      if (sort === "high") {
        result = [
          ...result,
        ].sort(
          (a, b) =>
            b.priceINR -
            a.priceINR
        );
      }

      if (
        sort ===
        "new"
      ) {
        result = [
          ...result,
        ].sort(
          (a, b) =>
            b.id - a.id
        );
      }

      return result;
    }, [
      products,
      category,
      subcategory,
      shopSearch,
      manualFilter,
      sort,
      stockOnly,
    ]);

  return (
    <>
      <PageHero
        eyebrow="THE DESIGLOV COLLECTION"
        title={
          category ||
          (
            shopSearch
              ? `Results for "${params.get("search")}"`
              : "Shop the edit."
          )
        }
        text="Discover pieces chosen to make everyday dressing feel special."
      />

      <div className="shop-toolbar">
        <span>
          {filteredProducts.length}{" "}
          PRODUCTS
        </span>

        <label>
          SORT BY
          <select
            value={sort}
            onChange={(e) =>
              setSort(
                e.target.value
              )
            }
          >
            <option value="featured">
              Featured
            </option>

            <option value="new">
              Newest
            </option>

            <option value="low">
              Price: Low to
              High
            </option>

            <option value="high">
              Price: High to
              Low
            </option>
          </select>
        </label>
      </div>

      <section className="shop-layout">
        <aside className="filters">
          <div className="filter-top">
            <strong>
              FILTERS
            </strong>

            <button
              onClick={() => {
                setCategory("");
                setSubcategory("");
                setStockOnly(false);
                setManualFilter(true);
              }}
            >
              CLEAR ALL
            </button>
          </div>

          <div className="filter-group">
            <h4>
              CATEGORY
            </h4>

            <label>
              <input
                type="radio"
                name="category"
                checked={
                  category ===
                  ""
                }
                onChange={() => {
                  setCategory("");
                  setSubcategory("");
                  setManualFilter(true);
                }}
              />
              All
            </label>

            {CATEGORIES.map(
              (item) => (
                <div
                  key={item}
                  className={
                    item === "Jewellery"
                      ? "jewellery-filter-group"
                      : ""
                  }
                >
                  <label>
                    <input
                      type="radio"
                      name="category"
                      checked={
                        category === item
                      }
                      onChange={() => {
                        setCategory(item);
                        setSubcategory("");
                        setManualFilter(true);
                      }}
                    />

                    {item}
                  </label>

                  {item === "Jewellery" &&
                    category ===
                      "Jewellery" && (
                      <div
                        className="jewellery-subfilters"
                        style={{
                          paddingLeft: "28px",
                          display: "grid",
                          gap: "10px",
                          marginTop: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        {[
                          "Earrings",
                          "Chains",
                          "Bracelets",
                        ].map(
                          (subItem) => (
                            <label
                              key={
                                subItem
                              }
                            >
                              <input
                                type="radio"
                                name="jewellery-subcategory"
                                checked={
                                  subcategory ===
                                  subItem
                                }
                                onChange={() => {
                                  setCategory(
                                    "Jewellery"
                                  );
                                  setSubcategory(
                                    subItem
                                  );
                                  setManualFilter(
                                    true
                                  );
                                }}
                              />

                              {subItem}
                            </label>
                          )
                        )}
                      </div>
                    )}
                </div>
              )
            )}
          </div>

          <div className="filter-group">
            <h4>
              AVAILABILITY
            </h4>

            <label>
              <input
                type="checkbox"
                checked={
                  stockOnly
                }
                onChange={(e) =>
                  setStockOnly(
                    e.target
                      .checked
                  )
                }
              />
              In stock only
            </label>
          </div>
        </aside>

        <div className="products-grid shop-products">
          {filteredProducts.length >
          0 ? (
            filteredProducts.map(
              (product) => (
                <ProductCard
                  key={
                    product.id
                  }
                  product={
                    product
                  }
                  country={
                    country
                  }
                  wishlist={
                    wishlist
                  }
                  toggleWishlist={
                    toggleWishlist
                  }
                  openProduct={
                    openProduct
                  }
                />
              )
            )
          ) : (
            <div className="empty-products">
              <h3>
                Coming soon.
              </h3>

              <p>
                We're preparing
                this collection.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ProductCard({
  product,
  country,
  wishlist,
  toggleWishlist,
  openProduct,
}) {
  if (!product) {
    return null;
  }

  const safeWishlist =
    Array.isArray(wishlist)
      ? wishlist
      : [];

  const safeImages =
    Array.isArray(
      product.images
    )
      ? product.images
      : [];

  const saved =
    safeWishlist.includes(
      product.id
    );

  return (
    <article className="product-card">
      <div className="product-image">
        <button
          className={`wishlist-circle ${
            saved
              ? "saved"
              : ""
          }`}
          onClick={() =>
            toggleWishlist(
              product
            )
          }
          aria-label="Wishlist"
        >
          <HeartIcon
            filled={
              saved
            }
          />
        </button>

        {Number(product.stock) <= 0 ? (
          <span className="badge out-stock-badge">
            SOLD OUT
          </span>
        ) : product.badge ? (
          <span className="badge">
            {
              product.badge
            }
          </span>
        ) : null}

        <button
          className="product-image-button"
          onClick={() =>
            openProduct(
              product
            )
          }
        >
          <img
            src={
              safeImages[0] ||
              "/favicon.svg"
            }
            alt={
              product.name
            }
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.opacity =
                "0";
            }}
          />
        </button>

        <button
          className="quick-shop"
          onClick={() =>
            openProduct(
              product
            )
          }
        >
          VIEW PRODUCT
        </button>
      </div>

      <button
        className="product-info"
        onClick={() =>
          openProduct(
            product
          )
        }
      >
        <small>
          {
            product.category
          }
        </small>

        <h3>
          {product.name}
        </h3>

        <strong>
          {formatMoney(
            product.priceINR,
            country
          )}
        </strong>
      </button>
    </article>
  );
}

function ProductPage({
  product,
  products = [],
  country,
  wishlist,
  toggleWishlist,
  addToCart,
  navigate,
  openProduct,
}) {
  const [activeImage, setActiveImage] =
    useState(0);

  const [deliveryPin, setDeliveryPin] =
    useState("");

  const [deliveryStatus, setDeliveryStatus] =
    useState("");

  function checkDeliveryPin() {
    const pin = deliveryPin.trim();

    if (!/^\d{6}$/.test(pin)) {
      setDeliveryStatus("invalid");
      return;
    }

    setDeliveryStatus("available");
  }

  const [size, setSize] =
    useState(
      product.sizes.length ===
        1
        ? product.sizes[0]
        : ""
    );

  const [sizeError, setSizeError] =
    useState(false);

  // =========================================================
  // PRODUCT REVIEWS
  // =========================================================

  const [reviewData, setReviewData] =
    useState({
      summary: {
        count: 0,
        average: 0,
        breakdown: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      },
      reviews: [],
    });

  const [reviewsLoading, setReviewsLoading] =
    useState(true);

  const [reviewRating, setReviewRating] =
    useState(0);

  const [reviewComment, setReviewComment] =
    useState("");

  const [reviewSubmitting, setReviewSubmitting] =
    useState(false);

  const [reviewMessage, setReviewMessage] =
    useState("");

  const [reviewError, setReviewError] =
    useState("");

  async function loadProductReviews() {
    try {
      setReviewsLoading(true);

      const data =
        await reviewApi.list(
          product.id
        );

      setReviewData({
        summary: data.summary || {
          count: 0,
          average: 0,
          breakdown: {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0,
          },
        },
        reviews:
          Array.isArray(data.reviews)
            ? data.reviews
            : [],
      });
    } catch (error) {
      console.error(
        "Unable to load reviews:",
        error
      );
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    setReviewRating(0);
    setReviewComment("");
    setReviewMessage("");
    setReviewError("");

    loadProductReviews();
  }, [product.id]);

  async function submitProductReview(event) {
    event.preventDefault();

    setReviewMessage("");
    setReviewError("");

    if (
      reviewRating < 1 ||
      reviewRating > 5
    ) {
      setReviewError(
        "Please select a star rating."
      );
      return;
    }

    if (
      reviewComment.trim().length < 3
    ) {
      setReviewError(
        "Please write a short review."
      );
      return;
    }

    try {
      setReviewSubmitting(true);

      await reviewApi.save(
        product.id,
        {
          rating: reviewRating,
          comment:
            reviewComment.trim(),
        }
      );

      setReviewMessage(
        "Thank you. Your review has been published."
      );

      setReviewRating(0);
      setReviewComment("");

      await loadProductReviews();
    } catch (error) {
      if (
        error?.status === 401
      ) {
        setReviewError(
          "Please sign in to write a review."
        );
      } else {
        setReviewError(
          error?.message ||
            "Unable to submit your review."
        );
      }
    } finally {
      setReviewSubmitting(false);
    }
  }

  const reviewSummary =
    reviewData.summary || {};

  const reviewCount =
    Number(
      reviewSummary.count || 0
    );

  const averageRating =
    Number(
      reviewSummary.average || 0
    );

  function reviewPercentage(star) {
    if (!reviewCount) {
      return 0;
    }

    const count =
      Number(
        reviewSummary.breakdown?.[
          star
        ] || 0
      );

    return Math.round(
      (count / reviewCount) *
        100
    );
  }

  const saved =
    wishlist.includes(
      product.id
    );

  const related =
    products.filter(
      (item) =>
        item.id !==
          product.id &&
        item.category ===
          product.category
    ).slice(0, 4);

  function handleAdd() {
    if (!size) {
      setSizeError(true);
      return;
    }

    setSizeError(false);

    addToCart(
      product,
      size
    );
  }

  return (
    <>
      <div className="breadcrumbs">
        <button
          onClick={() =>
            navigate("/")
          }
        >
          HOME
        </button>

        <span>
          /
        </span>

        <button
          onClick={() =>
            navigate(
              `/shop?category=${encodeURIComponent(
                product.category
              )}`
            )
          }
        >
          {
            product.category
          }
        </button>

        <span>
          /
        </span>

        <strong>
          {
            product.name
          }
        </strong>
      </div>

      <section className="product-page">
        <div className="product-gallery">
          <div className="thumbnails">
            {product.images.map(
              (
                image,
                index
              ) => (
                <button
                  key={
                    image
                  }
                  className={
                    activeImage ===
                    index
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveImage(
                      index
                    )
                  }
                >
                  <img
                    src={
                      image
                    }
                    alt=""
                  />
                </button>
              )
            )}
          </div>

          <div className="main-product-image">
            <img
              src={
                product.images[
                  activeImage
                ]
              }
              alt={
                product.name
              }
            />
          </div>
        </div>

        <div className="product-details">
          <div className="eyebrow">
            {
              product.category
            }
          </div>

          <h1>
            {product.name}
          </h1>

          <div className="rating">
            ★★★★★
            <span>
              Curated by
              DEsiglov
            </span>
          </div>

          <div className="product-price">
            {formatMoney(
              product.priceINR,
              country
            )}
          </div>

          <p className="tax-note">
            Inclusive of all
            applicable taxes.
          </p>

          <div className="detail-divider" />

          <div className="product-option">
            <div className="option-title">
              <span>
                COLOUR
              </span>

              <strong>
                {
                  product.colour
                }
              </strong>
            </div>

            <div className="colour-pill">
              <span />
              {
                product.colour
              }
            </div>
          </div>

          <div className="product-option">
            <div className="option-title">
              <span>
                SELECT SIZE
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate("/size-guide")
                }
              >
                SIZE GUIDE
              </button>
            </div>

            <div className="size-grid">
              {product.sizes.map(
                (item) => (
                  <button
                    key={
                      item
                    }
                    className={
                      size ===
                      item
                        ? "selected"
                        : ""
                    }
                    onClick={() => {
                      setSize(
                        item
                      );
                      setSizeError(
                        false
                      );
                    }}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            {sizeError && (
              <p className="size-error">
                Please select a
                size.
              </p>
            )}
          </div>

          {product.stock <=
            5 && (
            <div className="stock-warning">
              Only{" "}
              {
                product.stock
              }{" "}
              pieces currently
              available.
            </div>
          )}

          <div className="product-buttons">
            <button
              className="add-bag"
              onClick={
                handleAdd
              }
              disabled={
                Number(product.stock) <=
                0
              }
            >
              {Number(product.stock) <= 0
                ? "SOLD OUT"
                : "ADD TO BAG"}
            </button>

            <button
              className={`wish-product ${
                saved
                  ? "saved"
                  : ""
              }`}
              onClick={() =>
                toggleWishlist(
                  product
                )
              }
            >
              <HeartIcon
                filled={
                  saved
                }
              />
            </button>
          </div>

          <div className="delivery-box">
            <TruckIcon />

            <div className="delivery-content">
              <strong>
                Delivery across India
              </strong>

              <p>
                Check delivery availability for your area.
              </p>

              <div className="delivery-pin-checker">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  value={deliveryPin}
                  onChange={(event) => {
                    const value =
                      event.target.value.replace(
                        /\D/g,
                        ""
                      );

                    setDeliveryPin(value);
                    setDeliveryStatus("");
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      checkDeliveryPin();
                    }
                  }}
                  placeholder="Enter PIN code"
                  aria-label="Enter delivery PIN code"
                />

                <button
                  type="button"
                  onClick={
                    checkDeliveryPin
                  }
                >
                  CHECK
                </button>
              </div>

              {deliveryStatus ===
                "available" && (
                <div className="delivery-result available">
                  <span className="delivery-check">
                    ✓
                  </span>

                  <div>
                    <strong>
                      Delivery available
                    </strong>

                    <p>
                      We deliver to PIN code{" "}
                      {deliveryPin}.
                    </p>
                  </div>
                </div>
              )}

              {deliveryStatus ===
                "invalid" && (
                <div className="delivery-result invalid">
                  <span>
                    !
                  </span>

                  <div>
                    <strong>
                      Check your PIN code
                    </strong>

                    <p>
                      Please enter a valid
                      6-digit Indian PIN code.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Accordion
            title="PRODUCT DETAILS"
          >
            <p>
              {
                product.description
              }
            </p>

            <p>
              <strong>
                Material:
              </strong>{" "}
              {
                product.material
              }
            </p>
          </Accordion>

          <Accordion
            title="CARE"
          >
            <p>
              Gentle care is
              recommended to
              preserve the
              finish and
              detailing.
            </p>
          </Accordion>

          <Accordion
            title="DELIVERY & RETURNS"
          >
            <p>
              Delivery times and
              return eligibility
              will be shown at
              checkout.
            </p>
          </Accordion>
        </div>
      </section>

      <section className="product-reviews-section">

        <div className="product-reviews-heading">

          <span>
            CUSTOMER FEEDBACK
          </span>

          <h2>
            Customer reviews.
          </h2>

          <p>
            Real feedback from customers
            about {product.name}.
          </p>

        </div>

        {reviewsLoading ? (

          <div className="reviews-loading">
            Loading reviews...
          </div>

        ) : (

          <div className="reviews-layout">

            <div className="reviews-summary-card">

              <div className="reviews-score">

                <strong>
                  {reviewCount
                    ? averageRating.toFixed(
                        1
                      )
                    : "0.0"}
                </strong>

                <div>

                  <div
                    className="display-stars"
                    aria-label={
                      `${averageRating.toFixed(
                        1
                      )} out of 5 stars`
                    }
                  >
                    {[1, 2, 3, 4, 5].map(
                      (star) => (
                        <span
                          key={star}
                          className={
                            star <=
                            Math.round(
                              averageRating
                            )
                              ? "filled"
                              : ""
                          }
                        >
                          ★
                        </span>
                      )
                    )}
                  </div>

                  <p>
                    {reviewCount === 1
                      ? "1 customer review"
                      : `${reviewCount} customer reviews`}
                  </p>

                </div>

              </div>

              <div className="rating-breakdown">

                {[5, 4, 3, 2, 1].map(
                  (star) => {

                    const percentage =
                      reviewPercentage(
                        star
                      );

                    return (
                      <div
                        className="rating-row"
                        key={star}
                      >

                        <span>
                          {star} star
                        </span>

                        <div className="rating-track">
                          <div
                            className="rating-fill"
                            style={{
                              width:
                                `${percentage}%`,
                            }}
                          />
                        </div>

                        <span>
                          {percentage}%
                        </span>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

            <div className="reviews-content">

              <div className="write-review-card">

                <div className="write-review-header">

                  <div>
                    <span>
                      SHARE YOUR EXPERIENCE
                    </span>

                    <h3>
                      Write a review
                    </h3>
                  </div>

                </div>

                <form
                  onSubmit={
                    submitProductReview
                  }
                >

                  <label>
                    YOUR RATING
                  </label>

                  <div
                    className="review-star-picker"
                    role="radiogroup"
                    aria-label="Choose rating"
                  >

                    {[1, 2, 3, 4, 5].map(
                      (star) => (
                        <button
                          type="button"
                          key={star}
                          className={
                            star <=
                            reviewRating
                              ? "selected"
                              : ""
                          }
                          onClick={() =>
                            setReviewRating(
                              star
                            )
                          }
                          aria-label={
                            `${star} star rating`
                          }
                        >
                          ★
                        </button>
                      )
                    )}

                  </div>

                  <label
                    htmlFor={
                      `review-${product.id}`
                    }
                  >
                    YOUR REVIEW
                  </label>

                  <textarea
                    id={
                      `review-${product.id}`
                    }
                    value={
                      reviewComment
                    }
                    maxLength={1500}
                    placeholder={
                      `What did you think of ${product.name}?`
                    }
                    onChange={(event) =>
                      setReviewComment(
                        event.target.value
                      )
                    }
                  />

                  <div className="review-form-footer">

                    <small>
                      {
                        reviewComment.length
                      }
                      /1500
                    </small>

                    <button
                      type="submit"
                      disabled={
                        reviewSubmitting
                      }
                    >
                      {reviewSubmitting
                        ? "SUBMITTING..."
                        : "SUBMIT REVIEW"}
                    </button>

                  </div>

                  {reviewError && (
                    <p className="review-form-error">
                      {reviewError}
                    </p>
                  )}

                  {reviewMessage && (
                    <p className="review-form-success">
                      {reviewMessage}
                    </p>
                  )}

                </form>

              </div>

              <div className="customer-reviews-list">

                {reviewData.reviews.length ===
                0 ? (

                  <div className="no-reviews">

                    <span>
                      ★★★★★
                    </span>

                    <h3>
                      Be the first to review.
                    </h3>

                    <p>
                      No customer reviews have
                      been submitted for this
                      product yet.
                    </p>

                  </div>

                ) : (

                  reviewData.reviews.map(
                    (review) => (

                      <article
                        className="customer-review"
                        key={review.id}
                      >

                        <div className="customer-review-top">

                          <div>

                            <strong>
                              {
                                review.customerName
                              }
                            </strong>

                            <div className="customer-review-stars">

                              {[1, 2, 3, 4, 5].map(
                                (star) => (
                                  <span
                                    key={star}
                                    className={
                                      star <=
                                      Number(
                                        review.rating
                                      )
                                        ? "filled"
                                        : ""
                                    }
                                  >
                                    ★
                                  </span>
                                )
                              )}

                            </div>

                          </div>

                          <time>
                            {review.updatedAt
                              ? new Date(
                                  review.updatedAt
                                ).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day:
                                      "numeric",
                                    month:
                                      "long",
                                    year:
                                      "numeric",
                                  }
                                )
                              : ""}
                          </time>

                        </div>

                        <p>
                          {review.comment}
                        </p>

                      </article>

                    )
                  )

                )}

              </div>

            </div>

          </div>

        )}

      </section>


      {related.length >
        0 && (
        <section className="home-section related-section">
          <SectionHeading
            eyebrow="YOU MAY ALSO LIKE"
            title="More from the edit."
          />

          <div className="products-grid home-products">
            {related.map(
              (item) => (
                <ProductCard
                  key={
                    item.id
                  }
                  product={
                    item
                  }
                  country={
                    country
                  }
                  wishlist={
                    wishlist
                  }
                  toggleWishlist={
                    toggleWishlist
                  }
                  openProduct={
                    openProduct
                  }
                />
              )
            )}
          </div>
        </section>
      )}
    </>
  );
}

function Accordion({
  title,
  children,
}) {
  const [open, setOpen] =
    useState(false);

  return (
    <div className="accordion">
      <button
        onClick={() =>
          setOpen(!open)
        }
      >
        <span>
          {title}
        </span>

        <span>
          {open
            ? "−"
            : "+"}
        </span>
      </button>

      {open && (
        <div className="accordion-body">
          {children}
        </div>
      )}
    </div>
  );
}

function WishlistPage({
  products = [],
  country,
  wishlist = [],
  toggleWishlist,
  openProduct,
}) {
  const safeWishlist =
    Array.isArray(wishlist)
      ? wishlist
      : [];

  const wishlistProducts =
    Array.isArray(products)
      ? products.filter(
          (product) =>
            safeWishlist.includes(
              product.id
            )
        )
      : [];

  return (
    <>
      <PageHero
        eyebrow="SAVED FOR LATER"
        title="Your wishlist."
        text="Pieces you want to come back to."
      />

      <section className="simple-page">
        {wishlistProducts.length >
        0 ? (
          <div className="products-grid wishlist-products">
            {wishlistProducts.map(
              (product) => (
                <ProductCard
                  key={
                    product.id
                  }
                  product={
                    product
                  }
                  country={
                    country
                  }
                  wishlist={
                    wishlist
                  }
                  toggleWishlist={
                    toggleWishlist
                  }
                  openProduct={
                    openProduct
                  }
                />
              )
            )}
          </div>
        ) : (
          <EmptyState
            title="Your wishlist is empty."
            text="Save pieces you love and find them here."
          />
        )}
      </section>
    </>
  );
}

function CartPage({
  items,
  country,
  totalINR,
  changeQty,
  removeItem,
  navigate,
}) {
  return (
    <>
      <PageHero
        eyebrow="YOUR SELECTION"
        title="Shopping bag."
        text={`${items.reduce(
          (sum, item) =>
            sum +
            item.quantity,
          0
        )} items`}
      />

      <section className="cart-page">
        {items.length ===
        0 ? (
          <EmptyState
            title="Your bag is empty."
            text="Discover something special from the collection."
          />
        ) : (
          <>
            <div className="cart-list">
              {items.map(
                (item) => (
                  <CartLine
                    key={
                      item.key
                    }
                    item={
                      item
                    }
                    country={
                      country
                    }
                    changeQty={
                      changeQty
                    }
                    removeItem={
                      removeItem
                    }
                  />
                )
              )}
            </div>

            <OrderSummary
              totalINR={
                totalINR
              }
              country={
                country
              }
              onCheckout={() =>
                navigate(
                  "/checkout"
                )
              }
            />
          </>
        )}
      </section>
    </>
  );
}

function CartLine({
  item,
  country,
  changeQty,
  removeItem,
}) {
  const {
    product,
  } = item;

  return (
    <article className="cart-line">
      <div className="cart-line-image">
        <img
          src={
            product.images[0]
          }
          alt={
            product.name
          }
        />
      </div>

      <div className="cart-line-info">
        <small>
          {
            product.category
          }
        </small>

        <h3>
          {
            product.name
          }
        </h3>

        <p>
          Size:{" "}
          {
            item.size
          }
        </p>

        <strong>
          {formatMoney(
            product.priceINR,
            country
          )}
        </strong>

        <div className="quantity">
          <button
            onClick={() =>
              changeQty(
                item.key,
                -1
              )
            }
          >
            −
          </button>

          <span>
            {
              item.quantity
            }
          </span>

          <button
            onClick={() =>
              changeQty(
                item.key,
                1
              )
            }
          >
            +
          </button>
        </div>

        <button
          className="remove-button"
          onClick={() =>
            removeItem(
              item.key
            )
          }
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function OrderSummary({
  totalINR,
  country,
  onCheckout,
}) {
  const free =
    totalINR >=
    COUNTRIES.IN
      .freeShipping;

  const left =
    Math.max(
      0,
      COUNTRIES.IN
        .freeShipping -
        totalINR
    );

  return (
    <aside className="order-summary">
      <h3>
        ORDER SUMMARY
      </h3>

      {!free && (
        <div className="shipping-message">
          Add{" "}
          <strong>
            {formatMoney(
              left,
              country
            )}
          </strong>{" "}
          more for free
          delivery.
        </div>
      )}

      {free && (
        <div className="shipping-message success">
          You qualify for
          free delivery.
        </div>
      )}

      <div className="summary-row">
        <span>
          Subtotal
        </span>

        <strong>
          {formatMoney(
            totalINR,
            country
          )}
        </strong>
      </div>

      <div className="summary-row">
        <span>
          Delivery
        </span>

        <strong>
          {free
            ? "FREE"
            : "Calculated at checkout"}
        </strong>
      </div>

      <div className="summary-total">
        <span>
          TOTAL
        </span>

        <strong>
          {formatMoney(
            totalINR,
            country
          )}
        </strong>
      </div>

      <button
        className="add-bag"
        onClick={
          onCheckout
        }
      >
        SECURE CHECKOUT
      </button>
    </aside>
  );
}


function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript =
      document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => resolve(true),
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () => resolve(false),
        { once: true }
      );

      return;
    }

    const script =
      document.createElement(
        "script"
      );

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.onload = () =>
      resolve(true);

    script.onerror = () =>
      resolve(false);

    document.body.appendChild(
      script
    );
  });
}


function CheckoutPage({
  country,
  items,
  totalINR,
  navigate,
  clearCart,
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [addresses, setAddresses] =
    useState([]);

  const [selectedAddress, setSelectedAddress] =
    useState("");

  const [savingAddress, setSavingAddress] =
    useState(false);

  const [placing, setPlacing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successOrder, setSuccessOrder] =
    useState(null);

  const [paymentMethod, setPaymentMethod] =
    useState("RAZORPAY");

  const [addressForm, setAddressForm] =
    useState({
      fullName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
    });


  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const account =
          await authApi.me();

        if (!active) return;

        setUser(
          account.user
        );

        setAddressForm(
          (current) => ({
            ...current,
            fullName:
              account.user.fullName ||
              "",
          })
        );


        const addressResult =
          await addressApi.list();

        if (!active) return;


        setAddresses(
          addressResult.addresses
        );


        const defaultAddress =
          addressResult.addresses.find(
            (address) =>
              address.isDefault
          ) ||
          addressResult.addresses[0];


        if (defaultAddress) {
          setSelectedAddress(
            defaultAddress.id
          );
        }

      } catch (err) {

        if (
          err.status !== 401
        ) {
          setError(
            err.message
          );
        }

      } finally {

        if (active) {
          setLoading(
            false
          );
        }
      }
    }


    load();


    return () => {
      active = false;
    };
  }, []);


  function updateAddressField(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setAddressForm(
      (current) => ({
        ...current,
        [name]:
          value,
      })
    );
  }


  async function saveAddress(
    event
  ) {
    event.preventDefault();

    setSavingAddress(
      true
    );

    setError("");


    try {

      const result =
        await addressApi.create({
          ...addressForm,
          isDefault:
            addresses.length ===
            0,
        });


      const updated =
        [
          result.address,
          ...addresses.filter(
            (address) =>
              address.id !==
              result.address.id
          ),
        ];


      setAddresses(
        updated
      );


      setSelectedAddress(
        result.address.id
      );


      setAddressForm({
        fullName:
          user?.fullName ||
          "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      });

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setSavingAddress(
        false
      );
    }
  }


  async function placeOrder() {
    if (!selectedAddress) {
      setError(
        "Please select or add a delivery address."
      );
      return;
    }

    if (items.length === 0) {
      setError(
        "Your shopping bag is empty."
      );
      return;
    }

    setPlacing(true);
    setError("");

    const orderItems =
      items.map((item) => ({
        productId:
          item.product.id,
        size:
          item.size,
        quantity:
          item.quantity,
      }));

    // --------------------------------------------------------
    // CASH ON DELIVERY
    // --------------------------------------------------------

    if (paymentMethod === "COD") {
      try {
        const result =
          await orderApi.create({
            addressId:
              selectedAddress,
            paymentMethod:
              "COD",
            items:
              orderItems,
          });

        setSuccessOrder(
          result.order
        );

        clearCart();

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (err) {
        setError(
          err.message ||
          "Could not place your order."
        );
      } finally {
        setPlacing(false);
      }

      return;
    }

    // --------------------------------------------------------
    // ONLINE PAYMENT / RAZORPAY
    // --------------------------------------------------------

    try {
      const loaded =
        await loadRazorpayScript();

      if (!loaded) {
        throw new Error(
          "Secure payment checkout could not be loaded. Please check your connection and try again."
        );
      }

      const result =
        await orderApi.create({
          addressId:
            selectedAddress,
          paymentMethod:
            "RAZORPAY",
          items:
            orderItems,
        });

      if (
        !result?.order?.id ||
        !result?.payment?.keyId ||
        !result?.payment
          ?.razorpayOrderId
      ) {
        throw new Error(
          "Payment could not be prepared. Please try again."
        );
      }

      const options = {
        key:
          result.payment.keyId,

        amount:
          result.payment.amount,

        currency:
          result.payment.currency,

        name:
          result.payment.name ||
          "DESIGLOV",

        description:
          result.payment.description ||
          `Order ${result.order.orderNumber}`,

        order_id:
          result.payment
            .razorpayOrderId,

        // Keep Razorpay Checkout aligned with the
        // backend's 15-minute stock reservation window.
        timeout: 900,

        prefill:
          result.payment.prefill ||
          {},

        theme: {
          color: "#111111",
        },

        modal: {
          ondismiss: () => {
            setPlacing(false);
          },
        },

        handler: async (
          response
        ) => {
          try {
            const verified =
              await orderApi
                .verifyPayment({
                  orderId:
                    result.order.id,

                  razorpayOrderId:
                    response
                      .razorpay_order_id,

                  razorpayPaymentId:
                    response
                      .razorpay_payment_id,

                  razorpaySignature:
                    response
                      .razorpay_signature,
                });

            setSuccessOrder(
              verified.order
            );

            clearCart();

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          } catch (err) {
            setError(
              err.message ||
              "Payment was received but verification could not be completed. Please contact DESIGLOV before trying again."
            );
          } finally {
            setPlacing(false);
          }
        },
      };

      const razorpay =
        new window.Razorpay(
          options
        );

      razorpay.on(
        "payment.failed",
        (response) => {
          const message =
            response?.error
              ?.description ||
            "Payment was not completed. Please try again.";

          setError(message);
          setPlacing(false);
        }
      );

      razorpay.open();
    } catch (err) {
      setError(
        err.message ||
        "Online payment could not be started."
      );

      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHero
          eyebrow="SECURE CHECKOUT"
          title="Complete your order."
          text="Preparing your checkout..."
        />

        <div className="checkout-loading">
          Loading checkout
        </div>
      </>
    );
  }


  if (!user) {
    return (
      <>
        <PageHero
          eyebrow="SECURE CHECKOUT"
          title="Sign in to continue."
          text="Your account keeps your orders and delivery details together."
        />

        <section className="checkout-login-required">
          <h2>
            Already have a DEsiglov account?
          </h2>

          <p>
            Sign in or create an account before completing your order.
          </p>

          <button
            className="add-bag"
            onClick={() =>
              navigate(
                "/account"
              )
            }
          >
            SIGN IN / CREATE ACCOUNT
          </button>
        </section>
      </>
    );
  }


  if (successOrder) {
    return (
      <>
        <PageHero
          eyebrow="ORDER CONFIRMED"
          title="Thank you."
          text="Your DEsiglov order has been placed."
        />

        <section className="order-confirmation">

          <div className="confirmation-mark">
            ✓
          </div>

          <small>
            ORDER NUMBER
          </small>

          <h2>
            {
              successOrder.orderNumber
            }
          </h2>

          <p>
            {successOrder.paymentMethod === "COD"
              ? "Your order has been recorded successfully. Payment will be collected by Cash on Delivery."
              : "Your payment has been verified successfully and your order is confirmed."}
          </p>

          <div className="confirmation-total">
            <span>
              ORDER TOTAL
            </span>

            <strong>
              ₹
              {
                successOrder.totalINR
                  .toLocaleString(
                    "en-IN"
                  )
              }
            </strong>
          </div>

          <div className="confirmation-actions">

            <button
              className="button-dark"
              onClick={() =>
                navigate(
                  "/account"
                )
              }
            >
              VIEW MY ORDERS
            </button>

            <button
              className="button-outline"
              onClick={() =>
                navigate(
                  "/shop"
                )
              }
            >
              CONTINUE SHOPPING
            </button>

          </div>

        </section>
      </>
    );
  }


  const subtotal =
    totalINR;

  const selectedAddressData =
    addresses.find(
      (address) =>
        address.id ===
        selectedAddress
    );

  const normalisedState =
    (
      selectedAddressData?.state ||
      ""
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const isTamilNadu =
    normalisedState ===
      "tamil nadu" ||
    normalisedState ===
      "tamilnadu" ||
    normalisedState ===
      "tn";

  const shipping =
    subtotal >= 2999
      ? 0
      : isTamilNadu
        ? 70
        : 99;

  const codFee =
    paymentMethod === "COD"
      ? 30
      : 0;

  const finalTotal =
    subtotal +
    shipping +
    codFee;


  return (
    <>
      <PageHero
        eyebrow="SECURE CHECKOUT"
        title="Complete your order."
        text={`Signed in as ${user.email}`}
      />


      <section className="checkout-page">

        <div className="checkout-form">

          {error && (
            <div className="auth-message error">
              {error}
            </div>
          )}


          <CheckoutBlock
            number="01"
            title="DELIVERY ADDRESS"
          >

            {addresses.length > 0 && (
              <div className="saved-address-list">

                {addresses.map(
                  (address) => (

                    <label
                      key={
                        address.id
                      }
                      className={`checkout-address-card ${
                        selectedAddress ===
                        address.id
                          ? "selected"
                          : ""
                      }`}
                    >

                      <input
                        type="radio"
                        name="deliveryAddress"
                        value={
                          address.id
                        }
                        checked={
                          selectedAddress ===
                          address.id
                        }
                        onChange={() =>
                          setSelectedAddress(
                            address.id
                          )
                        }
                      />

                      <div>
                        <div className="address-card-heading">
                          <strong>
                            {
                              address.fullName
                            }
                          </strong>

                          {address.isDefault && (
                            <span>
                              DEFAULT
                            </span>
                          )}
                        </div>

                        <p>
                          {
                            address.line1
                          }
                          {address.line2
                            ? `, ${address.line2}`
                            : ""}
                        </p>

                        <p>
                          {
                            address.city
                          },{" "}
                          {
                            address.state
                          }{" "}
                          {
                            address.postalCode
                          }
                        </p>

                        <p>
                          {
                            address.country
                          }
                        </p>

                        <small>
                          {
                            address.phone
                          }
                        </small>
                      </div>

                    </label>

                  )
                )}

              </div>
            )}


            <div className="new-address-heading">

              <span>
                {addresses.length > 0
                  ? "ADD ANOTHER ADDRESS"
                  : "ADD DELIVERY ADDRESS"}
              </span>

            </div>


            <form
              className="address-form"
              onSubmit={
                saveAddress
              }
            >

              <div className="form-grid">

                <input
                  required
                  name="fullName"
                  value={
                    addressForm.fullName
                  }
                  onChange={
                    updateAddressField
                  }
                  placeholder="Full name"
                />


                <input
                  required
                  name="phone"
                  value={
                    addressForm.phone
                  }
                  onChange={
                    updateAddressField
                  }
                  placeholder="Mobile number"
                />


                <input
                  required
                  className="full-field"
                  name="line1"
                  value={
                    addressForm.line1
                  }
                  onChange={
                    updateAddressField
                  }
                  placeholder="Address"
                />


                <input
                  className="full-field"
                  name="line2"
                  value={
                    addressForm.line2
                  }
                  onChange={
                    updateAddressField
                  }
                  placeholder="Apartment, landmark, etc. (optional)"
                />


                <input
                  required
                  name="city"
                  value={
                    addressForm.city
                  }
                  onChange={
                    updateAddressField
                  }
                  placeholder="City"
                />


                <input
                  required
                  name="state"
                  value={
                    addressForm.state
                  }
                  onChange={
                    updateAddressField
                  }
                  placeholder="State"
                />


                <input
                  required
                  name="postalCode"
                  value={
                    addressForm.postalCode
                  }
                  onChange={
                    updateAddressField
                  }
                  placeholder="PIN code"
                />


                <input
                  required
                  name="country"
                  value={
                    addressForm.country
                  }
                  onChange={
                    updateAddressField
                  }
                  placeholder="Country"
                />

              </div>


              <button
                className="save-address-button"
                disabled={
                  savingAddress
                }
              >
                {savingAddress
                  ? "SAVING..."
                  : "SAVE ADDRESS"}
              </button>

            </form>

          </CheckoutBlock>


          <CheckoutBlock
            number="02"
            title="DELIVERY"
          >

            <div className="delivery-option-card">

              <div>

                <strong>
                  Standard Delivery
                </strong>

                <p>
                  Carefully packed and delivered to your address.
                </p>

              </div>

              <span>
                {shipping === 0
                  ? "FREE"
                  : `₹${shipping}`}
              </span>

            </div>

          </CheckoutBlock>


          <CheckoutBlock
            number="03"
            title="PAYMENT"
          >
            <label
              className={`payment-choice ${
                paymentMethod === "RAZORPAY"
                  ? "active-payment"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="RAZORPAY"
                checked={
                  paymentMethod ===
                  "RAZORPAY"
                }
                onChange={() =>
                  setPaymentMethod(
                    "RAZORPAY"
                  )
                }
              />

              <div>
                <strong>
                  Online Payment
                </strong>

                <small>
                  Pay securely using UPI, cards, net banking or other available payment methods.
                </small>
              </div>
            </label>

            <label
              className={`payment-choice ${
                paymentMethod === "COD"
                  ? "active-payment"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="COD"
                checked={
                  paymentMethod ===
                  "COD"
                }
                onChange={() =>
                  setPaymentMethod(
                    "COD"
                  )
                }
              />

              <div>
                <strong>
                  Cash on Delivery
                </strong>

                <small>
                  Pay when your order arrives. ₹30 convenience fee applies.
                </small>
              </div>
            </label>
          </CheckoutBlock>


          <button
            className="add-bag checkout-submit"
            disabled={
              placing ||
              items.length ===
              0
            }
            onClick={
              placeOrder
            }
          >
            {placing
              ? paymentMethod === "COD"
                ? "PLACING ORDER..."
                : "PREPARING PAYMENT..."
              : paymentMethod === "COD"
                ? "PLACE COD ORDER"
                : "PROCEED TO PAYMENT"}
          </button>

        </div>


        <aside className="checkout-summary">

          <h3>
            YOUR ORDER
          </h3>


          {items.map(
            (item) => (

              <div
                className="checkout-item"
                key={
                  item.key
                }
              >

                <img
                  src={
                    item.product.images[0]
                  }
                  alt={
                    item.product.name
                  }
                />


                <div>

                  <strong>
                    {
                      item.product.name
                    }
                  </strong>

                  <small>
                    {
                      item.size
                    }{" "}
                    · Qty{" "}
                    {
                      item.quantity
                    }
                  </small>

                </div>


                <span>
                  {formatMoney(
                    item.product.priceINR *
                    item.quantity,
                    country
                  )}
                </span>

              </div>

            )
          )}


          <div className="checkout-price-row">

            <span>
              Subtotal
            </span>

            <strong>
              ₹
              {
                subtotal
                  .toLocaleString(
                    "en-IN"
                  )
              }
            </strong>

          </div>


          <div className="checkout-price-row">

            <span>
              Delivery
            </span>

            <strong>
              {shipping === 0
                ? "FREE"
                : `₹${shipping}`}
            </strong>

          </div>


          {paymentMethod === "COD" && (
            <div className="checkout-price-row">
              <span>
                COD convenience fee
              </span>

              <strong>
                ₹{codFee.toLocaleString(
                  "en-IN"
                )}
              </strong>
            </div>
          )}

          <div className="summary-total">

            <span>
              TOTAL
            </span>

            <strong>
              ₹
              {
                finalTotal
                  .toLocaleString(
                    "en-IN"
                  )
              }
            </strong>

          </div>


          <button
            className="back-shopping"
            onClick={() =>
              navigate(
                "/cart"
              )
            }
          >
            ← BACK TO BAG
          </button>

        </aside>

      </section>
    </>
  );
}
function CheckoutBlock({
  number,
  title,
  children,
}) {
  return (
    <section className="checkout-block">
      <div className="checkout-block-title">
        <span>
          {number}
        </span>

        <h3>
          {title}
        </h3>
      </div>

      {children}
    </section>
  );
}



function AccountPage({
  navigate,
}) {
  const [mode, setMode] =
    useState("login");
  const [user, setUser] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");
  const [addresses, setAddresses] =
    useState([]);
  const [orders, setOrders] =
    useState([]);

  const [form, setForm] =
    useState({
      fullName: "",
      email: "",
      password: "",
    });

  const [registrationOtp, setRegistrationOtp] =
    useState("");
  const [pendingRegistrationEmail, setPendingRegistrationEmail] =
    useState("");
  const [registrationStep, setRegistrationStep] =
    useState("details");

  function mapSupabaseUser(
    supabaseUser
  ) {
    if (!supabaseUser) {
      return null;
    }

    const metadata =
      supabaseUser.user_metadata ||
      {};

    return {
      id: supabaseUser.id,
      email:
        supabaseUser.email ||
        "",
      fullName:
        metadata.full_name ||
        metadata.name ||
        supabaseUser.email
          ?.split("@")[0] ||
        "Customer",
    };
  }

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      try {
        const {
          data,
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!active) {
          return;
        }

        const sessionUser =
          data.session?.user;

        setUser(
          mapSupabaseUser(
            sessionUser
          )
        );

        if (sessionUser) {
          const [
            addressResult,
            orderResult,
          ] =
            await Promise.all([
              addressApi.list(),
              orderApi.list(),
            ]);

          if (!active) {
            return;
          }

          setAddresses(
            Array.isArray(
              addressResult?.addresses
            )
              ? addressResult.addresses
              : []
          );

          setOrders(
            Array.isArray(
              orderResult?.orders
            )
              ? orderResult.orders
              : []
          );
        } else {
          setAddresses([]);
          setOrders([]);
        }
      } catch (err) {
        console.error(
          "Account load error:",
          err
        );

        if (active) {
          setError(
            err.message ||
            "Could not load your account."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAccount();

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {
          if (!active) {
            return;
          }

          setUser(
            mapSupabaseUser(
              session?.user
            )
          );

          if (
            event ===
            "SIGNED_OUT"
          ) {
            setAddresses([]);
            setOrders([]);
          }
        }
      );

    return () => {
      active = false;
      authListener.subscription
        .unsubscribe();
    };
  }, []);

  function updateField(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  function changeMode(
    nextMode
  ) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setRegistrationOtp("");
    setPendingRegistrationEmail("");
    setRegistrationStep("details");

    setForm({
      fullName: "",
      email: "",
      password: "",
    });
  }

  async function submit(
    event
  ) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (
        mode ===
        "register"
      ) {
        if (
          !form.fullName.trim()
        ) {
          throw new Error(
            "Please enter your full name."
          );
        }

        if (
          form.password.length < 8
        ) {
          throw new Error(
            "Password must contain at least 8 characters."
          );
        }

        const cleanEmail =
          form.email
            .trim()
            .toLowerCase();

        const {
          data,
          error: registerError,
        } =
          await supabase.auth.signUp({
            email: cleanEmail,
            password:
              form.password,
            options: {
              data: {
                full_name:
                  form.fullName.trim(),
              },
            },
          });

        if (registerError) {
          throw registerError;
        }

        if (
          data.session &&
          data.user
        ) {
          setUser(
            mapSupabaseUser(
              data.user
            )
          );

          setMessage(
            "Your DEsiglov account has been created."
          );

          return;
        }

        setPendingRegistrationEmail(
          cleanEmail
        );
        setRegistrationStep(
          "otp"
        );
        setRegistrationOtp("");

        setMessage(
          `We sent an 8-digit verification code to ${cleanEmail}.`
        );
      } else {
        const {
          data,
          error: loginError,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                form.email
                  .trim()
                  .toLowerCase(),
              password:
                form.password,
            });

        if (loginError) {
          throw loginError;
        }

        if (!data.user) {
          throw new Error(
            "Unable to sign in."
          );
        }

        setUser(
          mapSupabaseUser(
            data.user
          )
        );

        setMessage(
          "Welcome back to DEsiglov."
        );

        setForm({
          fullName: "",
          email: "",
          password: "",
        });
      }

      setAddresses([]);
      setOrders([]);
    } catch (err) {
      console.error(
        "Authentication error:",
        err
      );

      setError(
        err.message ||
        "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyRegistrationOtp(
    event
  ) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const cleanOtp =
        registrationOtp
          .replace(/\D/g, "")
          .slice(0, 8);

      if (
        cleanOtp.length !== 8
      ) {
        throw new Error(
          "Enter the 8-digit verification code."
        );
      }

      const {
        data,
        error: verifyError,
      } =
        await supabase.auth.verifyOtp({
          email:
            pendingRegistrationEmail,
          token: cleanOtp,
          type: "signup",
        });

      if (verifyError) {
        throw verifyError;
      }

      if (!data.user) {
        throw new Error(
          "Unable to verify this code."
        );
      }

      setUser(
        mapSupabaseUser(
          data.user
        )
      );

      setRegistrationOtp("");
      setPendingRegistrationEmail("");
      setRegistrationStep(
        "details"
      );

      setForm({
        fullName: "",
        email: "",
        password: "",
      });

      setMessage(
        "Email verified. Your DEsiglov account is ready."
      );
    } catch (err) {
      console.error(
        "Registration OTP error:",
        err
      );

      setError(
        err.message ||
        "The verification code is invalid or has expired."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resendRegistrationOtp() {
    if (
      !pendingRegistrationEmail
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const {
        error: resendError,
      } =
        await supabase.auth.resend({
          type: "signup",
          email:
            pendingRegistrationEmail,
        });

      if (resendError) {
        throw resendError;
      }

      setMessage(
        `A new verification code was sent to ${pendingRegistrationEmail}.`
      );
    } catch (err) {
      setError(
        err.message ||
        "Could not resend the verification code."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const {
        error: logoutError,
      } =
        await supabase.auth.signOut();

      if (logoutError) {
        throw logoutError;
      }

      setUser(null);
      setAddresses([]);
      setOrders([]);
      setMode("login");
      setRegistrationStep(
        "details"
      );
      setPendingRegistrationEmail(
        ""
      );
      setRegistrationOtp("");

      setMessage(
        "You have been signed out."
      );
    } catch (err) {
      setError(
        err.message ||
        "Could not sign out."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHero
          eyebrow="YOUR DESIGLOV"
          title="Your account."
          text="Checking your account..."
        />

        <section className="account-page">
          <div className="account-loading">
            <span />
            <p>
              Loading account
            </p>
          </div>
        </section>
      </>
    );
  }

  if (user) {
    return (
      <>
        <PageHero
          eyebrow="YOUR DESIGLOV"
          title={`Hello, ${
            user.fullName
              .split(" ")[0]
          }.`}
          text="Orders, addresses and account details."
        />

        <section className="account-page logged-account">
          {message && (
            <div className="auth-message success">
              {message}
            </div>
          )}

          {error && (
            <div className="auth-message error">
              {error}
            </div>
          )}

          <div className="account-card">
            <div className="account-card-number">
              01
            </div>

            <div>
              <small>
                ACCOUNT DETAILS
              </small>

              <h2>
                {user.fullName}
              </h2>

              <p>
                {user.email}
              </p>
            </div>
          </div>

          <div className="account-section">
            <div className="account-section-heading">
              <div>
                <span>
                  02
                </span>

                <div>
                  <small>
                    ORDERS
                  </small>

                  <h2>
                    Your orders
                  </h2>
                </div>
              </div>

              <strong>
                {orders.length} ORDER
                {orders.length === 1
                  ? ""
                  : "S"}
              </strong>
            </div>

            {orders.length === 0 ? (
              <div className="account-empty-block">
                <h3>No orders yet.</h3>
                <p>
                  Your completed orders will appear here.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "18px",
                  marginTop: "22px",
                }}
              >
                {orders.map((order) => {
                  const codFee =
                    order.paymentMethod === "COD"
                      ? Math.max(
                          0,
                          Number(order.totalINR || 0) -
                            Number(order.subtotalINR || 0) -
                            Number(order.shippingINR || 0)
                        )
                      : 0;

                  return (
                    <article
                      key={order.id}
                      style={{
                        border: "1px solid #e7ddd7",
                        background: "#fff",
                        padding: "24px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "20px",
                          flexWrap: "wrap",
                          paddingBottom: "18px",
                          borderBottom: "1px solid #eee6e1",
                        }}
                      >
                        <div>
                          <small
                            style={{
                              display: "block",
                              letterSpacing: "0.15em",
                              marginBottom: "8px",
                            }}
                          >
                            ORDER NUMBER
                          </small>

                          <h3 style={{ margin: 0 }}>
                            {order.orderNumber}
                          </h3>

                          <p style={{ margin: "8px 0 0" }}>
                            {order.createdAt
                              ? new Date(
                                  order.createdAt
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })
                              : ""}
                          </p>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <strong
                            style={{
                              display: "block",
                              marginBottom: "7px",
                            }}
                          >
                            {order.status}
                          </strong>

                          <span>
                            {order.paymentMethod} ·{" "}
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {Array.isArray(order.items) &&
                      order.items.length > 0 ? (
                        <div
                          style={{
                            display: "grid",
                            gap: "14px",
                            padding: "18px 0",
                          }}
                        >
                          {order.items.map((item, index) => (
                            <div
                              key={
                                item.productId ||
                                `${order.id}-${index}`
                              }
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: "20px",
                              }}
                            >
                              <div>
                                <strong>
                                  {item.productName}
                                </strong>

                                <div
                                  style={{
                                    marginTop: "5px",
                                    fontSize: "13px",
                                  }}
                                >
                                  {item.size
                                    ? `Size ${item.size} · `
                                    : ""}
                                  Qty {item.quantity}
                                </div>
                              </div>

                              <strong>
                                ₹
                                {(
                                  Number(
                                    item.unitPriceINR || 0
                                  ) *
                                  Number(item.quantity || 1)
                                ).toLocaleString("en-IN")}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div
                        style={{
                          borderTop: "1px solid #eee6e1",
                          paddingTop: "16px",
                          display: "grid",
                          gap: "9px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Subtotal</span>
                          <span>
                            ₹
                            {Number(
                              order.subtotalINR || 0
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Delivery</span>
                          <span>
                            ₹
                            {Number(
                              order.shippingINR || 0
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>

                        {codFee > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>COD convenience fee</span>
                            <span>
                              ₹{codFee.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ) : null}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            borderTop: "1px solid #eee6e1",
                            paddingTop: "13px",
                            marginTop: "4px",
                            fontSize: "18px",
                          }}
                        >
                          <strong>Total</strong>
                          <strong>
                            ₹
                            {Number(
                              order.totalINR || 0
                            ).toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="account-section">
            <div className="account-section-heading">
              <div>
                <span>
                  03
                </span>

                <div>
                  <small>
                    SAVED ADDRESSES
                  </small>

                  <h2>
                    Delivery details
                  </h2>
                </div>
              </div>
            </div>

            {addresses.length === 0 ? (
              <div className="account-empty-block">
                <h3>No saved address yet.</h3>
                <p>
                  Your delivery address can be added during checkout.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "16px",
                  marginTop: "22px",
                }}
              >
                {addresses.map((address) => (
                  <article
                    key={address.id}
                    style={{
                      border: "1px solid #e7ddd7",
                      background: "#fff",
                      padding: "24px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "20px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: "0 0 10px" }}>
                          {address.fullName}
                        </h3>

                        <p
                          style={{
                            margin: 0,
                            lineHeight: 1.8,
                          }}
                        >
                          {address.line1}
                          <br />

                          {address.line2 ? (
                            <>
                              {address.line2}
                              <br />
                            </>
                          ) : null}

                          {address.city}, {address.state}{" "}
                          {address.postalCode}
                          <br />

                          {address.country}
                          <br />

                          {address.phone}
                        </p>
                      </div>

                      {address.isDefault ? (
                        <strong
                          style={{
                            fontSize: "10px",
                            letterSpacing: "0.15em",
                            border: "1px solid #c9a58f",
                            padding: "7px 10px",
                          }}
                        >
                          DEFAULT
                        </strong>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <button
            className="account-logout"
            type="button"
            disabled={submitting}
            onClick={logout}
          >
            {submitting
              ? "SIGNING OUT..."
              : "SIGN OUT"}
          </button>
        </section>
      </>
    );
  }

  if (
    mode === "register" &&
    registrationStep === "otp"
  ) {
    return (
      <>
        <PageHero
          eyebrow="VERIFY YOUR EMAIL"
          title="Enter your code."
          text={`We sent an 8-digit verification code to ${pendingRegistrationEmail}.`}
        />

        <section className="account-page">
          {message && (
            <div className="auth-message success">
              {message}
            </div>
          )}

          {error && (
            <div className="auth-message error">
              {error}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={
              verifyRegistrationOtp
            }
          >
            <label className="auth-field">
              <span>
                8-DIGIT CODE
              </span>

              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength="8"
                value={
                  registrationOtp
                }
                onChange={(event) =>
                  setRegistrationOtp(
                    event.target.value
                      .replace(
                        /\D/g,
                        ""
                      )
                      .slice(0, 8)
                  )
                }
                placeholder="00000000"
                style={{
                  textAlign:
                    "center",
                  letterSpacing:
                    "0.35em",
                  fontSize:
                    "1.35rem",
                }}
              />
            </label>

            <button
              className="add-bag auth-submit"
              disabled={submitting}
            >
              {submitting
                ? "VERIFYING..."
                : "VERIFY & CREATE ACCOUNT"}
            </button>
          </form>

          <div className="account-switch">
            Didn't receive the code?

            <button
              type="button"
              disabled={submitting}
              onClick={
                resendRegistrationOtp
              }
            >
              Resend code
            </button>
          </div>

          <div className="account-switch">
            Wrong email?

            <button
              type="button"
              onClick={() => {
                setRegistrationStep(
                  "details"
                );
                setRegistrationOtp(
                  ""
                );
                setError("");
                setMessage("");
              }}
            >
              Change email
            </button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="YOUR DESIGLOV"
        title={
          mode === "register"
            ? "Create account."
            : "Welcome back."
        }
        text={
          mode === "register"
            ? "Create your account and verify your email with a secure code."
            : "Sign in to your DEsiglov account."
        }
      />

      <section className="account-page">
        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode === "login"
                ? "active"
                : ""
            }
            onClick={() =>
              changeMode(
                "login"
              )
            }
          >
            SIGN IN
          </button>

          <button
            type="button"
            className={
              mode === "register"
                ? "active"
                : ""
            }
            onClick={() =>
              changeMode(
                "register"
              )
            }
          >
            CREATE ACCOUNT
          </button>
        </div>

        {message && (
          <div className="auth-message success">
            {message}
          </div>
        )}

        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={submit}
        >
          {mode ===
            "register" && (
            <label className="auth-field">
              <span>
                FULL NAME
              </span>

              <input
                required
                name="fullName"
                value={
                  form.fullName
                }
                onChange={
                  updateField
                }
                placeholder="Your full name"
                autoComplete="name"
              />
            </label>
          )}

          <label className="auth-field">
            <span>
              EMAIL ADDRESS
            </span>

            <input
              required
              type="email"
              name="email"
              value={
                form.email
              }
              onChange={
                updateField
              }
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>
              PASSWORD
            </span>

            <input
              required
              minLength="8"
              type="password"
              name="password"
              value={
                form.password
              }
              onChange={
                updateField
              }
              placeholder="At least 8 characters"
              autoComplete={
                mode === "register"
                  ? "new-password"
                  : "current-password"
              }
            />
          </label>

          {mode === "login" && (
            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginTop:
                  "-8px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/forgot-password"
                  )
                }
                style={{
                  border: 0,
                  background:
                    "transparent",
                  padding: 0,
                  cursor:
                    "pointer",
                  textDecoration:
                    "underline",
                  font: "inherit",
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            className="add-bag auth-submit"
            disabled={submitting}
          >
            {submitting
              ? "PLEASE WAIT..."
              : mode ===
                "register"
              ? "CREATE ACCOUNT"
              : "SIGN IN"}
          </button>
        </form>

        <div className="account-switch">
          {mode === "register"
            ? "Already have an account?"
            : "New to DEsiglov?"}

          <button
            type="button"
            onClick={() =>
              changeMode(
                mode ===
                  "register"
                  ? "login"
                  : "register"
              )
            }
          >
            {mode === "register"
              ? "Sign in"
              : "Create account"}
          </button>
        </div>

        <div className="account-security-note">
          <span>
            ◇
          </span>

          <p>
            Your password is securely managed by Supabase Authentication and is never stored as plain text by DEsiglov.
          </p>
        </div>
      </section>
    </>
  );
}

function AdminPage({
  navigate,
}) {

  const EMPTY_PRODUCT = {
    name: "",
    category: "Kurtis",
    subcategory: "",
    priceINR: "",
    stock: "",
    badge: "",
    colour: "",
    material: "",
    description: "",
    sizes: [
      "S",
      "M",
      "L",
    ],
    active: true,
  };


  const [loading, setLoading] =
    useState(true);

  const [allowed, setAllowed] =
    useState(false);

  const [tab, setTab] =
    useState("dashboard");

  const [stats, setStats] =
    useState(null);

  const [recentOrders, setRecentOrders] =
    useState([]);

  const [orders, setOrders] =
    useState([]);

  const [customers, setCustomers] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [editorMode, setEditorMode] =
    useState("create");

  const [editingProduct, setEditingProduct] =
    useState(null);

  const [productForm, setProductForm] =
    useState(
      EMPTY_PRODUCT
    );

  const [newImages, setNewImages] =
    useState([]);

  const [savingProduct, setSavingProduct] =
    useState(false);


  useEffect(() => {

    let active = true;


    async function initialise() {

      try {

        const session =
          await adminApi.session();


        if (!active) {
          return;
        }


        if (
          !session.authenticated ||
          session.admin.role !==
          "ADMIN"
        ) {

          setAllowed(false);

          return;
        }


        setAllowed(true);


        const result =
          await adminApi.dashboard();


        if (!active) {
          return;
        }


        setStats(
          result.stats
        );

        setRecentOrders(
          result.recentOrders
        );

      } catch (err) {

        setError(
          err.message ||
          "Could not load admin dashboard."
        );

      } finally {

        if (active) {
          setLoading(false);
        }
      }
    }


    initialise();


    return () => {
      active = false;
    };

  }, []);


  async function refreshProducts() {

    const result =
      await adminApi.products();


    setProducts(
      result.products
    );
  }


  async function changeTab(
    nextTab
  ) {

    setTab(
      nextTab
    );

    setMessage("");
    setError("");

    setEditorOpen(false);


    try {

      if (
        nextTab ===
        "dashboard"
      ) {

        const result =
          await adminApi.dashboard();

        setStats(
          result.stats
        );

        setRecentOrders(
          result.recentOrders
        );
      }


      if (
        nextTab ===
        "orders"
      ) {

        const result =
          await adminApi.orders();

        setOrders(
          result.orders
        );
      }


      if (
        nextTab ===
        "customers"
      ) {

        const result =
          await adminApi.customers();

        setCustomers(
          result.customers
        );
      }


      if (
        nextTab ===
        "products"
      ) {

        await refreshProducts();
      }

    } catch (err) {

      setError(
        err.message
      );
    }
  }


  async function updateStatus(
    orderId,
    status
  ) {

    try {

      await adminApi.updateOrderStatus(
        orderId,
        status
      );


      const result =
        await adminApi.orders();


      setOrders(
        result.orders
      );


      setMessage(
        "Order status updated."
      );

    } catch (err) {

      setError(
        err.message
      );
    }
  }


  function openCreateProduct() {

    setEditorMode(
      "create"
    );

    setEditingProduct(
      null
    );

    setProductForm({
      ...EMPTY_PRODUCT,

      sizes: [
        ...EMPTY_PRODUCT.sizes,
      ],
    });

    setNewImages([]);

    setEditorOpen(true);

    setMessage("");
    setError("");
  }


  function openEditProduct(
    product
  ) {

    setEditorMode(
      "edit"
    );

    setEditingProduct(
      product
    );

    setProductForm({
      name:
        product.name ||
        "",

      category:
        product.category ||
        "Kurtis",

      subcategory:
        product.subcategory ||
        "",

      priceINR:
        String(
          product.priceINR ??
          ""
        ),

      stock:
        String(
          product.stock ??
          ""
        ),

      badge:
        product.badge ||
        "",

      colour:
        product.colour ||
        "",

      material:
        product.material ||
        "",

      description:
        product.description ||
        "",

      sizes:
        Array.isArray(
          product.sizes
        )
          ? [
              ...product.sizes,
            ]
          : [],

      active:
        Boolean(
          product.active
        ),
    });

    setNewImages([]);

    setEditorOpen(true);

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  function updateForm(
    field,
    value
  ) {

    setProductForm(
      (current) => ({
        ...current,

        [field]:
          value,
      })
    );
  }


  function sizesText() {

    return productForm
      .sizes
      .join(", ");
  }


  function updateSizes(
    value
  ) {

    const sizes =
      value
        .split(",")
        .map(
          (item) =>
            item
              .trim()
              .toUpperCase()
        )
        .filter(Boolean);


    updateForm(
      "sizes",
      sizes
    );
  }


  async function submitProduct(
    event
  ) {

    event.preventDefault();

    setSavingProduct(true);

    setMessage("");
    setError("");


    try {

      const data = {

        name:
          productForm.name,

        category:
          productForm.category,

        subcategory:
          productForm.category === "Jewellery"
            ? productForm.subcategory
            : "",

        priceINR:
          Number(
            productForm.priceINR
          ),

        stock:
          Number(
            productForm.stock
          ),

        badge:
          productForm.badge,

        colour:
          productForm.colour,

        material:
          productForm.material,

        description:
          productForm.description,

        sizes:
          productForm.sizes,

        active:
          productForm.active,
      };


      if (
        editorMode ===
        "create"
      ) {

        await adminApi.createProduct({
          product:
            data,

          images:
            newImages,
        });


        setMessage(
          `${productForm.name} created successfully.`
        );

      } else {

        await adminApi.updateProductDetails(
          editingProduct.id,
          data
        );


        if (
          newImages.length >
          0
        ) {

          await adminApi.uploadProductImages(
            editingProduct.id,
            newImages
          );
        }


        setMessage(
          `${productForm.name} updated successfully.`
        );
      }


      await refreshProducts();


      setEditorOpen(false);

      setEditingProduct(null);

      setNewImages([]);

    } catch (err) {

      setError(
        err.message
      );

    } finally {

      setSavingProduct(false);
    }
  }


  async function setCoverImage(
    product,
    index
  ) {

    if (index === 0) {
      return;
    }

    try {

      setError("");
      setMessage("");

      await adminApi.setProductCover(
        product.id,
        index
      );

      const refreshed =
        await adminApi.products();

      setProducts(
        refreshed.products
      );

      const current =
        refreshed.products.find(
          (item) =>
            item.id ===
            product.id
        );

      if (current) {

        setEditingProduct(
          current
        );
      }

      setMessage(
        "Cover image updated."
      );

    } catch (error) {

      setError(
        error.message ||
          "Unable to update cover image."
      );
    }
  }


  async function removeImage(
    product,
    index
  ) {

    const confirmed =
      window.confirm(
        "Remove this product image?"
      );


    if (!confirmed) {
      return;
    }


    try {

      await adminApi.removeProductImage(
        product.id,
        index
      );


      await refreshProducts();


      const refreshed =
        await adminApi.products();


      const current =
        refreshed.products.find(
          (item) =>
            item.id ===
            product.id
        );


      if (current) {

        setEditingProduct(
          current
        );
      }


      setMessage(
        "Image removed."
      );

    } catch (err) {

      setError(
        err.message
      );
    }
  }


  async function archiveProduct(
    product
  ) {

    const confirmed =
      window.confirm(
        `Archive ${product.name}? It will disappear from the public shop.`
      );


    if (!confirmed) {
      return;
    }


    try {

      await adminApi.archiveProduct(
        product.id
      );


      await refreshProducts();


      setMessage(
        `${product.name} archived.`
      );

    } catch (err) {

      setError(
        err.message
      );
    }
  }


  async function quickToggle(
    product
  ) {

    try {

      await adminApi.updateProduct(
        product.id,
        {
          priceINR:
            Number(
              product.priceINR
            ),

          stock:
            Number(
              product.stock
            ),

          active:
            !product.active,
        }
      );


      await refreshProducts();

    } catch (err) {

      setError(
        err.message
      );
    }
  }


  if (loading) {

    return (
      <div className="admin-loading">
        Loading admin dashboard...
      </div>
    );
  }


  if (!allowed) {

    return (
      <section className="admin-denied">

        <div className="eyebrow">
          DESIGLOV ADMIN
        </div>

        <h1>
          Admin access only.
        </h1>

        <p>
          Sign in using the authorised DEsiglov admin account.
        </p>

        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}

        <button
          className="button-dark"
          onClick={() =>
            navigate(
              "/account"
            )
          }
        >
          GO TO SIGN IN
        </button>

      </section>
    );
  }


  return (
    <section className="admin-shell">

      <aside className="admin-sidebar">

        <div className="admin-brand">

          <small>
            DESIGLOV
          </small>

          <strong>
            ADMIN
          </strong>

        </div>


        <nav>

          <button
            className={
              tab ===
              "dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTab(
                "dashboard"
              )
            }
          >
            Dashboard
          </button>


          <button
            className={
              tab ===
              "orders"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTab(
                "orders"
              )
            }
          >
            Orders
          </button>


          <button
            className={
              tab ===
              "customers"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTab(
                "customers"
              )
            }
          >
            Customers
          </button>


          <button
            className={
              tab ===
              "products"
                ? "active"
                : ""
            }
            onClick={() =>
              changeTab(
                "products"
              )
            }
          >
            Products
          </button>

        </nav>


        <button
          className="admin-store-link"
          onClick={() =>
            navigate("/")
          }
        >
          ← View Store
        </button>

      </aside>


      <div className="admin-main">

        <div className="admin-topbar">

          <div>

            <div className="eyebrow">
              DESIGLOV CONTROL
            </div>

            <h1>
              {tab ===
              "dashboard"
                ? "Dashboard"
                : tab
                    .charAt(0)
                    .toUpperCase() +
                  tab.slice(1)}
            </h1>

          </div>


          <div className="admin-top-actions">

            {tab ===
              "products" && (

              <button
                className="admin-new-product"
                onClick={
                  openCreateProduct
                }
              >
                + NEW PRODUCT
              </button>

            )}


            <div className="admin-badge">
              ADMIN
            </div>

          </div>

        </div>


        {message && (
          <div className="auth-message success">
            {message}
          </div>
        )}


        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}


        {tab ===
          "dashboard" &&
          stats && (
          <>

            <div className="admin-stats">

              <AdminStat
                title="TOTAL ORDERS"
                value={
                  stats.orders
                }
              />

              <AdminStat
                title="CUSTOMERS"
                value={
                  stats.customers
                }
              />

              <AdminStat
                title="SALES VALUE"
                value={`₹${stats.revenueINR.toLocaleString(
                  "en-IN"
                )}`}
              />

              <AdminStat
                title="ACTIVE PRODUCTS"
                value={
                  stats.products
                }
              />

              <AdminStat
                title="TO FULFIL"
                value={
                  stats.pendingOrders
                }
              />

            </div>


            <div className="admin-panel">

              <div className="admin-panel-title">

                <div>

                  <small>
                    RECENT ACTIVITY
                  </small>

                  <h2>
                    Latest orders
                  </h2>

                </div>


                <button
                  onClick={() =>
                    changeTab(
                      "orders"
                    )
                  }
                >
                  VIEW ALL →
                </button>

              </div>


              <div className="admin-table-wrap">

                <table className="admin-table">

                  <thead>

                    <tr>

                      <th>
                        ORDER
                      </th>

                      <th>
                        CUSTOMER
                      </th>

                      <th>
                        STATUS
                      </th>

                      <th>
                        TOTAL
                      </th>

                      <th>
                        DATE
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {recentOrders.map(
                      (order) => (

                        <tr
                          key={
                            order.id
                          }
                        >

                          <td>
                            {
                              order.orderNumber
                            }
                          </td>

                          <td>

                            <strong>
                              {
                                order.customerName
                              }
                            </strong>

                            <small>
                              {
                                order.customerEmail
                              }
                            </small>

                          </td>

                          <td>
                            <StatusBadge
                              status={
                                order.status
                              }
                            />
                          </td>

                          <td>
                            ₹
                            {
                              order.totalINR.toLocaleString(
                                "en-IN"
                              )
                            }
                          </td>

                          <td>
                            {new Date(
                              order.createdAt
                            ).toLocaleDateString(
                              "en-GB"
                            )}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </>
        )}


        {tab ===
          "orders" && (

          <div className="admin-order-list">

            {orders.length ===
            0 ? (

              <div className="admin-empty">
                No orders yet.
              </div>

            ) : (

              orders.map(
                (order) => (

                  <article
                    className="admin-order-card"
                    key={
                      order.id
                    }
                  >

                    <div className="admin-order-head">

                      <div>

                        <small>
                          ORDER
                        </small>

                        <h2>
                          {
                            order.orderNumber
                          }
                        </h2>

                        <p>
                          {
                            order.customer.name
                          }{" "}
                          ·{" "}
                          {
                            order.customer.email
                          }
                        </p>

                      </div>


                      <strong>
                        ₹
                        {
                          order.totalINR.toLocaleString(
                            "en-IN"
                          )
                        }
                      </strong>

                    </div>


                    <div className="admin-order-controls">

                      <label>

                        ORDER STATUS

                        <select
                          value={
                            order.status
                          }
                          onChange={(e) =>
                            updateStatus(
                              order.id,
                              e.target.value
                            )
                          }
                        >

                          <option value="PLACED">
                            Placed
                          </option>

                          <option value="CONFIRMED">
                            Confirmed
                          </option>

                          <option value="PACKED">
                            Packed
                          </option>

                          <option value="SHIPPED">
                            Shipped
                          </option>

                          <option value="DELIVERED">
                            Delivered
                          </option>

                          <option value="CANCELLED">
                            Cancelled
                          </option>

                        </select>

                      </label>


                      <div>

                        <small>
                          PAYMENT
                        </small>

                        <strong>
                          {
                            order.paymentMethod
                          }{" "}
                          /{" "}
                          {
                            order.paymentStatus
                          }
                        </strong>

                      </div>

                    </div>


                    <div className="admin-order-products">

                      {order.items.map(
                        (
                          item,
                          index
                        ) => (

                          <div
                            key={
                              `${order.id}-${index}`
                            }
                          >

                            <span>
                              {
                                item.productName
                              }
                            </span>

                            <small>
                              {
                                item.size
                              }{" "}
                              ×{" "}
                              {
                                item.quantity
                              }
                            </small>

                            <strong>
                              ₹
                              {
                                (
                                  item.unitPriceINR *
                                  item.quantity
                                ).toLocaleString(
                                  "en-IN"
                                )
                              }
                            </strong>

                          </div>

                        )
                      )}

                    </div>


                    <div className="admin-delivery">

                      <small>
                        DELIVER TO
                      </small>

                      <p>
                        {
                          order.address.fullName
                        }{" "}
                        ·{" "}
                        {
                          order.address.phone
                        }
                        <br />

                        {
                          order.address.line1
                        }

                        {
                          order.address.line2
                            ? `, ${order.address.line2}`
                            : ""
                        }

                        <br />

                        {
                          order.address.city
                        },{" "}
                        {
                          order.address.state
                        }{" "}
                        {
                          order.address.postalCode
                        }

                        <br />

                        {
                          order.address.country
                        }
                      </p>

                    </div>

                  </article>

                )
              )
            )}

          </div>

        )}


        {tab ===
          "customers" && (

          <div className="admin-panel">

            <div className="admin-panel-title">

              <div>

                <small>
                  COMMUNITY
                </small>

                <h2>
                  Customers
                </h2>

              </div>

            </div>


            <div className="admin-table-wrap">

              <table className="admin-table">

                <thead>

                  <tr>

                    <th>
                      CUSTOMER
                    </th>

                    <th>
                      ROLE
                    </th>

                    <th>
                      ORDERS
                    </th>

                    <th>
                      SPENT
                    </th>

                    <th>
                      JOINED
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {customers.map(
                    (customer) => (

                      <tr
                        key={
                          customer.id
                        }
                      >

                        <td>

                          <strong>
                            {
                              customer.fullName
                            }
                          </strong>

                          <small>
                            {
                              customer.email
                            }
                          </small>

                        </td>


                        <td>
                          {
                            customer.role
                          }
                        </td>


                        <td>
                          {
                            customer.orderCount
                          }
                        </td>


                        <td>
                          ₹
                          {
                            customer.totalSpentINR.toLocaleString(
                              "en-IN"
                            )
                          }
                        </td>


                        <td>
                          {new Date(
                            customer.createdAt
                          ).toLocaleDateString(
                            "en-GB"
                          )}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}


        {tab ===
          "products" && (
          <>

            {editorOpen && (

              <div className="product-editor-panel">

                <div className="product-editor-title">

                  <div>

                    <small>
                      {editorMode ===
                      "create"
                        ? "NEW PRODUCT"
                        : "EDIT PRODUCT"}
                    </small>

                    <h2>
                      {editorMode ===
                      "create"
                        ? "Add to the collection."
                        : editingProduct?.name}
                    </h2>

                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      setEditorOpen(
                        false
                      )
                    }
                  >
                    ×
                  </button>

                </div>


                <form
                  className="product-editor-form"
                  onSubmit={
                    submitProduct
                  }
                >

                  <label>

                    PRODUCT NAME

                    <input
                      required
                      value={
                        productForm.name
                      }
                      onChange={(e) =>
                        updateForm(
                          "name",
                          e.target.value
                        )
                      }
                      placeholder="Product name"
                    />

                  </label>


                  <label>

                    CATEGORY

                    <select
                      value={
                        productForm.category
                      }
                      onChange={(e) => {
                        const nextCategory =
                          e.target.value;

                        updateForm(
                          "category",
                          nextCategory
                        );

                        if (
                          nextCategory !==
                          "Jewellery"
                        ) {
                          updateForm(
                            "subcategory",
                            ""
                          );
                        }
                      }}
                    >

                      <option value="Kurtis">
                        Kurtis
                      </option>

                      <option value="Short Tops">
                        Short Tops
                      </option>

                      <option value="Coord Sets">
                        Coord Sets
                      </option>

                      <option value="3 Piece Sets">
                        3 Piece Sets
                      </option>

                      <option value="Anarkali Sets">
                        Anarkali Sets
                      </option>

                      <option value="Jewellery">
                        Jewellery
                      </option>

                    </select>

                  </label>


                  {productForm.category ===
                    "Jewellery" && (
                    <label>

                      SUBCATEGORY

                      <select
                        required
                        value={
                          productForm.subcategory
                        }
                        onChange={(e) =>
                          updateForm(
                            "subcategory",
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Select jewellery type
                        </option>

                        <option value="Earrings">
                          Earrings
                        </option>

                        <option value="Chains">
                          Chains
                        </option>

                        <option value="Bracelets">
                          Bracelets
                        </option>

                      </select>

                    </label>
                  )}


                  <label>

                    PRICE ₹

                    <input
                      required
                      type="number"
                      min="0"
                      value={
                        productForm.priceINR
                      }
                      onChange={(e) =>
                        updateForm(
                          "priceINR",
                          e.target.value
                        )
                      }
                    />

                  </label>


                  <label>

                    STOCK

                    <input
                      required
                      type="number"
                      min="0"
                      value={
                        productForm.stock
                      }
                      onChange={(e) =>
                        updateForm(
                          "stock",
                          e.target.value
                        )
                      }
                    />

                  </label>


                  <label>

                    BADGE

                    <input
                      value={
                        productForm.badge
                      }
                      onChange={(e) =>
                        updateForm(
                          "badge",
                          e.target.value
                        )
                      }
                      placeholder="NEW / BESTSELLER / LIMITED"
                    />

                  </label>


                  <label>

                    COLOUR

                    <input
                      value={
                        productForm.colour
                      }
                      onChange={(e) =>
                        updateForm(
                          "colour",
                          e.target.value
                        )
                      }
                      placeholder="Rose / Ivory / Gold"
                    />

                  </label>


                  <label className="editor-full">

                    SIZES

                    <input
                      required
                      value={
                        sizesText()
                      }
                      onChange={(e) =>
                        updateSizes(
                          e.target.value
                        )
                      }
                      placeholder="XS, S, M, L, XL, XXL"
                    />

                    <small>
                      Separate sizes with commas. Jewellery can use ONE SIZE.
                    </small>

                  </label>


                  <label className="editor-full">

                    MATERIAL

                    <textarea
                      value={
                        productForm.material
                      }
                      onChange={(e) =>
                        updateForm(
                          "material",
                          e.target.value
                        )
                      }
                      placeholder="Fabric / jewellery material"
                    />

                  </label>


                  <label className="editor-full">

                    DESCRIPTION

                    <textarea
                      value={
                        productForm.description
                      }
                      onChange={(e) =>
                        updateForm(
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Describe the product"
                    />

                  </label>


                  <label className="editor-full">

                    PRODUCT IMAGES

                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        setNewImages(
                          Array.from(
                            e.target.files ||
                            []
                          )
                        )
                      }
                    />

                    <small>
                      Up to 8 JPG, PNG or WEBP images. Maximum 8 MB each.
                    </small>

                  </label>


                  {editorMode ===
                    "edit" &&
                    editingProduct &&
                    Array.isArray(
                      editingProduct.images
                    ) &&
                    editingProduct.images.length >
                    0 && (

                    <div className="editor-full existing-images">

                      <small>
                        CURRENT IMAGES
                      </small>

                      <div>

                        {editingProduct.images.map(
                          (
                            image,
                            index
                          ) => (

                            <article
                              key={
                                `${image}-${index}`
                              }
                            >

                              <img
                                src={
                                  image
                                }
                                alt=""
                              />

                              {index === 0 ? (
                                <div className="cover-image-label">
                                  COVER IMAGE
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="set-cover-button"
                                  onClick={() =>
                                    setCoverImage(
                                      editingProduct,
                                      index
                                    )
                                  }
                                >
                                  SET AS COVER
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  removeImage(
                                    editingProduct,
                                    index
                                  )
                                }
                              >
                                REMOVE
                              </button>

                            </article>

                          )
                        )}

                      </div>

                    </div>

                  )}


                  <label className="editor-publish editor-full">

                    <input
                      type="checkbox"
                      checked={
                        productForm.active
                      }
                      onChange={(e) =>
                        updateForm(
                          "active",
                          e.target.checked
                        )
                      }
                    />

                    <span>
                      Published on storefront
                    </span>

                  </label>


                  <div className="product-editor-actions editor-full">

                    <button
                      className="editor-save"
                      disabled={
                        savingProduct
                      }
                    >
                      {savingProduct
                        ? "SAVING..."
                        : editorMode ===
                          "create"
                        ? "CREATE PRODUCT"
                        : "SAVE CHANGES"}
                    </button>


                    <button
                      type="button"
                      className="editor-cancel"
                      onClick={() =>
                        setEditorOpen(
                          false
                        )
                      }
                    >
                      CANCEL
                    </button>

                  </div>

                </form>

              </div>

            )}


            <div className="admin-product-toolbar">

              <div>

                <strong>
                  {
                    products.length
                  }
                </strong>

                <span>
                  PRODUCTS
                </span>

              </div>


              <button
                onClick={
                  openCreateProduct
                }
              >
                + ADD PRODUCT
              </button>

            </div>


            <div className="admin-products-full">

              {products.map(
                (product) => (

                  <article
                    className={`admin-product-row ${
                      !product.active
                        ? "product-unpublished"
                        : ""
                    }`}
                    key={
                      product.id
                    }
                  >

                    <div className="admin-product-preview">

                      {product.images?.[0] ? (

                        <img
                          src={
                            product.images[0]
                          }
                          alt={
                            product.name
                          }
                        />

                      ) : (

                        <div className="no-product-image">
                          NO IMAGE
                        </div>

                      )}

                    </div>


                    <div className="admin-product-description">

                      <div>

                        <small>
                          {
                            product.category
                          }
                        </small>

                        {!product.active && (
                          <span>
                            UNPUBLISHED
                          </span>
                        )}

                      </div>

                      <h3>
                        {
                          product.name
                        }
                      </h3>

                      <p>
                        {
                          product.colour ||
                          "No colour"
                        }{" "}
                        ·{" "}
                        {
                          product.sizes?.join(
                            ", "
                          ) ||
                          "No sizes"
                        }
                      </p>

                    </div>


                    <div className="admin-product-metric">

                      <small>
                        PRICE
                      </small>

                      <strong>
                        ₹
                        {
                          product.priceINR.toLocaleString(
                            "en-IN"
                          )
                        }
                      </strong>

                    </div>


                    <div className="admin-product-metric">

                      <small>
                        STOCK
                      </small>

                      <strong
                        className={
                          product.stock <=
                          3
                            ? "low-stock"
                            : ""
                        }
                      >
                        {
                          product.stock
                        }
                      </strong>

                    </div>


                    <div className="admin-product-row-actions">

                      <button
                        onClick={() =>
                          openEditProduct(
                            product
                          )
                        }
                      >
                        EDIT
                      </button>


                      <button
                        onClick={() =>
                          quickToggle(
                            product
                          )
                        }
                      >
                        {product.active
                          ? "UNPUBLISH"
                          : "PUBLISH"}
                      </button>


                      <button
                        className="archive-product"
                        onClick={() =>
                          archiveProduct(
                            product
                          )
                        }
                      >
                        ARCHIVE
                      </button>

                    </div>

                  </article>

                )
              )}

            </div>

          </>
        )}

      </div>

    </section>
  );
}


function AdminStat({
  title,
  value,
}) {

  return (
    <div className="admin-stat">

      <small>
        {title}
      </small>

      <strong>
        {value}
      </strong>

    </div>
  );
}


function StatusBadge({
  status,
}) {

  return (
    <span
      className={`status-badge status-${status.toLowerCase()}`}
    >
      {status}
    </span>
  );
}


function ForgotPasswordPage({
  navigate,
}) {
  const [step, setStep] =
    useState("email");
  const [email, setEmail] =
    useState("");
  const [otp, setOtp] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");

  async function sendResetCode(
    event
  ) {
    event?.preventDefault();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanEmail) {
      setError(
        "Enter your email address."
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        error: resetError,
      } =
        await supabase.auth
          .resetPasswordForEmail(
            cleanEmail
          );

      if (resetError) {
        throw resetError;
      }

      setEmail(cleanEmail);
      setStep("otp");
      setOtp("");

      setMessage(
        `We sent an 8-digit password reset code to ${cleanEmail}.`
      );
    } catch (err) {
      console.error(
        "Password reset email error:",
        err
      );

      setError(
        err.message ||
        "Could not send the password reset code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyResetCode(
    event
  ) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const cleanOtp =
        otp
          .replace(/\D/g, "")
          .slice(0, 8);

      if (
        cleanOtp.length !== 8
      ) {
        throw new Error(
          "Enter the 8-digit verification code."
        );
      }

      const {
        data,
        error: verifyError,
      } =
        await supabase.auth.verifyOtp({
          email:
            email
              .trim()
              .toLowerCase(),
          token: cleanOtp,
          type: "recovery",
        });

      if (verifyError) {
        throw verifyError;
      }

      if (!data.session) {
        throw new Error(
          "Unable to verify this password reset code."
        );
      }

      setStep("password");
      setMessage(
        "Code verified. Create your new password."
      );
    } catch (err) {
      console.error(
        "Recovery OTP error:",
        err
      );

      setError(
        err.message ||
        "The verification code is invalid or has expired."
      );
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(
    event
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      password.length < 8
    ) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        error: updateError,
      } =
        await supabase.auth
          .updateUser({
            password,
          });

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();

      setStep("complete");
      setPassword("");
      setConfirmPassword("");
      setOtp("");

      setMessage(
        "Your password has been changed successfully. You can now sign in with your new password."
      );
    } catch (err) {
      console.error(
        "Password update error:",
        err
      );

      setError(
        err.message ||
        "Could not change your password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="ACCOUNT RECOVERY"
        title={
          step === "email"
            ? "Forgot your password?"
            : step === "otp"
            ? "Enter your code."
            : step ===
              "password"
            ? "Create a new password."
            : "Password changed."
        }
        text={
          step === "email"
            ? "Enter the email address linked to your DEsiglov account."
            : step === "otp"
            ? `Enter the 8-digit code sent to ${email}.`
            : step ===
              "password"
            ? "Choose a secure new password for your account."
            : "Your DEsiglov account is ready."
        }
      />

      <section className="password-reset-page">
        {message && (
          <div className="auth-message success">
            {message}
          </div>
        )}

        {error && (
          <div className="auth-message error">
            {error}
          </div>
        )}

        {step === "email" && (
          <form
            className="password-reset-card"
            onSubmit={
              sendResetCode
            }
          >
            <label>
              EMAIL ADDRESS

              <input
                required
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <button
              type="submit"
              className="add-bag"
              disabled={loading}
            >
              {loading
                ? "SENDING CODE..."
                : "SEND RESET CODE"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <>
            <form
              className="password-reset-card"
              onSubmit={
                verifyResetCode
              }
            >
              <label>
                8-DIGIT CODE

                <input
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength="8"
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(
                          0,
                          8
                        )
                    )
                  }
                  placeholder="00000000"
                  style={{
                    textAlign:
                      "center",
                    letterSpacing:
                      "0.35em",
                    fontSize:
                      "1.35rem",
                  }}
                />
              </label>

              <button
                type="submit"
                className="add-bag"
                disabled={loading}
              >
                {loading
                  ? "VERIFYING..."
                  : "VERIFY CODE"}
              </button>
            </form>

            <div className="account-switch">
              Didn't receive the code?

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  sendResetCode()
                }
              >
                Resend code
              </button>
            </div>

            <div className="account-switch">
              Wrong email?

              <button
                type="button"
                onClick={() => {
                  setStep(
                    "email"
                  );
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
              >
                Change email
              </button>
            </div>
          </>
        )}

        {step ===
          "password" && (
          <form
            className="password-reset-card"
            onSubmit={
              changePassword
            }
          >
            <label>
              NEW PASSWORD

              <input
                required
                type="password"
                minLength="8"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </label>

            <label>
              CONFIRM PASSWORD

              <input
                required
                type="password"
                minLength="8"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Enter password again"
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              className="add-bag"
              disabled={loading}
            >
              {loading
                ? "UPDATING..."
                : "CHANGE PASSWORD"}
            </button>
          </form>
        )}

        {step ===
          "complete" && (
          <button
            type="button"
            className="button-dark password-signin-button"
            onClick={() =>
              navigate(
                "/account"
              )
            }
          >
            SIGN IN
          </button>
        )}

        {step !==
          "complete" && (
          <button
            type="button"
            className="back-to-login"
            onClick={() =>
              navigate(
                "/account"
              )
            }
          >
            ← BACK TO SIGN IN
          </button>
        )}
      </section>
    </>
  );
}


function ResetPasswordPage({
  navigate,
}) {
  useEffect(() => {
    navigate(
      "/forgot-password"
    );
  }, [navigate]);

  return null;
}



function InformationPage({
  eyebrow,
  title,
  intro,
  children,
}) {
  return (
    <main className="information-page">
      <section className="page-heading">
        {eyebrow && (
          <span className="eyebrow">
            {eyebrow}
          </span>
        )}

        <h1>{title}</h1>

        {intro && (
          <p>
            {intro}
          </p>
        )}
      </section>

      {children}
    </main>
  );
}


function InfoSection({
  number,
  title,
  children,
}) {
  return (
    <section className="info-section">
      <div className="info-number">
        {number}
      </div>

      <div className="info-copy">
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}


function ContactPage() {
  const founders = [
    {
      number: "01",
      name: "B.S. Abinaya Parameswari",
      role: "Associate Software Engineer at Accenture",
      phone: "9344921188",
      phoneLink: "tel:+919344921188",
      image: "/Founder1.jpg",
    },
    {
      number: "02",
      name: "Harini M",
      role: "Software System Engineer at HP",
      phone: "+91 72002 32989",
      phoneLink: "tel:+917200232989",
      image: "/Founder2.png",
    },
  ];

  return (
    <InformationPage
      eyebrow="GET IN TOUCH"
      title="Contact us."
      intro="Questions about an order, sizing or a piece from the collection? Our founders are here to help."
    >
      <section className="founders-section">
        <div className="founders-heading">
          <span>OUR FOUNDERS</span>
          <p>
            Connect directly with the people behind DEsiglov.
          </p>
        </div>

        <div className="founders-grid">
          {founders.map((founder) => (
            <article
              className="founder-card"
              key={founder.name}
            >
              <div className="founder-photo">
                <img
                  src={founder.image}
                  alt={founder.name}
                />
              </div>

              <div className="founder-details">
                <small>
                  FOUNDER {founder.number}
                </small>

                <h2>{founder.name}</h2>

                <p className="founder-role">
                  {founder.role}
                </p>

                <a
                  className="founder-phone"
                  href={founder.phoneLink}
                >
                  <span className="founder-phone-icon">
                    ☎
                  </span>

                  <span>
                    <small>PHONE</small>
                    <strong>
                      {founder.phone}
                    </strong>
                  </span>
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="founder-contact-note">
          <span>DE</span>
          <p>
            For product, sizing and order enquiries,
            please contact our team using the details above.
          </p>
        </div>
      </section>
    </InformationPage>
  );
}


function FeedbackPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    comments: "",
  });

  /*
   * Automatically pre-fill the email address when the
   * customer is already signed in with Supabase.
   */
  useEffect(() => {
    let active = true;

    async function loadLoggedInEmail() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "Unable to load feedback account email:",
            error
          );
          return;
        }

        const user =
          session?.user;

        const accountEmail =
          user?.email?.trim() || "";

        /*
         * Supabase may store the customer's name under
         * full_name, name, display_name or first/last name,
         * depending on how the account was created.
         */
        const metadata =
          user?.user_metadata || {};

        const accountName =
          (
            metadata.full_name ||
            metadata.name ||
            metadata.display_name ||
            [
              metadata.first_name,
              metadata.last_name,
            ]
              .filter(Boolean)
              .join(" ")
          )
            ?.trim() || "";

        if (active) {
          setForm((current) => ({
            ...current,

            name:
              current.name ||
              accountName,

            email:
              current.email ||
              accountEmail,
          }));
        }
      } catch (error) {
        console.error(
          "Unable to pre-fill feedback email:",
          error
        );
      }
    }

    loadLoggedInEmail();

    return () => {
      active = false;
    };
  }, []);

  const [sending, setSending] = useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (message.text) {
      setMessage({
        type: "",
        text: "",
      });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.comments.trim()
    ) {
      setMessage({
        type: "error",
        text: "Please complete all fields.",
      });

      return;
    }

    setSending(true);

    setMessage({
      type: "",
      text: "",
    });

    try {
      await feedbackApi.send({
        name: form.name.trim(),
        email: form.email.trim(),
        comments: form.comments.trim(),
      });

      setForm({
        name: "",
        email: "",
        comments: "",
      });

      setMessage({
        type: "success",
        text: "Thank you for your feedback. Your message has been sent to the DEsiglov team.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.message ||
          "We couldn't send your feedback. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <InformationPage
      eyebrow="FEEDBACK"
      title="We'd love to hear from you."
      intro="Your feedback helps us improve the DEsiglov experience."
    >
      <section className="feedback-section">
        <div className="feedback-heading">
          <span>SHARE YOUR THOUGHTS</span>

          <p>
            Tell us about your experience,
            a product you received, or anything
            we can improve.
          </p>
        </div>

        <form
          className="feedback-form"
          onSubmit={handleSubmit}
        >
          <div className="feedback-field">
            <label htmlFor="feedback-name">
              Name
            </label>

            <input
              id="feedback-name"
              name="name"
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              maxLength={100}
              autoComplete="name"
              required
            />
          </div>

          <div className="feedback-field">
            <label htmlFor="feedback-email">
              Email
            </label>

            <input
              id="feedback-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              maxLength={320}
              autoComplete="email"
              required
            />
          </div>

          <div className="feedback-field">
            <div className="feedback-label-row">
              <label htmlFor="feedback-comments">
                Comments
              </label>

              <span>
                {form.comments.length}/3000
              </span>
            </div>

            <textarea
              id="feedback-comments"
              name="comments"
              placeholder="Share your feedback with us..."
              value={form.comments}
              onChange={handleChange}
              maxLength={3000}
              rows={7}
              required
            />
          </div>

          {message.text && (
            <div
              className={`feedback-message ${message.type}`}
              role={
                message.type === "error"
                  ? "alert"
                  : "status"
              }
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="feedback-submit"
            disabled={sending}
          >
            {sending
              ? "SENDING..."
              : "SEND FEEDBACK"}
          </button>
        </form>
      </section>
    </InformationPage>
  );
}


function DeliveryPage() {
  return (
    <InformationPage
      eyebrow="DELIVERY"
      title="From us to you."
      intro="Everything you need to know about processing, dispatch and delivery of your DEsiglov order."
    >
      <InfoSection
        number="01"
        title="Order Processing"
      >
        <p>
          Every order is carefully checked and packed before dispatch.
          Orders are generally processed and dispatched within 1–3
          business days after order confirmation.
        </p>
      </InfoSection>

      <InfoSection
        number="02"
        title="Delivery Timeline"
      >
        <p>
          Delivery generally takes 2–7 business days after dispatch,
          depending on destination and courier service.
        </p>

        <p>
          Timelines may vary due to courier delays, holidays, weather
          or circumstances beyond our control.
        </p>
      </InfoSection>

      <InfoSection
        number="03"
        title="Tracking & Address"
      >
        <p>
          Tracking details will be shared after dispatch.
        </p>

        <p>
          Customers should verify their address, pincode and contact
          number before ordering. Address changes may not be possible
          after dispatch.
        </p>
      </InfoSection>
    </InformationPage>
  );
}


function ReturnsPage() {
  return (
    <InformationPage
      eyebrow="RETURNS & EXCHANGES"
      title="We want you to love what you receive."
      intro="Every DEsiglov order goes through a careful quality-checking process before it is packed and dispatched."
    >
      <InfoSection
        number="01"
        title="Our Quality Check"
      >
        <p>
          We check the product for visible defects, finishing and
          overall condition before it leaves us.
        </p>
      </InfoSection>

      <InfoSection
        number="02"
        title="Size-related Issues"
      >
        <p>
          If the size received isn't the right fit, the customer may
          request a size exchange/return within 7 days of delivery,
          subject to eligibility and availability.
        </p>

        <p>
          Customers should use the Size Guide before ordering.
        </p>
      </InfoSection>

      <InfoSection
        number="03"
        title="Eligible Product Condition"
      >
        <p>
          To be eligible for a size exchange or return, the product
          must meet all of the following conditions:
        </p>

        <ul>
          <li>Unworn, unwashed and unaltered.</li>
          <li>Original tags attached.</li>
          <li>Original condition and packaging.</li>
          <li>No stains, perfume, makeup or other signs of use.</li>
        </ul>
      </InfoSection>

      <InfoSection
        number="04"
        title="Other Return Reasons"
      >
        <p>
          As each order undergoes a complete quality check before
          packing and dispatch, DEsiglov is unable to accept returns
          or exchanges for reasons other than size-related issues.
        </p>

        <p>
          This includes change of mind, colour preference, styling
          preference or simply not liking the product after receiving
          it. Customers are kindly requested to review product details,
          measurements and the Size Guide before ordering.
        </p>
      </InfoSection>

      <InfoSection
        number="05"
        title="Size Availability"
      >
        <p>
          Size exchanges are subject to availability. If the requested
          replacement size is unavailable, the DEsiglov team will
          contact the customer regarding the available resolution.
        </p>
      </InfoSection>

      <InfoSection
        number="06"
        title="Jewellery & Accessories"
      >
        <p>
          Jewellery and accessories are non-returnable/non-exchangeable
          due to hygiene and product-handling considerations, except
          where the item received is incorrect or has an issue identified
          upon delivery, subject to review.
        </p>
      </InfoSection>
    </InformationPage>
  );
}


function PrivacyPage() {

  return (
    <InformationPage
      eyebrow="PRIVACY"
      title="Your information matters."
      intro="A clear overview of the information DEsiglov may process when you use the store."
    >

      <InfoSection
        number="01"
        title="Information we collect"
      >
        <p>
          Information may include your name, email address, delivery address, telephone number, account information, order information and interactions with the website.
        </p>
      </InfoSection>


      <InfoSection
        number="02"
        title="Why we use it"
      >
        <p>
          Information is used to operate customer accounts, process and fulfil orders, provide customer support, maintain store security and improve the shopping experience.
        </p>
      </InfoSection>


      <InfoSection
        number="03"
        title="Payments"
      >
        <p>
          When online payments are introduced, sensitive payment information should be handled by the selected payment provider rather than stored directly by DEsiglov.
        </p>
      </InfoSection>


      <InfoSection
        number="04"
        title="Security"
      >
        <p>
          DEsiglov uses password hashing, authenticated sessions, server-side authorisation and other technical controls designed to protect account and administrative access.
        </p>
      </InfoSection>


      <InfoSection
        number="05"
        title="Data requests"
      >
        <p>
          Customers should be able to contact DEsiglov regarding personal information, corrections or other applicable privacy requests.
        </p>
      </InfoSection>


      <div className="policy-note">
        <strong>
          Legal review
        </strong>

        <p>
          This page is a technical draft and should be reviewed against the laws and business arrangements that apply to DEsiglov before launch.
        </p>
      </div>

    </InformationPage>
  );
}


function TermsPage() {

  return (
    <InformationPage
      eyebrow="TERMS"
      title="Shopping with DEsiglov."
      intro="The basic terms governing use of the DEsiglov online store."
    >

      <InfoSection
        number="01"
        title="Products"
      >
        <p>
          We aim to describe products accurately. Colours and appearance can vary slightly depending on lighting, photography and device displays.
        </p>
      </InfoSection>


      <InfoSection
        number="02"
        title="Availability"
      >
        <p>
          Products remain subject to availability. An item may become unavailable even after it has been added to a bag.
        </p>
      </InfoSection>


      <InfoSection
        number="03"
        title="Prices"
      >
        <p>
          Prices displayed on the store are the prices used by the DEsiglov checkout system, subject to any applicable delivery charges or adjustments shown before an order is confirmed.
        </p>
      </InfoSection>


      <InfoSection
        number="04"
        title="Orders"
      >
        <p>
          Receiving an order confirmation means the order has been recorded. DEsiglov may need to contact a customer if an order cannot be fulfilled.
        </p>
      </InfoSection>


      <InfoSection
        number="05"
        title="Store use"
      >
        <p>
          The store must not be misused, interfered with, accessed without authorisation or used in a way that could damage its operation or other users.
        </p>
      </InfoSection>


      <div className="policy-note">
        <strong>
          Before production
        </strong>

        <p>
          Final business identity, governing-law and consumer-rights wording should be reviewed before publishing these terms as the final legal version.
        </p>
      </div>

    </InformationPage>
  );
}


function FaqPage() {

  const questions = [
    {
      question:
        "Where does DEsiglov deliver?",
      answer:
        "The store currently focuses on delivery within India. Availability for a specific destination is confirmed during checkout.",
    },

    {
      question:
        "When is delivery free?",
      answer:
        "Standard delivery is free on qualifying orders of ₹2,999 or more where available.",
    },

    {
      question:
        "How do I know which size to choose?",
      answer:
        "Use the DEsiglov size guide and the sizes listed on each individual product page.",
    },

    {
      question:
        "Can I save products for later?",
      answer:
        "Yes. Use the heart icon to add pieces to your wishlist.",
    },

    {
      question:
        "How do I see my orders?",
      answer:
        "Sign in to your DEsiglov account and open the account area to view your order history.",
    },

    {
      question:
        "Can I pay cash on delivery?",
      answer:
        "Cash on Delivery is currently supported during the development phase where available. Online payments will be added separately.",
    },

    {
      question:
        "I forgot my password. What should I do?",
      answer:
        "Use the Forgot Password link on the sign-in page. A secure one-time reset process is available.",
    },
  ];


  return (
    <InformationPage
      eyebrow="FAQ"
      title="Good to know."
      intro="Answers to common questions about shopping with DEsiglov."
    >

      <div className="faq-list">

        {questions.map(
          (
            item,
            index
          ) => (

            <Accordion
              key={
                item.question
              }
              title={
                `${
                  String(
                    index + 1
                  ).padStart(
                    2,
                    "0"
                  )
                }  ${item.question}`
              }
            >
              <p>
                {item.answer}
              </p>
            </Accordion>

          )
        )}

      </div>

    </InformationPage>
  );
}


function SizeGuidePage() {
  const measurements = [
    ["S", "34", "28", "38"],
    ["M", "36", "30", "40"],
    ["L", "38", "32", "42"],
    ["XL", "40", "34", "44"],
    ["XXL", "42", "36", "46"],
    ["3XL", "44", "38", "48"],
    ["4XL", "46", "40", "50"],
    ["5XL", "48", "42", "52"],
    ["6XL", "50", "44", "54"],
    ["7XL", "52", "46", "56"],
  ];

  return (
    <div className="size-guide-page">
      <section className="size-guide-hero">
        <span className="size-guide-eyebrow">
          DESIGLOV SIZE GUIDE
        </span>

        <h1>Find your fit.</h1>

        <p>
          Use our body measurements as a guide to find
          the size that feels right for you.
        </p>
      </section>

      <section className="desiglov-size-guide">
        <div className="desiglov-size-table-wrap">
          <table className="desiglov-size-table">
            <thead>
              <tr className="measurement-title-row">
                <th colSpan="4">
                  BODY MEASUREMENTS (INCHES)
                </th>
              </tr>

              <tr>
                <th>SIZE</th>
                <th>BUST</th>
                <th>WAIST</th>
                <th>HIP</th>
              </tr>
            </thead>

            <tbody>
              {measurements.map(
                ([size, bust, waist, hip]) => (
                  <tr key={size}>
                    <td>{size}</td>
                    <td>{bust}</td>
                    <td>{waist}</td>
                    <td>{hip}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="desiglov-measure-help">
          <div>
            <strong>BUST</strong>
            <p>
              Measure around the fullest part of your bust,
              keeping the tape level around your body.
            </p>
          </div>

          <div>
            <strong>WAIST</strong>
            <p>
              Measure around your natural waistline without
              pulling the measuring tape too tightly.
            </p>
          </div>

          <div>
            <strong>HIP</strong>
            <p>
              Measure around the fullest part of your hips
              while standing naturally.
            </p>
          </div>
        </div>

        <p className="size-guide-note">
          Measurements are in inches. Individual garment fit
          may vary slightly depending on the style and fabric.
        </p>
      </section>
    </div>
  );
}


function SearchPanel({
  products = [],
  search,
  setSearch,
  openProduct,
}) {
  const results =
    search.trim()
      ? products.filter(
          (product) =>
            `${product.name} ${product.category} ${product.colour}`
              .toLowerCase()
              .includes(
                search
                  .toLowerCase()
              )
        ).slice(0, 8)
      : [];

  return (
    <div className="search-panel">
      <div className="search-inner">
        <SearchIcon />

        <input
          autoFocus
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
          placeholder="Search products..."
        />
      </div>

      {results.length >
        0 && (
        <div className="search-results">
          {results.map(
            (product) => (
              <button
                key={
                  product.id
                }
                onClick={() =>
                  openProduct(
                    product
                  )
                }
              >
                <img
                  src={
                    product
                      .images[0]
                  }
                  alt=""
                />

                <div>
                  <strong>
                    {
                      product.name
                    }
                  </strong>

                  <span>
                    {
                      product.category
                    }
                  </span>
                </div>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

function CartDrawer({
  open,
  setOpen,
  items,
  country,
  totalINR,
  changeQty,
  removeItem,
  navigate,
}) {
  if (!open)
    return null;

  return (
    <>
      <button
        className="drawer-overlay"
        onClick={() =>
          setOpen(false)
        }
        aria-label="Close cart"
      />

      <aside className="cart-drawer">
        <div className="drawer-head">
          <div>
            <small>
              YOUR SELECTION
            </small>

            <h2>
              Shopping Bag
            </h2>
          </div>

          <button
            onClick={() =>
              setOpen(false)
            }
          >
            ×
          </button>
        </div>

        <div className="drawer-items">
          {items.length >
          0 ? (
            items.map(
              (item) => (
                <CartLine
                  key={
                    item.key
                  }
                  item={
                    item
                  }
                  country={
                    country
                  }
                  changeQty={
                    changeQty
                  }
                  removeItem={
                    removeItem
                  }
                />
              )
            )
          ) : (
            <EmptyState
              title="Your bag is empty."
              text="Your next favourite is waiting."
            />
          )}
        </div>

        {items.length >
          0 && (
          <div className="drawer-bottom">
            <div className="summary-total">
              <span>
                TOTAL
              </span>

              <strong>
                {formatMoney(
                  totalINR,
                  country
                )}
              </strong>
            </div>

            <button
              className="add-bag"
              onClick={() => {
                setOpen(false);

                navigate(
                  "/checkout"
                );
              }}
            >
              CHECKOUT
            </button>

            <button
              className="view-bag"
              onClick={() => {
                setOpen(false);

                navigate(
                  "/cart"
                );
              }}
            >
              VIEW BAG
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function PageHero({
  eyebrow,
  title,
  text,
}) {
  return (
    <section className="page-hero">
      <div className="eyebrow">
        {eyebrow}
      </div>

      <h1>
        {title}
      </h1>

      {text && (
        <p>
          {text}
        </p>
      )}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
}) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">
          {eyebrow}
        </div>

        <h2>
          {title}
        </h2>
      </div>

      {text && (
        <p>
          {text}
        </p>
      )}
    </div>
  );
}

function Benefit({
  number,
  title,
  text,
}) {
  return (
    <div className="benefit">
      <span>
        {number}
      </span>

      <div>
        <strong>
          {title}
        </strong>

        <p>
          {text}
        </p>
      </div>
    </div>
  );
}

function Newsletter() {
  return (
    <section className="newsletter">
      <div>
        <div className="eyebrow">
          THE DESIGLOV
          LETTER
        </div>

        <h2>
          Be first to find
          what's next.
        </h2>

        <p>
          New arrivals, rare
          finds and DEsiglov
          stories, delivered
          occasionally.
        </p>
      </div>

      <form
        onSubmit={(e) =>
          e.preventDefault()
        }
      >
        <input
          type="email"
          required
          placeholder="Your email address"
        />

        <button>
          JOIN →
        </button>
      </form>
    </section>
  );
}

function EmptyState({
  title,
  text,
}) {
  return (
    <div className="empty-state">
      <h2>
        {title}
      </h2>

      <p>
        {text}
      </p>
    </div>
  );
}

function NotFound({
  navigate,
}) {
  return (
    <div className="not-found">
      <h1>
        Page not found.
      </h1>

      <button
        className="button-dark"
        onClick={() =>
          navigate("/")
        }
      >
        RETURN HOME
      </button>
    </div>
  );
}

function Footer({
  navigate,
}) {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="footer-brand">
          <div className="brand-word footer-word">
            <span className="brand-desi">
              DESI
            </span>

            <span className="brand-glov">
              GLOV
            </span>
          </div>

          <p>
            Rare finds.
            <br />
            Real style.
          </p>
        </div>

        <div className="footer-column">
          <strong>
            SHOP
          </strong>

          <button
            onClick={() =>
              navigate(
                "/shop"
              )
            }
          >
            All Products
          </button>

          <button
            onClick={() =>
              navigate(
                "/shop?category=Kurtis"
              )
            }
          >
            Kurtis
          </button>

          <button
            onClick={() =>
              navigate(
                "/shop?category=Coord%20Sets"
              )
            }
          >
            Coord Sets
          </button>

          <button
            onClick={() =>
              navigate(
                "/shop?category=Jewellery"
              )
            }
          >
            Jewellery
          </button>
        </div>

        <div className="footer-column">
          <strong>
            HELP
          </strong>

          <button
            onClick={() =>
              navigate("/contact")
            }
          >
            Contact
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/delivery")
            }
          >
            Delivery
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/returns")
            }
          >
            Returns
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/size-guide")
            }
          >
            Size Guide
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/feedback")
            }
          >
            Feedback
          </button>
        </div>

        <div className="footer-column">
          <strong>
            FOLLOW
          </strong>

          <a
            href="https://www.instagram.com/itz_desiglov/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>

          <a
            href="https://chat.whatsapp.com/IgWPbkO7SDd7S2EinQ56EW"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © 2026 DESIGLOV
        </span>

        <span>
          RARE FINDS · REAL
          STYLE
        </span>

        <span>
          INDIA
        </span>
      </div>
    
        <div className="footer-legal-links">

          <button
            onClick={() =>
              navigate(
                "/privacy"
              )
            }
          >
            Privacy Policy
          </button>

          <button
            onClick={() =>
              navigate(
                "/terms"
              )
            }
          >
            Terms & Conditions
          </button>

          <button
            onClick={() =>
              navigate(
                "/faq"
              )
            }
          >
            FAQs
          </button>

        </div>

</footer>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="6"
      />

      <path d="M16 16l5 5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path d="M5 21c.8-4.2 3.1-6 7-6s6.2 1.8 7 6" />
    </svg>
  );
}

function HeartIcon({
  filled = false,
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={
        filled
          ? "heart-filled"
          : ""
      }
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M5 8h14l-1 13H6L5 8z" />

      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M3 6h11v10H3z" />

      <path d="M14 10h4l3 3v3h-7z" />

      <circle
        cx="7"
        cy="18"
        r="2"
      />

      <circle
        cx="18"
        cy="18"
        r="2"
      />
    </svg>
  );
}

export default App;
