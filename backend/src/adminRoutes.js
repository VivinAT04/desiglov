import express from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";

import {
  z,
} from "zod";

import {
  pool,
} from "./db.js";

import {
  requireAuth,
  requireAdmin,
  writeAdminAudit,
} from "./auth.js";

import {
  publicProduct,
} from "./productRoutes.js";


const router =
  express.Router();


router.use(
  requireAuth,
  requireAdmin
);


// ===========================================================
// ADMIN SESSION CHECK
// ===========================================================

router.get(
  "/session",
  async (
    req,
    res
  ) => {

    return res.json({
      authenticated:
        true,

      admin: {
        id:
          req.admin.id,

        email:
          req.admin.email,

        fullName:
          req.admin.fullName,

        role:
          req.admin.role,
      },
    });
  }
);


// ===========================================================
// IMAGE UPLOAD CONFIG
// ===========================================================

const uploadDirectory =
  path.resolve(
    "uploads/products"
  );


fs.mkdirSync(
  uploadDirectory,
  {
    recursive: true,
  }
);


const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      callback
    ) => {

      callback(
        null,
        uploadDirectory
      );
    },


    filename: (
      req,
      file,
      callback
    ) => {

      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();


      const filename =
        `${
          Date.now()
        }-${
          crypto
            .randomBytes(6)
            .toString("hex")
        }${extension}`;


      callback(
        null,
        filename
      );
    },
  });


const upload =
  multer({

    storage,

    limits: {
      fileSize:
        8 *
        1024 *
        1024,

      files:
        8,
    },


    fileFilter: (
      req,
      file,
      callback
    ) => {

      const allowed =
        [
          "image/jpeg",
          "image/png",
          "image/webp",
        ];


      if (
        !allowed.includes(
          file.mimetype
        )
      ) {

        return callback(
          new Error(
            "Only JPG, PNG and WEBP images are allowed."
          )
        );
      }


      callback(
        null,
        true
      );
    },
  });


// ===========================================================
// HELPERS
// ===========================================================

function slugify(
  value
) {

  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}


function parseSizes(
  value
) {

  if (
    Array.isArray(
      value
    )
  ) {

    return value
      .map(
        (item) =>
          String(
            item
          ).trim()
      )
      .filter(Boolean);
  }


  if (
    typeof value ===
    "string"
  ) {

    try {

      const parsed =
        JSON.parse(
          value
        );


      if (
        Array.isArray(
          parsed
        )
      ) {

        return parsed
          .map(
            (item) =>
              String(
                item
              ).trim()
          )
          .filter(Boolean);
      }

    } catch {

      return value
        .split(",")
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean);
    }
  }


  return [];
}


function uploadedPaths(
  files
) {

  return (
    files || []
  ).map(
    (file) =>
      `/uploads/products/${file.filename}`
  );
}


const productSchema =
  z.object({

    name:
      z
        .string()
        .trim()
        .min(
          2,
          "Product name is required."
        )
        .max(180),

    category:
      z
        .string()
        .trim()
        .min(
          2,
          "Category is required."
        )
        .max(120),

    subcategory:
      z
        .string()
        .trim()
        .max(120)
        .optional()
        .default(""),

    priceINR:
      z
        .coerce
        .number()
        .int()
        .min(
          0,
          "Price cannot be negative."
        ),

    stock:
      z
        .coerce
        .number()
        .int()
        .min(
          0,
          "Stock cannot be negative."
        ),

    badge:
      z
        .string()
        .trim()
        .max(80)
        .optional()
        .default(""),

    colour:
      z
        .string()
        .trim()
        .max(120)
        .optional()
        .default(""),

    material:
      z
        .string()
        .trim()
        .max(2000)
        .optional()
        .default(""),

    description:
      z
        .string()
        .trim()
        .max(5000)
        .optional()
        .default(""),

    active:
      z
        .coerce
        .boolean()
        .optional()
        .default(true),
  });


// ===========================================================
// DASHBOARD
// ===========================================================

