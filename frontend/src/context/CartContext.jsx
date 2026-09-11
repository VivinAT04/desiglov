import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart =
        localStorage.getItem("desiglov_cart");

      return savedCart
        ? JSON.parse(savedCart)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "desiglov_cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  function addToCart({
    product,
    size = null,
    quantity = 1
  }) {
    setCart((currentCart) => {
      const existingItem =
        currentCart.find(
          (item) =>
            item.id === product.id &&
            item.size === size
        );

      if (existingItem) {
        return currentCart.map(
          (item) =>
            item.id === product.id &&
            item.size === size
              ? {
                  ...item,
                  quantity:
                    item.quantity +
                    quantity
                }
              : item
        );
      }

      return [
        ...currentCart,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          image: product.image,
          price: product.price,
          originalPrice:
            product.originalPrice,
          colour: product.colour,
          size,
          quantity
        }
      ];
    });
  }

  function removeFromCart(id, size) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          !(
            item.id === id &&
            item.size === size
          )
      )
    );
  }

  function updateQuantity(
    id,
    size,
    newQuantity
  ) {
    if (newQuantity < 1) {
      removeFromCart(id, size);
      return;
    }

    setCart((currentCart) =>
      currentCart.map(
        (item) =>
          item.id === id &&
          item.size === size
            ? {
                ...item,
                quantity:
                  newQuantity
              }
            : item
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount =
    cart.reduce(
      (total, item) =>
        total + item.quantity,
      0
    );

  const subtotal =
    cart.reduce(
      (total, item) =>
        total +
        item.price *
          item.quantity,
      0
    );

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        subtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context =
    useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}
