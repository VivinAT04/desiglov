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

const CATEGORIES = [
  "Kurtis",
  "Short Tops",
  "Coord Sets",
  "3 Piece Sets",
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
        cartCount={
          cartCount
        }
        setCartOpen={
          setCartOpen
        }
      />

      {searchOpen && (
        <SearchPanel
          products={products}
          search={search}
          setSearch={
            setSearch
          }
          openProduct={
            openProduct
          }
        />
      )}

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
  setSearchOpen,
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

        <nav className="desktop-nav">
          <button
            onClick={() =>
              navigate("/")
            }
          >
            Home
          </button>

          <button
            onClick={() =>
              navigate("/shop")
            }
          >
            Shop
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
                "/shop?category=Short%20Tops"
              )
            }
          >
            Short Tops
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
                "/shop?category=3%20Piece%20Sets"
              )
            }
          >
            3 Piece Sets
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
        </nav>

        <div className="header-tools">
          <div className="country-wrapper">
            <button
              className="country-button"
              onClick={() =>
                setCountryOpen(
                  !countryOpen
                )
              }
            >
              <span>
                {
                  COUNTRIES[
                    country
                  ].flag
                }
              </span>

              <span className="country-name">
                {
                  COUNTRIES[
                    country
                  ].name
                }
              </span>

              <strong>
                {
                  COUNTRIES[
                    country
                  ].currency
                }
              </strong>

              <span className="chevron">
                ▾
              </span>
            </button>

            {countryOpen && (
              <div className="country-menu">
                {Object.entries(
                  COUNTRIES
                ).map(
                  ([
                    code,
                    item,
                  ]) => (
                    <button
                      key={
                        code
                      }
                      onClick={() => {
                        setCountry(
                          code
                        );

                        setCountryOpen(
                          false
                        );
                      }}
                    >
                      <span>
                        {
                          item.flag
                        }
                      </span>

                      <span>
                        {
                          item.name
                        }
                      </span>

                      <small>
                        {
                          item.currency
                        }
                      </small>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <button
            className="icon-button"
            onClick={() =>
              setSearchOpen(
                (value) =>
                  !value
              )
            }
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
          ].map(
            ([label, path]) => (
              <button
                key={
                  label
                }
                onClick={() =>
                  navigate(
                    path
                  )
                }
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

  const [category, setCategory] =
    useState(
      initialCategory || ""
    );

  const [sort, setSort] =
    useState("featured");

  const [stockOnly, setStockOnly] =
    useState(false);

  useEffect(() => {
    setCategory(
      initialCategory || ""
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

            const stockMatch =
              !stockOnly ||
              product.stock > 0;

            return (
              categoryMatch &&
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
      sort,
      stockOnly,
    ]);

  return (
    <>
      <PageHero
        eyebrow="THE DESIGLOV COLLECTION"
        title={
          category ||
          "Shop the edit."
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
                setCategory(
                  ""
                );
                setStockOnly(
                  false
                );
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
                onChange={() =>
                  setCategory(
                    ""
                  )
                }
              />
              All
            </label>

            {CATEGORIES.map(
              (item) => (
                <label
                  key={
                    item
                  }
                >
                  <input
                    type="radio"
                    name="category"
                    checked={
                      category ===
                      item
                    }
                    onChange={() =>
                      setCategory(
                        item
                      )
                    }
                  />

                  {item}
                </label>
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

  const [size, setSize] =
    useState(
      product.sizes.length ===
        1
        ? product.sizes[0]
        : ""
    );

  const [sizeError, setSizeError] =
    useState(false);

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

              <button>
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

            <div>
              <strong>
                Delivery across
                India
              </strong>

              <p>
                Enter your PIN
                code during
                checkout for
                delivery
                availability.
              </p>
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


    if (
      items.length ===
      0
    ) {

      setError(
        "Your shopping bag is empty."
      );

      return;
    }


    setPlacing(true);
    setError("");


    try {

      const result =
        await orderApi.create({

          addressId:
            selectedAddress,

          paymentMethod:
            "COD",

          items:
            items.map(
              (item) => ({
                productId:
                  item.product.id,

                size:
                  item.size,

                quantity:
                  item.quantity,
              })
            ),
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
        err.message
      );

    } finally {

      setPlacing(
        false
      );
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
            Your order has been recorded successfully.
            Payment will be collected by Cash on Delivery.
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

  const shipping =
    subtotal >= 2999
      ? 0
      : 99;

  const finalTotal =
    subtotal +
    shipping;


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

            <label className="payment-choice active-payment">

              <input
                type="radio"
                name="payment"
                checked
                readOnly
              />

              <div>

                <strong>
                  Cash on Delivery
                </strong>

                <small>
                  Pay when your order arrives.
                </small>

              </div>

            </label>


            <div className="future-payment-card">

              <span>
                UPI / CARD
              </span>

              <p>
                Secure online payment will be connected in the next phase.
              </p>

            </div>

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
              ? "PLACING ORDER..."
              : "PLACE COD ORDER"}
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
      id:
        supabaseUser.id,

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


        const currentUser =
          mapSupabaseUser(
            data.session?.user
          );


        setUser(
          currentUser
        );


        /*
         * Orders and addresses will be
         * migrated to Supabase next.
         *
         * For now we keep the UI empty
         * instead of calling the old
         * backend and showing
         * "Load failed".
         */
        setAddresses([]);
        setOrders([]);

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

        [name]:
          value,
      })
    );
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

        const {
          data,
          error: registerError,
        } =
          await supabase.auth.signUp({
            email:
              form.email.trim(),

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

        } else {

          setMessage(
            "Account created. Please check your email to confirm your account, then sign in."
          );

          setMode(
            "login"
          );
        }

      } else {

        const {
          data,
          error: loginError,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                form.email.trim(),

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
      }


      setAddresses([]);
      setOrders([]);


      setForm({
        fullName: "",
        email: "",
        password: "",
      });

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

      setMode(
        "login"
      );


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


            <div className="account-empty-block">

              <h3>
                No orders yet.
              </h3>

              <p>
                Your completed orders will appear here.
              </p>

            </div>

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


            <div className="account-empty-block">

              <h3>
                No saved address yet.
              </h3>

              <p>
                Your delivery address can be added during checkout.
              </p>

            </div>

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


  return (
    <>
      <PageHero
        eyebrow="YOUR DESIGLOV"
        title={
          mode ===
          "register"
            ? "Create account."
            : "Welcome back."
        }
        text={
          mode ===
          "register"
            ? "Save favourites and manage your orders."
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
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
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
            onClick={() => {
              setMode("register");
              setError("");
              setMessage("");
            }}
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


          <button
            className="add-bag auth-submit"
            disabled={
              submitting
            }
          >
            {submitting
              ? "PLEASE WAIT..."
              : mode === "register"
              ? "CREATE ACCOUNT"
              : "SIGN IN"}
          </button>

        </form>


        <div className="account-switch">

          {mode ===
          "register"
            ? "Already have an account?"
            : "New to DEsiglov?"}


          <button
            type="button"
            onClick={() => {

              setMode(
                mode ===
                "register"
                  ? "login"
                  : "register"
              );

              setError("");

              setMessage("");
            }}
          >
            {mode ===
            "register"
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
                      onChange={(e) =>
                        updateForm(
                          "category",
                          e.target.value
                        )
                      }
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

                      <option value="Jewellery">
                        Jewellery
                      </option>

                    </select>

                  </label>


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

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [devResetUrl, setDevResetUrl] =
    useState("");


  async function submit(
    event
  ) {

    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");
    setDevResetUrl("");


    try {

      const result =
        await authApi.forgotPassword(
          email
        );


      setMessage(
        result.message ||
        "If an account exists with that email, reset instructions have been prepared."
      );


      if (
        result.devResetUrl
      ) {

        setDevResetUrl(
          result.devResetUrl
        );
      }

    } catch (err) {

      setError(
        err.message ||
        "Could not prepare password reset."
      );

    } finally {

      setLoading(false);
    }
  }


  return (
    <>
      <PageHero
        eyebrow="ACCOUNT RECOVERY"
        title="Forgot your password?"
        text="Enter the email address linked to your DEsiglov account."
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


        <form
          className="password-reset-card"
          onSubmit={submit}
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
              ? "PREPARING RESET..."
              : "RESET PASSWORD"}
          </button>

        </form>


        {devResetUrl && (

          <div className="development-reset-box">

            <small>
              LOCAL DEVELOPMENT TEST
            </small>

            <p>
              Email delivery is not connected yet. Use this one-time reset link to test password recovery.
            </p>

            <button
              type="button"
              onClick={() => {

                const url =
                  new URL(
                    devResetUrl
                  );

                navigate(
                  `${url.pathname}${url.search}`
                );
              }}
            >
              OPEN RESET LINK →
            </button>

          </div>

        )}


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

      </section>
    </>
  );
}


function ResetPasswordPage({
  route,
  navigate,
}) {

  const params =
    new URLSearchParams(
      route.split("?")[1] ||
      ""
    );


  const token =
    params.get("token") ||
    "";


  const [checking, setChecking] =
    useState(true);

  const [valid, setValid] =
    useState(false);

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  useEffect(() => {

    let active = true;


    async function checkToken() {

      if (!token) {

        if (active) {

          setError(
            "This password reset link is invalid."
          );

          setChecking(false);
        }

        return;
      }


      try {

        await authApi.validateResetToken(
          token
        );


        if (active) {

          setValid(true);
        }

      } catch (err) {

        if (active) {

          setError(
            err.message ||
            "This password reset link is invalid or has expired."
          );
        }

      } finally {

        if (active) {

          setChecking(false);
        }
      }
    }


    checkToken();


    return () => {

      active = false;
    };

  }, [token]);


  async function submit(
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

      const result =
        await authApi.resetPassword({
          token,
          password,
        });


      setMessage(
        result.message ||
        "Your password has been changed successfully."
      );

      setValid(false);

    } catch (err) {

      setError(
        err.message ||
        "Could not reset password."
      );

    } finally {

      setLoading(false);
    }
  }


  if (checking) {

    return (
      <>
        <PageHero
          eyebrow="ACCOUNT RECOVERY"
          title="Checking your reset link."
          text="Please wait a moment."
        />

        <div className="password-checking">
          VERIFYING LINK
        </div>
      </>
    );
  }


  return (
    <>
      <PageHero
        eyebrow="ACCOUNT RECOVERY"
        title={
          message
            ? "Password changed."
            : "Create a new password."
        }
        text={
          message
            ? "Your DEsiglov account is ready."
            : "Choose a secure password for your account."
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


        {valid && !message && (

          <form
            className="password-reset-card"
            onSubmit={submit}
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
                value={confirmPassword}
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


        {(message || !valid) && (

          <button
            type="button"
            className="button-dark password-signin-button"
            onClick={() =>
              navigate(
                "/account"
              )
            }
          >
            GO TO SIGN IN
          </button>

        )}

      </section>
    </>
  );
}



function InformationPage({
  eyebrow,
  title,
  intro,
  children,
}) {

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        text={intro}
      />

      <section className="information-page">
        {children}
      </section>
    </>
  );
}


function InfoSection({
  number,
  title,
  children,
}) {

  return (
    <article className="info-section">

      <div className="info-number">
        {number}
      </div>

      <div>

        <h2>
          {title}
        </h2>

        <div className="info-copy">
          {children}
        </div>

      </div>

    </article>
  );
}


function ContactPage() {

  return (
    <InformationPage
      eyebrow="WE ARE HERE TO HELP"
      title="Contact DEsiglov."
      intro="Questions about an order, sizing or a piece from the collection? Get in touch with us."
    >

      <div className="contact-grid">

        <article className="contact-card">

          <small>
            INSTAGRAM
          </small>

          <h2>
            @itz_desiglov
          </h2>

          <p>
            Message us on Instagram for product and general enquiries.
          </p>

          <a
            href="https://www.instagram.com/itz_desiglov/"
            target="_blank"
            rel="noreferrer"
          >
            OPEN INSTAGRAM →
          </a>

        </article>


        <article className="contact-card">

          <small>
            ORDER SUPPORT
          </small>

          <h2>
            Have your order number ready.
          </h2>

          <p>
            When contacting us about an existing order, include the DEsiglov order number shown in your account.
          </p>

        </article>

      </div>


      <div className="policy-note">

        <strong>
          Before launch
        </strong>

        <p>
          Add the official DEsiglov customer-service email and registered business contact details here once confirmed.
        </p>

      </div>

    </InformationPage>
  );
}


function DeliveryPage() {

  return (
    <InformationPage
      eyebrow="DELIVERY"
      title="From us to you."
      intro="A simple overview of how DEsiglov delivery works."
    >

      <InfoSection
        number="01"
        title="Delivery locations"
      >
        <p>
          DEsiglov currently focuses on delivery across India. Available delivery options are confirmed during checkout.
        </p>
      </InfoSection>


      <InfoSection
        number="02"
        title="Delivery charges"
      >
        <p>
          Orders of ₹2,999 or more qualify for free standard delivery where available.
        </p>

        <p>
          Orders below the free-delivery threshold may include a delivery charge shown clearly before the order is placed.
        </p>
      </InfoSection>


      <InfoSection
        number="03"
        title="Processing"
      >
        <p>
          Orders are prepared after they are confirmed. Dispatch and delivery times can vary by destination, product availability and courier service.
        </p>
      </InfoSection>


      <InfoSection
        number="04"
        title="Tracking"
      >
        <p>
          Once shipping notifications are connected, customers will receive dispatch and tracking information using the contact details associated with their order.
        </p>
      </InfoSection>


      <div className="policy-note">
        <strong>
          Important
        </strong>

        <p>
          Final courier partners and exact delivery estimates should be added before production launch.
        </p>
      </div>

    </InformationPage>
  );
}


function ReturnsPage() {

  return (
    <InformationPage
      eyebrow="RETURNS & REFUNDS"
      title="When something is not right."
      intro="Our returns process should be clear, fair and easy to understand."
    >

      <InfoSection
        number="01"
        title="Return eligibility"
      >
        <p>
          Items must be unworn, unused and returned in their original condition with tags and packaging where applicable.
        </p>
      </InfoSection>


      <InfoSection
        number="02"
        title="Non-returnable items"
      >
        <p>
          Certain products may not be eligible for return for hygiene, customisation or other product-specific reasons. Any restriction should be shown clearly before purchase.
        </p>
      </InfoSection>


      <InfoSection
        number="03"
        title="Starting a return"
      >
        <p>
          Contact DEsiglov with your order number and the item you would like to return. Instructions will then be provided based on the order.
        </p>
      </InfoSection>


      <InfoSection
        number="04"
        title="Refunds"
      >
        <p>
          Approved refunds should be issued using the appropriate method after returned items have been received and inspected.
        </p>

        <p>
          Cash-on-delivery refund arrangements may require separate bank or UPI details from the customer.
        </p>
      </InfoSection>


      <div className="policy-note">
        <strong>
          Final policy required before launch
        </strong>

        <p>
          Confirm the exact return window, return shipping responsibility and refund processing period before accepting live orders.
        </p>
      </div>

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

  return (
    <InformationPage
      eyebrow="SIZE GUIDE"
      title="Find your fit."
      intro="Use this guide as a starting point and check individual product notes where available."
    >

      <div className="size-table-wrap">

        <table className="size-table">

          <thead>

            <tr>
              <th>SIZE</th>
              <th>BUST</th>
              <th>WAIST</th>
              <th>HIP</th>
            </tr>

          </thead>

          <tbody>

            <tr>
              <td>XS</td>
              <td>32 in</td>
              <td>26 in</td>
              <td>34 in</td>
            </tr>

            <tr>
              <td>S</td>
              <td>34 in</td>
              <td>28 in</td>
              <td>36 in</td>
            </tr>

            <tr>
              <td>M</td>
              <td>36 in</td>
              <td>30 in</td>
              <td>38 in</td>
            </tr>

            <tr>
              <td>L</td>
              <td>38 in</td>
              <td>32 in</td>
              <td>40 in</td>
            </tr>

            <tr>
              <td>XL</td>
              <td>40 in</td>
              <td>34 in</td>
              <td>42 in</td>
            </tr>

            <tr>
              <td>XXL</td>
              <td>42 in</td>
              <td>36 in</td>
              <td>44 in</td>
            </tr>

          </tbody>

        </table>

      </div>


      <InfoSection
        number="01"
        title="How to measure"
      >
        <p>
          Measure around the fullest part of the bust, around the natural waist and around the fullest part of the hips.
        </p>
      </InfoSection>


      <InfoSection
        number="02"
        title="Between sizes?"
      >
        <p>
          Fit can vary by design and fabric. Check individual product information and choose based on the fit you prefer.
        </p>
      </InfoSection>


      <div className="policy-note">

        <strong>
          Confirm before launch
        </strong>

        <p>
          Replace these provisional measurements with DEsiglov's official garment measurements before customers rely on this guide.
        </p>

      </div>

    </InformationPage>
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
        ).slice(0, 6)
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
          placeholder="Search DEsiglov"
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

          <button>
            Contact
          </button>

          <button>
            Delivery
          </button>

          <button>
            Returns
          </button>

          <button>
            Size Guide
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
