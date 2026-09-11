const API_BASE =
  import.meta.env
    .VITE_API_URL ||
  "http://localhost:4000/api";


async function request(
  path,
  options = {}
) {

  const isFormData =
    options.body instanceof FormData;


  const response =
    await fetch(
      `${API_BASE}${path}`,
      {
        credentials:
          "include",

        ...options,

        headers:
          isFormData
            ? {
                ...(options.headers ||
                  {}),
              }
            : {
                "Content-Type":
                  "application/json",

                ...(options.headers ||
                  {}),
              },
      }
    );


  let data = {};


  try {

    data =
      await response.json();

  } catch {

    data = {};
  }


  if (!response.ok) {

    const error =
      new Error(
        data.error ||
        "Something went wrong."
      );


    error.status =
      response.status;


    throw error;
  }


  return data;
}


// ============================================================
// AUTH
// ============================================================

export const authApi = {

  register({
    fullName,
    email,
    password,
  }) {
    return request(
      "/auth/register",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            fullName,
            email,
            password,
          }),
      }
    );
  },


  login({
    email,
    password,
  }) {
    return request(
      "/auth/login",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            email,
            password,
          }),
      }
    );
  },


  logout() {
    return request(
      "/auth/logout",
      {
        method:
          "POST",
      }
    );
  },


  me() {
    return request(
      "/auth/me"
    );
  },


  forgotPassword(
    email
  ) {

    return request(
      "/auth/forgot-password",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            email,
          }),
      }
    );
  },


  validateResetToken(
    token
  ) {

    return request(
      `/auth/reset-password/validate?token=${encodeURIComponent(
        token
      )}`
    );
  },


  resetPassword({
    token,
    password,
  }) {

    return request(
      "/auth/reset-password",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            token,
            password,
          }),
      }
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
        method:
          "POST",

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
        method:
          "PATCH",
      }
    );
  },


  remove(id) {
    return request(
      `/addresses/${id}`,
      {
        method:
          "DELETE",
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


  create({
    addressId,
    paymentMethod,
    items,
  }) {
    return request(
      "/orders",
      {
        method:
          "POST",

        body:
          JSON.stringify({
            addressId,
            paymentMethod,
            items,
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


  orders() {

    return request(
      "/admin/orders"
    );
  },


  updateOrderStatus(
    id,
    status
  ) {

    return request(
      `/admin/orders/${id}/status`,
      {
        method:
          "PATCH",

        body:
          JSON.stringify({
            status,
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
        method:
          "PATCH",

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
        method:
          "PATCH",

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
      ([
        key,
        value,
      ]) => {

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
        method:
          "POST",

        body:
          formData,
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
        method:
          "POST",

        body:
          formData,
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
        method:
          "DELETE",
      }
    );
  },


  archiveProduct(
    id
  ) {

    return request(
      `/admin/products/${id}`,
      {
        method:
          "DELETE",
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