router.get(
  "/dashboard",
  async (
    req,
    res,
    next
  ) => {

    try {

      const [
        users,
        orders,
        revenue,
        products,
        pendingOrders,
      ] =
        await Promise.all([

          pool.query(`
            SELECT
              COUNT(*)::int
                AS count

            FROM users

            WHERE role = 'CUSTOMER'
          `),


          pool.query(`
            SELECT
              COUNT(*)::int
                AS count

            FROM orders
          `),


          pool.query(`
            SELECT
              COALESCE(
                SUM(total_inr),
                0
              )::int
                AS total

            FROM orders

            WHERE
              status != 'CANCELLED'
          `),


          pool.query(`
            SELECT
              COUNT(*)::int
                AS count

            FROM products

            WHERE active = TRUE
          `),


          pool.query(`
            SELECT
              COUNT(*)::int
                AS count

            FROM orders

            WHERE status IN (
              'PLACED',
              'CONFIRMED',
              'PACKED'
            )
          `),
        ]);


      const recent =
        await pool.query(
          `
          SELECT
            o.id,
            o.order_number,
            o.status,
            o.payment_method,
            o.payment_status,
            o.total_inr,
            o.created_at,

            u.full_name,
            u.email

          FROM orders o

          JOIN users u
            ON u.id =
              o.user_id

          ORDER BY
            o.created_at DESC

          LIMIT 5
          `
        );


      return res.json({

        stats: {

          customers:
            users
              .rows[0]
              .count,

          orders:
            orders
              .rows[0]
              .count,

          revenueINR:
            revenue
              .rows[0]
              .total,

          products:
            products
              .rows[0]
              .count,

          pendingOrders:
            pendingOrders
              .rows[0]
              .count,
        },


        recentOrders:
          recent.rows.map(
            (row) => ({

              id:
                row.id,

              orderNumber:
                row.order_number,

              status:
                row.status,

              paymentMethod:
                row.payment_method,

              paymentStatus:
                row.payment_status,

              totalINR:
                row.total_inr,

              createdAt:
                row.created_at,

              customerName:
                row.full_name,

              customerEmail:
                row.email,
            })
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// ORDERS
// ===========================================================

router.get(
  "/orders",
  async (
    req,
    res,
    next
  ) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            o.*,

            u.full_name
              AS customer_name,

            u.email
              AS customer_email,

            a.full_name
              AS delivery_name,

            a.phone
              AS delivery_phone,

            a.line1,
            a.line2,
            a.city,
            a.state,
            a.postal_code,
            a.country

          FROM orders o

          JOIN users u
            ON u.id =
              o.user_id

          LEFT JOIN addresses a
            ON a.id =
              o.address_id

          ORDER BY
            o.created_at DESC
          `
        );


      const orders =
        [];


      for (
        const row of
          result.rows
      ) {

        const itemResult =
          await pool.query(
            `
            SELECT
              product_name,
              size,
              quantity,
              unit_price_inr

            FROM order_items

            WHERE
              order_id = $1

            ORDER BY
              created_at ASC
            `,
            [
              row.id,
            ]
          );


        orders.push({

          id:
            row.id,

          orderNumber:
            row.order_number,

          status:
            row.status,

          paymentStatus:
            row.payment_status,

          paymentMethod:
            row.payment_method,

          subtotalINR:
            row.subtotal_inr,

          shippingINR:
            row.shipping_inr,

          totalINR:
            row.total_inr,

          createdAt:
            row.created_at,

          customer: {

            name:
              row.customer_name,

            email:
              row.customer_email,
          },

          address: {

            fullName:
              row.delivery_name,

            phone:
              row.delivery_phone,

            line1:
              row.line1,

            line2:
              row.line2,

            city:
              row.city,

            state:
              row.state,

            postalCode:
              row.postal_code,

            country:
              row.country,
          },

          items:
            itemResult.rows.map(
              (item) => ({

                productName:
                  item.product_name,

                size:
                  item.size,

                quantity:
                  item.quantity,

                unitPriceINR:
                  item.unit_price_inr,
              })
            ),
        });
      }


      return res.json({
        orders,
      });

    } catch (error) {

      next(error);
    }
  }
);


const statusSchema =
  z.object({

    status:
      z.enum([
        "PLACED",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "DISPATCHED",
        "ON_THE_WAY",
        "DELIVERED",
        "CANCELLED",
      ]),

    awbNumber:
      z.string()
        .trim()
        .max(120)
        .optional()
        .nullable(),
  });


router.patch(
  "/orders/:id/status",
  async (
    req,
    res,
    next
  ) => {

    try {

      const parsed =
        statusSchema.safeParse(
          req.body
        );


      if (
        !parsed.success
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid order status.",
          });
      }


      if (
        parsed.data.status === "ON_THE_WAY" &&
        !String(parsed.data.awbNumber || "").trim()
      ) {
        const existing =
          await pool.query(
            `
            SELECT awb_number
            FROM orders
            WHERE id = $1
            `,
            [req.params.id]
          );

        if (
          existing.rowCount === 0
        ) {
          return res
            .status(404)
            .json({
              error:
                "Order not found.",
            });
        }

        if (
          !String(
            existing.rows[0].awb_number || ""
          ).trim()
        ) {
          return res
            .status(400)
            .json({
              error:
                "Enter the Delhivery AWB number before marking the order On the Way.",
            });
        }
      }


      const result =
        await pool.query(
          `
          UPDATE orders

          SET
            status = $1,
            awb_number =
              CASE
                WHEN $2::text IS NULL
                  THEN awb_number
                ELSE NULLIF(TRIM($2::text), '')
              END,
            courier = 'Delhivery',
            updated_at = NOW()

          WHERE id = $3

          RETURNING
            id,
            order_number,
            status,
            courier,
            awb_number
          `,
          [
            parsed.data.status,
            parsed.data.awbNumber ?? null,
            req.params.id,
          ]
        );


      if (
        result.rowCount ===
        0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Order not found.",
          });
      }


      await writeAdminAudit({
        adminUserId:
          req.admin?.id ||
          req.userId ||
          null,

        adminEmail:
          req.admin?.email ||
          req.userEmail ||
          null,

        action:
          "ORDER_STATUS_CHANGED",

        entityType:
          "order",

        entityId:
          result.rows[0].id,

        metadata: {
          orderNumber:
            result.rows[0]
              .order_number,

          status:
            result.rows[0]
              .status,

          courier:
            result.rows[0]
              .courier,

          awbNumber:
            result.rows[0]
              .awb_number,
        },

        ipAddress:
          req.ip || null,
      });


      return res.json({
        order: {

          id:
            result.rows[0].id,

          orderNumber:
            result.rows[0]
              .order_number,

          status:
            result.rows[0]
              .status,

          courier:
            result.rows[0]
              .courier || "Delhivery",

          awbNumber:
            result.rows[0]
              .awb_number || "",
        },
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// CUSTOMERS
// ===========================================================

router.get(
  "/customers",
  async (
    req,
    res,
    next
  ) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            u.id,
            u.full_name,
            u.email,
            u.role,
            u.created_at,

            COUNT(
              DISTINCT o.id
            )::int
              AS order_count,

            COALESCE(
              SUM(
                CASE
                  WHEN
                    o.status != 'CANCELLED'

                  THEN
                    o.total_inr

                  ELSE
                    0
                END
              ),
              0
            )::int
              AS total_spent

          FROM users u

          LEFT JOIN orders o
            ON o.user_id =
              u.id

          GROUP BY
            u.id,
            u.full_name,
            u.email,
            u.role,
            u.created_at

          ORDER BY
            u.created_at DESC
          `
        );


      return res.json({

        customers:
          result.rows.map(
            (row) => ({

              id:
                row.id,

              fullName:
                row.full_name,

              email:
                row.email,

              role:
                row.role,

              createdAt:
                row.created_at,

              orderCount:
                row.order_count,

              totalSpentINR:
                row.total_spent,
            })
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// PRODUCTS — LIST ALL INCLUDING UNPUBLISHED
// ===========================================================

router.get(
  "/products",
  async (
    req,
    res,
    next
  ) => {

    try {

      const result =
        await pool.query(
          `
          SELECT *

          FROM products

          ORDER BY
            created_at DESC,
            id DESC
          `
        );


      return res.json({

        products:
          result.rows.map(
            publicProduct
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// CREATE PRODUCT
// ===========================================================

router.post(
  "/products",

  upload.array(
    "images",
    8
  ),

  async (
    req,
    res,
    next
  ) => {

    const client =
      await pool.connect();


    try {

      const parsed =
        productSchema.safeParse({
          ...req.body,

          active:
            req.body.active ===
              "false"
              ? false
              : true,
        });


      if (
        !parsed.success
      ) {

        return res
          .status(400)
          .json({
            error:
              parsed.error
                .issues[0]
                ?.message ||
              "Please check the product details.",
          });
      }


      const data =
        parsed.data;


      const sizes =
        parseSizes(
          req.body.sizes
        );


      if (
        sizes.length ===
        0
      ) {

        return res
          .status(400)
          .json({
            error:
              "Add at least one size.",
          });
      }


      const nameSlug =
        slugify(
          data.name
        );


      if (!nameSlug) {

        return res
          .status(400)
          .json({
            error:
              "Could not create a valid product URL.",
          });
      }


      let slug =
        nameSlug;


      let suffix =
        2;


      while (true) {

        const existing =
          await client.query(
            `
            SELECT id

            FROM products

            WHERE slug = $1

            LIMIT 1
            `,
            [
              slug,
            ]
          );


        if (
          existing.rowCount ===
          0
        ) {

          break;
        }


        slug =
          `${nameSlug}-${suffix}`;


        suffix +=
          1;
      }


      const images =
        uploadedPaths(
          req.files
        );


      await client.query(
        "BEGIN"
      );


      await client.query(
        `
        LOCK TABLE products
        IN EXCLUSIVE MODE
        `
      );


      const nextIdResult =
        await client.query(
          `
          SELECT
            COALESCE(
              MAX(id),
              0
            ) + 1
              AS next_id

          FROM products
          `
        );


      const id =
        Number(
          nextIdResult
            .rows[0]
            .next_id
        );


      const result =
        await client.query(
          `
          INSERT INTO products (
            id,
            slug,
            name,
            category,
            subcategory,
            price_inr,
            stock,
            badge,
            colour,
            material,
            description,
            image_path,
            sizes,
            images,
            active
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13::jsonb,
            $14::jsonb,
            $15
          )

          RETURNING *
          `,
          [
            id,
            slug,
            data.name,
            data.category,
            data.category === "Jewellery"
              ? data.subcategory || null
              : null,
            data.priceINR,
            data.stock,
            data.badge || null,
            data.colour || null,
            data.material || null,
            data.description || null,
            images[0] || null,
            JSON.stringify(
              sizes
            ),
            JSON.stringify(
              images
            ),
            data.active,
          ]
        );


      await client.query(
        "COMMIT"
      );


      await writeAdminAudit(
        req,
        {
          action:
            "PRODUCT_CREATED",

          entityType:
            "product",

          entityId:
            result.rows[0].id,

          metadata: {
            name:
              result.rows[0].name,

            slug:
              result.rows[0].slug,
          },
        }
      );


      return res
        .status(201)
        .json({

          message:
            "Product created.",

          product:
            publicProduct(
              result.rows[0]
            ),
        });

    } catch (error) {

      try {

        await client.query(
          "ROLLBACK"
        );

      } catch {
        // Ignore rollback errors.
      }


      next(error);

    } finally {

      client.release();
    }
  }
);


// ===========================================================
// EDIT ALL PRODUCT DETAILS
// ===========================================================

router.patch(
  "/products/:id/details",
  async (
    req,
    res,
    next
  ) => {

    try {

      const parsed =
        productSchema.safeParse(
          req.body
        );


      if (
        !parsed.success
      ) {

        return res
          .status(400)
          .json({
            error:
              parsed.error
                .issues[0]
                ?.message ||
              "Please check the product details.",
          });
      }


      const sizes =
        parseSizes(
          req.body.sizes
        );


      if (
        sizes.length ===
        0
      ) {

        return res
          .status(400)
          .json({
            error:
              "Add at least one size.",
          });
      }


      const data =
        parsed.data;


      const current =
        await pool.query(
          `
          SELECT *

          FROM products

          WHERE id = $1

          LIMIT 1
          `,
          [
            req.params.id,
          ]
        );


      if (
        current.rowCount ===
        0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Product not found.",
          });
      }


      const currentProduct =
        current.rows[0];


      let slug =
        currentProduct.slug;


      if (
        currentProduct.name !==
        data.name
      ) {

        const candidate =
          slugify(
            data.name
          );


        if (candidate) {

          const duplicate =
            await pool.query(
              `
              SELECT id

              FROM products

              WHERE
                slug = $1
                AND id != $2

              LIMIT 1
              `,
              [
                candidate,
                req.params.id,
              ]
            );


          if (
            duplicate.rowCount ===
            0
          ) {

            slug =
              candidate;
          }
        }
      }


      const result =
        await pool.query(
          `
          UPDATE products

          SET
            slug = $1,
            name = $2,
            category = $3,
            subcategory = $4,
            price_inr = $5,
            stock = $6,
            badge = $7,
            colour = $8,
            material = $9,
            description = $10,
            sizes = $11::jsonb,
            active = $12,
            updated_at = NOW()

          WHERE id = $13

          RETURNING *
          `,
          [
            slug,
            data.name,
            data.category,
            data.category === "Jewellery"
              ? data.subcategory || null
              : null,
            data.priceINR,
            data.stock,
            data.badge || null,
            data.colour || null,
            data.material || null,
            data.description || null,
            JSON.stringify(
              sizes
            ),
            data.active,
            req.params.id,
          ]
        );


      return res.json({

        message:
          "Product updated.",

        product:
          publicProduct(
            result.rows[0]
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// BACKWARDS-COMPATIBLE QUICK PRICE/STOCK UPDATE
// ===========================================================

const quickProductSchema =
  z.object({

    priceINR:
      z
        .number()
        .int()
        .min(0),

    stock:
      z
        .number()
        .int()
        .min(0),

    active:
      z
        .boolean(),
  });


router.patch(
  "/products/:id",
  async (
    req,
    res,
    next
  ) => {

    try {

      const parsed =
        quickProductSchema.safeParse(
          req.body
        );


      if (
        !parsed.success
      ) {

        return res
          .status(400)
          .json({
            error:
              "Please enter valid product values.",
          });
      }


      const result =
        await pool.query(
          `
          UPDATE products

          SET
            price_inr = $1,
            stock = $2,
            active = $3,
            updated_at = NOW()

          WHERE id = $4

          RETURNING *
          `,
          [
            parsed
              .data
              .priceINR,

            parsed
              .data
              .stock,

            parsed
              .data
              .active,

            req.params.id,
          ]
        );


      if (
        result.rowCount ===
        0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Product not found.",
          });
      }


      return res.json({

        message:
          "Product updated.",

        product:
          publicProduct(
            result.rows[0]
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// ADD IMAGES TO EXISTING PRODUCT
// ===========================================================

router.post(
  "/products/:id/images",

  upload.array(
    "images",
    8
  ),

  async (
    req,
    res,
    next
  ) => {

    try {

      if (
        !req.files ||
        req.files.length ===
        0
      ) {

        return res
          .status(400)
          .json({
            error:
              "Please choose at least one image.",
          });
      }


      const current =
        await pool.query(
          `
          SELECT *

          FROM products

          WHERE id = $1

          LIMIT 1
          `,
          [
            req.params.id,
          ]
        );


      if (
        current.rowCount ===
        0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Product not found.",
          });
      }


      const oldImages =
        Array.isArray(
          current.rows[0]
            .images
        )
          ? current
              .rows[0]
              .images
          : [];


      const newImages =
        [
          ...oldImages,
          ...uploadedPaths(
            req.files
          ),
        ];


      const result =
        await pool.query(
          `
          UPDATE products

          SET
            images = $1::jsonb,
            image_path = $2,
            updated_at = NOW()

          WHERE id = $3

          RETURNING *
          `,
          [
            JSON.stringify(
              newImages
            ),

            newImages[0] ||
              null,

            req.params.id,
          ]
        );


      return res.json({

        message:
          "Images uploaded.",

        product:
          publicProduct(
            result.rows[0]
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// SET PRODUCT COVER IMAGE
// ===========================================================

router.patch(
  "/products/:id/images/:index/cover",
  async (
    req,
    res,
    next
  ) => {

    try {

      const current =
        await pool.query(
          `
          SELECT *

          FROM products

          WHERE id = $1

          LIMIT 1
          `,
          [
            req.params.id,
          ]
        );


      if (
        current.rowCount ===
        0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Product not found.",
          });
      }


      const images =
        Array.isArray(
          current.rows[0]
            .images
        )
          ? [
              ...current
                .rows[0]
                .images,
            ]
          : [];


      const index =
        Number(
          req.params.index
        );


      if (
        !Number.isInteger(
          index
        ) ||
        index < 0 ||
        index >=
          images.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid image.",
          });
      }


      if (index !== 0) {

        const selectedImage =
          images.splice(
            index,
            1
          )[0];

        images.unshift(
          selectedImage
        );
      }


      const result =
        await pool.query(
          `
          UPDATE products

          SET
            images = $1::jsonb,
            image_path = $2,
            updated_at = NOW()

          WHERE id = $3

          RETURNING *
          `,
          [
            JSON.stringify(
              images
            ),

            images[0] ||
              null,

            req.params.id,
          ]
        );


      return res.json({

        message:
          "Cover image updated.",

        product:
          publicProduct(
            result.rows[0]
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// REMOVE ONE IMAGE
// ===========================================================

router.delete(
  "/products/:id/images/:index",
  async (
    req,
    res,
    next
  ) => {

    try {

      const current =
        await pool.query(
          `
          SELECT *

          FROM products

          WHERE id = $1

          LIMIT 1
          `,
          [
            req.params.id,
          ]
        );


      if (
        current.rowCount ===
        0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Product not found.",
          });
      }


      const images =
        Array.isArray(
          current.rows[0]
            .images
        )
          ? [
              ...current
                .rows[0]
                .images,
            ]
          : [];


      const index =
        Number(
          req.params.index
        );


      if (
        !Number.isInteger(
          index
        ) ||
        index < 0 ||
        index >=
          images.length
      ) {

        return res
          .status(400)
          .json({
            error:
              "Invalid image.",
          });
      }


      const removed =
        images.splice(
          index,
          1
        )[0];


      if (
        removed &&
        removed.startsWith(
          "/uploads/"
        )
      ) {

        const localPath =
          path.resolve(
            "." +
            removed
          );


        if (
          fs.existsSync(
            localPath
          )
        ) {

          fs.unlinkSync(
            localPath
          );
        }
      }


      const result =
        await pool.query(
          `
          UPDATE products

          SET
            images = $1::jsonb,
            image_path = $2,
            updated_at = NOW()

          WHERE id = $3

          RETURNING *
          `,
          [
            JSON.stringify(
              images
            ),

            images[0] ||
              null,

            req.params.id,
          ]
        );


      return res.json({

        message:
          "Image removed.",

        product:
          publicProduct(
            result.rows[0]
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// ARCHIVE PRODUCT
// ===========================================================

router.delete(
  "/products/:id",
  async (
    req,
    res,
    next
  ) => {

    try {

      const result =
        await pool.query(
          `
          UPDATE products

          SET
            active = FALSE,
            updated_at = NOW()

          WHERE id = $1

          RETURNING
            id,
            name
          `,
          [
            req.params.id,
          ]
        );


      if (
        result.rowCount ===
        0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Product not found.",
          });
      }


      await writeAdminAudit(
        req,
        {
          action:
            "PRODUCT_ARCHIVED",

          entityType:
            "product",

          entityId:
            result.rows[0].id,

          metadata: {
            name:
              result.rows[0].name,
          },
        }
      );


      return res.json({

        message:
          `${result.rows[0].name} archived.`,
      });

    } catch (error) {

      next(error);
    }
  }
);



// ===========================================================
// ADMIN AUDIT LOG
// ===========================================================

router.get(
  "/audit-log",
  async (
    req,
    res,
    next
  ) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            id,
            admin_email,
            action,
            entity_type,
            entity_id,
            metadata,
            ip_address,
            created_at

          FROM admin_audit_log

          ORDER BY
            created_at DESC

          LIMIT 100
          `
        );


      return res.json({
        entries:
          result.rows.map(
            (row) => ({
              id:
                row.id,

              adminEmail:
                row.admin_email,

              action:
                row.action,

              entityType:
                row.entity_type,

              entityId:
                row.entity_id,

              metadata:
                row.metadata,

              ipAddress:
                row.ip_address,

              createdAt:
                row.created_at,
            })
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


export default router;
