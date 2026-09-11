import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

const WishlistContext =
  createContext(null);

export function WishlistProvider({
  children
}) {
  const [
    wishlist,
    setWishlist
  ] = useState(() => {
    try {
      const savedWishlist =
        localStorage.getItem(
          "desiglov_wishlist"
        );

      return savedWishlist
        ? JSON.parse(
            savedWishlist
          )
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "desiglov_wishlist",
      JSON.stringify(wishlist)
    );
  }, [wishlist]);

  function addToWishlist(
    product
  ) {
    setWishlist(
      (currentWishlist) => {
        const alreadyExists =
          currentWishlist.some(
            (item) =>
              item.id ===
              product.id
          );

        if (alreadyExists) {
          return currentWishlist;
        }

        return [
          ...currentWishlist,
          product
        ];
      }
    );
  }

  function removeFromWishlist(
    id
  ) {
    setWishlist(
      (currentWishlist) =>
        currentWishlist.filter(
          (item) =>
            item.id !== id
        )
    );
  }

  function toggleWishlist(
    product
  ) {
    const exists =
      wishlist.some(
        (item) =>
          item.id === product.id
      );

    if (exists) {
      removeFromWishlist(
        product.id
      );
    } else {
      addToWishlist(product);
    }
  }

  function isWishlisted(id) {
    return wishlist.some(
      (item) =>
        item.id === id
    );
  }

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount:
          wishlist.length,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isWishlisted
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context =
    useContext(
      WishlistContext
    );

  if (!context) {
    throw new Error(
      "useWishlist must be used inside WishlistProvider"
    );
  }

  return context;
}
