import { supabase } from "./lib/supabase.js";

const API_BASE = import.meta.env.VITE_API_URL || "";

/*
 * Central DESIGLOV API client.
 *
 * Authentication flow:
 *
 * Supabase login
 *      ↓
 * Supabase access token
 *      ↓
 * Authorization: Bearer <token>
 *      ↓
 * DESIGLOV backend
 */

async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error(
      "Unable to read Supabase session:",
      error
    );

    return null;
  }

  return session?.access_token || null;
}

async function request(
  path,
  options = {}
) {
  if (!API_BASE) {
    throw new Error(
      "Backend API is not configured."
    );
  }

  const isFormData =
    options.body instanceof FormData;

  const accessToken =
    await getAccessToken();

  const headers = {
    ...(isFormData
      ? {}
      : {
          "Content-Type":
            "application/json",
        }),

    ...(accessToken
      ? {
          Authorization:
            `Bearer ${accessToken}`,
        }
      : {}),

    ...(options.headers || {}),
  };

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers,
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.error ||
        "Something went wrong."
    );

    error.status =
      response.status;

    error.data =
      data;

    throw error;
  }

  return data;
}


// ============================================================
// AUTH
// ============================================================

/*
 * Registration, login, logout, OTP and password recovery
 * are handled directly by Supabase in App.jsx.
 *
 * The backend /auth/me endpoint is retained so the frontend
 * can verify the current Supabase session against DESIGLOV's
 * backend and synchronise the local customer profile.
 */

export const authApi = {
  me() {
    return request(
      "/auth/me"
    );
  },
};


// ============================================================
// ADDRESSES
// ============================================================

export const addressApi = {
  list() {
    return request(
      "/addresses"
    );
  },

  create(address) {
    return request(
      "/addresses",
      {
        method: "POST",
        body:
          JSON.stringify(
            address
          ),
      }
    );
  },

  makeDefault(id) {
    return request(
      `/addresses/${id}/default`,
      {
        method: "PATCH",
      }
    );
  },

  remove(id) {
    return request(
      `/addresses/${id}`,
      {
        method: "DELETE",
      }
    );
  },
};


// ============================================================
// ORDERS
// ============================================================

export const orderApi = {
  list() {
    return request(
      "/orders"
    );
  },

  validateCoupon({
    code,
    addressId,
    paymentMethod,
    items,
  }) {
    return request(
      "/orders/validate-coupon",
      {
        method: "POST",
        body:
          JSON.stringify({
            code,
            addressId,
            paymentMethod,
            items,
          }),
      }
    );
  },

  create({
    addressId,
    paymentMethod,
    items,
    couponCode = "",
  }) {
    return request(
      "/orders",
      {
        method: "POST",
        body:
          JSON.stringify({
            addressId,
            paymentMethod,
            items,
            couponCode,
          }),
      }
    );
  },

  verifyPayment({
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  }) {
    return request(
      "/orders/verify-payment",
      {
        method: "POST",
        body:
          JSON.stringify({
            orderId,
            razorpay_order_id:
              razorpayOrderId,
            razorpay_payment_id:
              razorpayPaymentId,
            razorpay_signature:
              razorpaySignature,
          }),
      }
    );
  },
};


// ============================================================
// ADMIN
// ============================================================

export const adminApi = {
  session() {
    return request(
      "/admin/session"
    );
  },

  auditLog() {
    return request(
      "/admin/audit-log"
    );
  },

  dashboard() {
    return request(
      "/admin/dashboard"
    );
  },

  discountCodes() {
    return request(
      "/admin/discount-codes"
    );
  },

  createDiscountCode(
    data
  ) {
    return request(
      "/admin/discount-codes",
      {
        method: "POST",
        body:
          JSON.stringify(
            data
          ),
      }
    );
  },

  updateDiscountCode(
    id,
    data
  ) {
    return request(
      `/admin/discount-codes/${id}`,
      {
        method: "PATCH",
        body:
          JSON.stringify(
            data
          ),
      }
    );
  },

  deleteDiscountCode(
    id
  ) {
    return request(
      `/admin/discount-codes/${id}`,
      {
        method: "DELETE",
      }
    );
  },

  orders() {
    return request(
      "/admin/orders"
    );
  },

  updateOrderStatus(
    id,
    status,
    awbNumber = null
  ) {
    return request(
      `/admin/orders/${id}/status`,
      {
        method: "PATCH",
        body:
          JSON.stringify({
            status,
            awbNumber,
          }),
      }
    );
  },

  customers() {
    return request(
      "/admin/customers"
    );
  },

  products() {
    return request(
      "/admin/products"
    );
  },

  updateProduct(
    id,
    data
  ) {
    return request(
      `/admin/products/${id}`,
      {
        method: "PATCH",
        body:
          JSON.stringify(
            data
          ),
      }
    );
  },

  updateProductDetails(
    id,
    data
  ) {
    return request(
      `/admin/products/${id}/details`,
      {
        method: "PATCH",
        body:
          JSON.stringify(
            data
          ),
      }
    );
  },

  createProduct({
    product,
    images,
  }) {
    const formData =
      new FormData();

    Object.entries(
      product
    ).forEach(
      ([key, value]) => {
        if (
          key === "sizes"
        ) {
          formData.append(
            key,
            JSON.stringify(
              value
            )
          );
        } else {
          formData.append(
            key,
            String(
              value ?? ""
            )
          );
        }
      }
    );

    Array.from(
      images || []
    ).forEach(
      (file) => {
        formData.append(
          "images",
          file
        );
      }
    );

    return request(
      "/admin/products",
      {
        method: "POST",
        body: formData,
      }
    );
  },

  uploadProductImages(
    id,
    images
  ) {
    const formData =
      new FormData();

    Array.from(
      images || []
    ).forEach(
      (file) => {
        formData.append(
          "images",
          file
        );
      }
    );

    return request(
      `/admin/products/${id}/images`,
      {
        method: "POST",
        body: formData,
      }
    );
  },

  setProductCover(
    id,
    index
  ) {
    return request(
      `/admin/products/${id}/images/${index}/cover`,
      {
        method: "PATCH",
      }
    );
  },

  removeProductImage(
    id,
    index
  ) {
    return request(
      `/admin/products/${id}/images/${index}`,
      {
        method: "DELETE",
      }
    );
  },

  archiveProduct(id) {
    return request(
      `/admin/products/${id}`,
      {
        method: "DELETE",
      }
    );
  },
};


// ============================================================
// PUBLIC PRODUCT CATALOGUE
// ============================================================

export const productApi = {
  list() {
    return request(
      "/products"
    );
  },

  get(slug) {
    return request(
      `/products/${encodeURIComponent(
        slug
      )}`
    );
  },
};




// ============================================================
// PRODUCT REVIEWS
// ============================================================

export const reviewApi = {
  list(productId) {
    return request(
      `/reviews/product/${productId}`
    );
  },

  save(productId, { rating, comment }) {
    return request(
      `/reviews/product/${productId}`,
      {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment,
        }),
      }
    );
  },
};

// ============================================================
// FEEDBACK
// ============================================================

export const feedbackApi = {
  send({ name, email, comments }) {
    return request("/feedback", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        comments,
      }),
    });
  },
};
