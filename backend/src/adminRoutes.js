import express from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

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

import {
  parseSizeStock,
  syncProductSizeStock,
} from "./sizeStock.js";


const router =
  express.Router();


router.use(
  requireAuth,
  requireAdmin
);






// ===========================================================
// NEWSLETTER ADMIN
// ===========================================================

function newsletterEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


router.get(
  "/newsletter",
  async (req, res, next) => {
    try {
      const subscribersResult =
        await pool.query(`
          SELECT
            COUNT(*)::int AS count
          FROM newsletter_subscribers
          WHERE active = TRUE
        `);

      const productsResult =
        await pool.query(`
          SELECT
            id,
            slug,
            name,
            category,
            price_inr,
            sale_price_inr,
            sale_ends_at,
            description,
            images,
            image_path,
            active
          FROM products
          WHERE active = TRUE
          ORDER BY updated_at DESC, id DESC
        `);

      const products =
        productsResult.rows.map(
          (row) => {
            const images =
              Array.isArray(row.images)
                ? row.images
                : [];

            return {
              id: row.id,
              slug: row.slug,
              name: row.name,
              category: row.category,
              priceINR:
                Number(row.price_inr || 0),
              salePriceINR:
                row.sale_price_inr == null
                  ? null
                  : Number(row.sale_price_inr),
              saleEndsAt:
                row.sale_ends_at,
              description:
                row.description || "",
              image:
                images[0] ||
                row.image_path ||
                "",
              active:
                Boolean(row.active),
            };
          }
        );

      return res.json({
        subscriberCount:
          Number(
            subscribersResult.rows[0]?.count ||
            0
          ),
        products,
      });
    } catch (error) {
      next(error);
    }
  }
);


router.post(
  "/newsletter/send",
  async (req, res, next) => {
    try {
      const productId =
        Number(req.body?.productId);

      const subject =
        String(
          req.body?.subject || ""
        ).trim();

      const message =
        String(
          req.body?.message || ""
        ).trim();

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          error:
            "Please select a product.",
        });
      }

      if (
        !subject ||
        subject.length > 160
      ) {
        return res.status(400).json({
          error:
            "Please enter a subject up to 160 characters.",
        });
      }

      if (
        !message ||
        message.length > 2000
      ) {
        return res.status(400).json({
          error:
            "Please enter a message up to 2000 characters.",
        });
      }

      const productResult =
        await pool.query(
          `
          SELECT
            id,
            slug,
            name,
            category,
            price_inr,
            sale_price_inr,
            sale_ends_at,
            description,
            images,
            image_path,
            active
          FROM products
          WHERE id = $1
            AND active = TRUE
          LIMIT 1
          `,
          [productId]
        );

      if (
        productResult.rowCount === 0
      ) {
        return res.status(404).json({
          error:
            "Published product not found.",
        });
      }

      const subscribersResult =
        await pool.query(`
          SELECT email
          FROM newsletter_subscribers
          WHERE active = TRUE
          ORDER BY created_at ASC
        `);

      const recipients =
        subscribersResult.rows
          .map(
            (row) =>
              String(row.email || "")
                .trim()
                .toLowerCase()
          )
          .filter(Boolean);

      if (recipients.length === 0) {
        return res.status(400).json({
          error:
            "There are no active newsletter subscribers.",
        });
      }

      const apiKey =
        process.env.RESEND_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error:
            "Newsletter email service is not configured.",
        });
      }

      const product =
        productResult.rows[0];

      const images =
        Array.isArray(product.images)
          ? product.images
          : [];

      const imageUrl =
        images[0] ||
        product.image_path ||
        "";

      const now =
        Date.now();

      const saleActive =
        product.sale_price_inr != null &&
        product.sale_ends_at &&
        new Date(
          product.sale_ends_at
        ).getTime() > now;

      const price =
        saleActive
          ? Number(
              product.sale_price_inr
            )
          : Number(
              product.price_inr
            );

      const storeUrl =
        (
          process.env.FRONTEND_URL ||
          "https://desiglov.com"
        ).replace(/\/+$/, "");

      const productUrl =
        `${storeUrl}/product/${encodeURIComponent(
          product.slug
        )}`;

      const safeSubject =
        newsletterEscapeHtml(
          subject
        );

      const safeMessage =
        newsletterEscapeHtml(
          message
        ).replace(
          /\n/g,
          "<br />"
        );

      const safeName =
        newsletterEscapeHtml(
          product.name
        );

      const safeCategory =
        newsletterEscapeHtml(
          product.category
        );

      const safeImage =
        newsletterEscapeHtml(
          imageUrl
        );

      const safeProductUrl =
        newsletterEscapeHtml(
          productUrl
        );

      const resend =
        new Resend(apiKey);

      let sent = 0;
      const failures = [];

      // Send individually so subscriber addresses
      // are never exposed to other customers.
      for (const email of recipients) {
        const result =
          await resend.emails.send({
            from:
              process.env.NEWSLETTER_FROM_EMAIL ||
              "DEsiglov <hello@desiglov.com>",

            to: [email],

            subject,

            text: [
              message,
              "",
              `${product.name} — ₹${price.toLocaleString(
                "en-IN"
              )}`,
              productUrl,
              "",
              "DEsiglov",
              "Rare finds. Real style.",
            ].join("\n"),

            html: `
              <div style="margin:0;background:#f3e8df;padding:40px 16px;font-family:Arial,sans-serif;color:#211f1d;">
                <div style="max-width:620px;margin:0 auto;background:#ffffff;">
                  <div style="padding:32px 32px 22px;text-align:center;border-bottom:1px solid #ead9cf;">
                    <div style="font-family:Georgia,serif;font-size:30px;letter-spacing:2px;">
                      DESI<span style="color:#b87554;font-style:italic;">GLOV</span>
                    </div>
                    <div style="margin-top:8px;font-size:9px;letter-spacing:4px;color:#9c8c82;">
                      RARE FINDS · REAL STYLE
                    </div>
                  </div>

                  ${
                    safeImage
                      ? `
                        <a href="${safeProductUrl}" style="display:block;">
                          <img
                            src="${safeImage}"
                            alt="${safeName}"
                            style="display:block;width:100%;max-height:620px;object-fit:cover;"
                          />
                        </a>
                      `
                      : ""
                  }

                  <div style="padding:38px 34px 42px;">
                    <div style="font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#b87554;margin-bottom:14px;">
                      ${safeCategory}
                    </div>

                    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:38px;line-height:1.1;margin:0 0 14px;">
                      ${safeName}
                    </h1>

                    <div style="font-family:Georgia,serif;font-size:23px;margin-bottom:24px;">
                      ₹${price.toLocaleString(
                        "en-IN"
                      )}
                    </div>

                    <div style="font-size:15px;line-height:1.8;color:#615a56;margin-bottom:30px;">
                      ${safeMessage}
                    </div>

                    <a
                      href="${safeProductUrl}"
                      style="display:inline-block;background:#211f1d;color:#ffffff;text-decoration:none;padding:15px 25px;font-size:11px;letter-spacing:2px;"
                    >
                      SHOP NOW →
                    </a>
                  </div>

                  <div style="padding:24px 32px;background:#211f1d;color:#d9c8bd;text-align:center;font-size:11px;line-height:1.7;">
                    DEsiglov · Rare finds. Real style.
                    <br />
                    You received this because you joined the DEsiglov Letter.
                  </div>
                </div>
              </div>
            `,
          });

        if (result.error) {
          failures.push({
            email,
            error:
              result.error.message ||
              "Send failed",
          });
        } else {
          sent += 1;
        }
      }

      if (sent === 0) {
        console.error(
          "Newsletter send failures:",
          failures
        );

        return res.status(502).json({
          error:
            "The newsletter could not be sent.",
        });
      }

      if (failures.length > 0) {
        console.error(
          "Some newsletter emails failed:",
          failures
        );
      }

      return res.json({
        ok: true,
        sent,
        failed:
          failures.length,
        message:
          `Newsletter sent to ${sent} subscriber${
            sent === 1 ? "" : "s"
          }.`,
      });
    } catch (error) {
      next(error);
    }
  }
);


// ===========================================================
// DISCOUNT CODES
// ===========================================================

const discountCodeSchema =
  z.object({
    code:
      z.string()
        .trim()
        .min(
          1,
          "Discount code is required."
        )
        .max(50),

    discountType:
      z.enum([
        "PERCENTAGE",
        "FIXED",
      ]),

    discountValue:
      z.coerce
        .number()
        .int()
        .positive(
          "Discount value must be greater than zero."
        ),

    minimumOrderINR:
      z.coerce
        .number()
        .int()
        .min(0)
        .default(0),

    expiresAt:
      z.union([
        z.string(),
        z.null(),
      ])
        .optional(),

    active:
      z.boolean()
        .default(true),
  })
  .superRefine(
    (
      value,
      ctx
    ) => {
      if (
        value.discountType ===
          "PERCENTAGE" &&
        value.discountValue > 100
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "discountValue",
          ],

          message:
            "Percentage discount cannot be more than 100%.",
        });
      }

      if (
        value.expiresAt &&
        Number.isNaN(
          new Date(
            value.expiresAt
          ).getTime()
        )
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,

          path: [
            "expiresAt",
          ],

          message:
            "Please enter a valid expiry date.",
        });
      }
    }
  );


function adminDiscountCode(
  row
) {
  return {
    id:
      row.id,

    code:
      row.code,

    discountType:
      row.discount_type,

    discountValue:
      Number(
        row.discount_value
      ),

    minimumOrderINR:
      Number(
        row.minimum_order_inr ||
        0
      ),

    expiresAt:
      row.expires_at,

    active:
      Boolean(
        row.active
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}


router.get(
  "/discount-codes",
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
          FROM discount_codes
          ORDER BY created_at DESC
          `
        );

      return res.json({
        discountCodes:
          result.rows.map(
            adminDiscountCode
          ),
      });

    } catch (error) {
      next(error);
    }
  }
);


router.post(
  "/discount-codes",
  async (
    req,
    res,
    next
  ) => {
    const parsed =
      discountCodeSchema
        .safeParse(
          req.body
        );

    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error:
            parsed.error
              .issues[0]
              ?.message ||
            "Please check the discount code.",
        });
    }

    const data =
      parsed.data;

    const code =
      data.code
        .trim()
        .toUpperCase();

    try {
      const result =
        await pool.query(
          `
          INSERT INTO discount_codes (
            id,
            code,
            discount_type,
            discount_value,
            minimum_order_inr,
            expires_at,
            active
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          RETURNING *
          `,
          [
            crypto.randomUUID(),
            code,
            data.discountType,
            data.discountValue,
            data.minimumOrderINR,
            data.expiresAt
              ? new Date(
                  data.expiresAt
                )
              : null,
            data.active,
          ]
        );

      return res
        .status(201)
        .json({
          message:
            `${code} created.`,

          discountCode:
            adminDiscountCode(
              result.rows[0]
            ),
        });

    } catch (error) {
      if (
        error?.code === "23505"
      ) {
        return res
          .status(409)
          .json({
            error:
              "That discount code already exists.",
          });
      }

      next(error);
    }
  }
);


router.patch(
  "/discount-codes/:id",
  async (
    req,
    res,
    next
  ) => {
    const parsed =
      discountCodeSchema
        .safeParse(
          req.body
        );

    if (!parsed.success) {
      return res
        .status(400)
        .json({
          error:
            parsed.error
              .issues[0]
              ?.message ||
            "Please check the discount code.",
        });
    }

    const data =
      parsed.data;

    const code =
      data.code
        .trim()
        .toUpperCase();

    try {
      const result =
        await pool.query(
          `
          UPDATE discount_codes
          SET
            code = $1,
            discount_type = $2,
            discount_value = $3,
            minimum_order_inr = $4,
            expires_at = $5,
            active = $6,
            updated_at = NOW()
          WHERE id = $7
          RETURNING *
          `,
          [
            code,
            data.discountType,
            data.discountValue,
            data.minimumOrderINR,
            data.expiresAt
              ? new Date(
                  data.expiresAt
                )
              : null,
            data.active,
            req.params.id,
          ]
        );

      if (!result.rowCount) {
        return res
          .status(404)
          .json({
            error:
              "Discount code not found.",
          });
      }

      return res.json({
        message:
          `${code} updated.`,

        discountCode:
          adminDiscountCode(
            result.rows[0]
          ),
      });

    } catch (error) {
      if (
        error?.code === "23505"
      ) {
        return res
          .status(409)
          .json({
            error:
              "That discount code already exists.",
          });
      }

      next(error);
    }
  }
);


router.delete(
  "/discount-codes/:id",
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await pool.query(
          `
          DELETE FROM discount_codes
          WHERE id = $1
          RETURNING id, code
          `,
          [
            req.params.id,
          ]
        );

      if (!result.rowCount) {
        return res
          .status(404)
          .json({
            error:
              "Discount code not found.",
          });
      }

      return res.json({
        message:
          `${result.rows[0].code} deleted.`,
      });

    } catch (error) {
      next(error);
    }
  }
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

// Keep uploads in memory while sending them to Supabase.
// Nothing is permanently stored on Render's filesystem.
const storage =
  multer.memoryStorage();


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
// SUPABASE PRODUCT IMAGE STORAGE
// ===========================================================

const PRODUCT_IMAGE_BUCKET =
  "product-images";


function getImageStorageClient() {

  const supabaseUrl =
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {

    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}


function getImageExtension(
  file
) {

  const extension =
    path
      .extname(
        file.originalname || ""
      )
      .toLowerCase();

  if (
    [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ].includes(
      extension
    )
  ) {

    return extension;
  }

  if (
    file.mimetype ===
    "image/png"
  ) {

    return ".png";
  }

  if (
    file.mimetype ===
    "image/webp"
  ) {

    return ".webp";
  }

  return ".jpg";
}


async function uploadProductImages(
  files,
  productFolder
) {

  const selectedFiles =
    files || [];

  if (
    selectedFiles.length ===
    0
  ) {

    return [];
  }

  const supabase =
    getImageStorageClient();

  const uploaded =
    [];

  try {

    for (
      const file of
      selectedFiles
    ) {

      if (
        !file.buffer
      ) {

        throw new Error(
          "Image buffer is missing."
        );
      }

      const extension =
        getImageExtension(
          file
        );

      const objectPath =
        `products/${productFolder}/${Date.now()}-${crypto
          .randomBytes(10)
          .toString("hex")}${extension}`;

      const {
        error: uploadError,
      } =
        await supabase
          .storage
          .from(
            PRODUCT_IMAGE_BUCKET
          )
          .upload(
            objectPath,
            file.buffer,
            {
              contentType:
                file.mimetype,

              cacheControl:
                "31536000",

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {

        throw new Error(
          `Supabase image upload failed: ${uploadError.message}`
        );
      }

      const {
        data,
      } =
        supabase
          .storage
          .from(
            PRODUCT_IMAGE_BUCKET
          )
          .getPublicUrl(
            objectPath
          );

      if (
        !data?.publicUrl
      ) {

        throw new Error(
          "Supabase public image URL was not generated."
        );
      }

      uploaded.push({
        objectPath,
        url:
          data.publicUrl,
      });
    }

    return uploaded;

  } catch (error) {

    if (
      uploaded.length >
      0
    ) {

      try {

        await supabase
          .storage
          .from(
            PRODUCT_IMAGE_BUCKET
          )
          .remove(
            uploaded.map(
              (item) =>
                item.objectPath
            )
          );

      } catch {
        // Keep original upload error.
      }
    }

    throw error;
  }
}


async function uploadedPaths(
  files,
  productFolder
) {

  const uploaded =
    await uploadProductImages(
      files,
      productFolder
    );

  return uploaded.map(
    (item) =>
      item.url
  );
}


function getSupabaseImageObjectPath(
  imageUrl
) {

  if (
    typeof imageUrl !==
    "string"
  ) {

    return null;
  }

  const marker =
    `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;

  const markerIndex =
    imageUrl.indexOf(
      marker
    );

  if (
    markerIndex ===
    -1
  ) {

    return null;
  }

  const encodedPath =
    imageUrl.slice(
      markerIndex +
      marker.length
    );

  if (
    !encodedPath
  ) {

    return null;
  }

  try {

    return decodeURIComponent(
      encodedPath
    );

  } catch {

    return encodedPath;
  }
}


async function deleteSupabaseProductImage(
  imageUrl
) {

  const objectPath =
    getSupabaseImageObjectPath(
      imageUrl
    );

  if (
    !objectPath
  ) {

    return;
  }

  const supabase =
    getImageStorageClient();

  const {
    error,
  } =
    await supabase
      .storage
      .from(
        PRODUCT_IMAGE_BUCKET
      )
      .remove([
        objectPath,
      ]);

  if (
    error
  ) {

    console.error(
      "Supabase image deletion failed:",
      error.message
    );
  }
}


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

    salePriceINR:
      z
        .union([
          z.coerce.number().int().positive(),
          z.literal(""),
          z.null(),
        ])
        .optional()
        .default(null),

    saleEndsAt:
      z
        .union([
          z.string(),
          z.literal(""),
          z.null(),
        ])
        .optional()
        .default(null),

    stock:
      z
        .coerce
        .number()
        .int()
        .min(
          0,
          "Stock cannot be negative."
        )
        .optional()
        .default(0),

    sizeStock:
      z
        .any()
        .optional()
        .default({}),

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
          SELECT
            p.*,

            COALESCE(
              (
                SELECT
                  jsonb_object_agg(
                    pss.size,
                    pss.stock
                  )
                FROM product_size_stock pss
                WHERE pss.product_id = p.id
              ),
              '{}'::jsonb
            ) AS size_stock,

            COALESCE(
              (
                SELECT
                  jsonb_object_agg(
                    pss.size,
                    GREATEST(
                      pss.stock -
                      pss.reserved_stock,
                      0
                    )
                  )
                FROM product_size_stock pss
                WHERE pss.product_id = p.id
              ),
              '{}'::jsonb
            ) AS size_available

          FROM products p

          ORDER BY
            p.created_at DESC,
            p.id DESC
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

      const salePriceINR =
        data.salePriceINR === "" ||
        data.salePriceINR === null ||
        data.salePriceINR === undefined
          ? null
          : Number(data.salePriceINR);

      const saleEndsAt =
        data.saleEndsAt
          ? new Date(data.saleEndsAt)
          : null;

      if (
        salePriceINR !== null &&
        salePriceINR >= Number(data.priceINR)
      ) {
        return res.status(400).json({
          error: "Discount price must be lower than the normal price.",
        });
      }

      if (
        (salePriceINR === null) !==
        (saleEndsAt === null)
      ) {
        return res.status(400).json({
          error: "Add both a discount price and sale end time.",
        });
      }

      if (saleEndsAt) {
        const now = Date.now();
        const end = saleEndsAt.getTime();
        const maximum = now + 7 * 24 * 60 * 60 * 1000;

        if (
          Number.isNaN(end) ||
          end <= now ||
          end > maximum
        ) {
          return res.status(400).json({
            error: "Sale must end in the future and within 7 days.",
          });
        }
      }


      const sizes =
        parseSizes(
          req.body.sizes
        )
          .map(
            (size) =>
              String(size)
                .trim()
                .toUpperCase()
          )
          .filter(Boolean);

      const sizeStock =
        parseSizeStock(
          req.body.sizeStock
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
        await uploadedPaths(
          req.files,
          `new-${Date.now()}`
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
            sale_price_inr,
            sale_ends_at,
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
            $13,
            $14,
            $15::jsonb,
            $16::jsonb,
            $17
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
            salePriceINR,
            saleEndsAt
              ? saleEndsAt.toISOString()
              : null,
            0,
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


      await syncProductSizeStock(
        client,
        id,
        sizes,
        sizeStock
      );


      const syncedResult =
        await client.query(
          `
          SELECT
            p.*,

            COALESCE(
              (
                SELECT
                  jsonb_object_agg(
                    pss.size,
                    pss.stock
                  )
                FROM product_size_stock pss
                WHERE pss.product_id = p.id
              ),
              '{}'::jsonb
            ) AS size_stock,

            COALESCE(
              (
                SELECT
                  jsonb_object_agg(
                    pss.size,
                    GREATEST(
                      pss.stock -
                      pss.reserved_stock,
                      0
                    )
                  )
                FROM product_size_stock pss
                WHERE pss.product_id = p.id
              ),
              '{}'::jsonb
            ) AS size_available

          FROM products p

          WHERE p.id = $1

          LIMIT 1
          `,
          [
            id,
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
            syncedResult.rows[0].id,

          metadata: {
            name:
              syncedResult.rows[0].name,

            slug:
              syncedResult.rows[0].slug,
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
              syncedResult.rows[0]
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
        )
          .map(
            (size) =>
              String(size)
                .trim()
                .toUpperCase()
          )
          .filter(Boolean);

      const sizeStock =
        parseSizeStock(
          req.body.sizeStock
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

      const salePriceINR =
        data.salePriceINR === "" ||
        data.salePriceINR === null ||
        data.salePriceINR === undefined
          ? null
          : Number(data.salePriceINR);

      const saleEndsAt =
        data.saleEndsAt
          ? new Date(data.saleEndsAt)
          : null;

      if (
        salePriceINR !== null &&
        salePriceINR >= Number(data.priceINR)
      ) {
        return res.status(400).json({
          error: "Discount price must be lower than the normal price.",
        });
      }

      if (
        (salePriceINR === null) !==
        (saleEndsAt === null)
      ) {
        return res.status(400).json({
          error: "Add both a discount price and sale end time.",
        });
      }

      if (saleEndsAt) {
        const now = Date.now();
        const end = saleEndsAt.getTime();
        const maximum = now + 7 * 24 * 60 * 60 * 1000;

        if (
          Number.isNaN(end) ||
          end <= now ||
          end > maximum
        ) {
          return res.status(400).json({
            error: "Sale must end in the future and within 7 days.",
          });
        }
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
            sale_price_inr = $6,
            sale_ends_at = $7,
            badge = $8,
            colour = $9,
            material = $10,
            description = $11,
            sizes = $12::jsonb,
            active = $13,
            updated_at = NOW()

          WHERE id = $14

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
            salePriceINR,
            saleEndsAt
              ? saleEndsAt.toISOString()
              : null,
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


      await syncProductSizeStock(
        pool,
        req.params.id,
        sizes,
        sizeStock
      );


      const syncedResult =
        await pool.query(
          `
          SELECT
            p.*,

            COALESCE(
              (
                SELECT
                  jsonb_object_agg(
                    pss.size,
                    pss.stock
                  )
                FROM product_size_stock pss
                WHERE pss.product_id = p.id
              ),
              '{}'::jsonb
            ) AS size_stock,

            COALESCE(
              (
                SELECT
                  jsonb_object_agg(
                    pss.size,
                    GREATEST(
                      pss.stock -
                      pss.reserved_stock,
                      0
                    )
                  )
                FROM product_size_stock pss
                WHERE pss.product_id = p.id
              ),
              '{}'::jsonb
            ) AS size_available

          FROM products p

          WHERE p.id = $1

          LIMIT 1
          `,
          [
            req.params.id,
          ]
        );


      return res.json({

        message:
          "Product updated.",

        product:
          publicProduct(
            syncedResult.rows[0]
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
            active = $2,
            updated_at = NOW()

          WHERE id = $3

          RETURNING *
          `,
          [
            parsed
              .data
              .priceINR,

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


      const uploadedImages =
        await uploadedPaths(
          req.files,
          req.params.id
        );


      const newImages =
        [
          ...oldImages,
          ...uploadedImages,
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
// REORDER PRODUCT IMAGE
// ===========================================================

router.patch(
  "/products/:id/images/:index/move",
  async (req, res, next) => {
    try {
      const current = await pool.query(
        `
          SELECT *
          FROM products
          WHERE id = $1
          LIMIT 1
        `,
        [req.params.id]
      );

      if (current.rowCount === 0) {
        return res.status(404).json({
          error: "Product not found.",
        });
      }

      const images = Array.isArray(current.rows[0].images)
        ? [...current.rows[0].images]
        : [];

      const index = Number(req.params.index);
      const direction = req.body?.direction;

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= images.length
      ) {
        return res.status(400).json({
          error: "Invalid image.",
        });
      }

      if (
        direction !== "left" &&
        direction !== "right"
      ) {
        return res.status(400).json({
          error: "Invalid move direction.",
        });
      }

      const targetIndex =
        direction === "left"
          ? index - 1
          : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= images.length
      ) {
        return res.status(400).json({
          error: "Image cannot move further.",
        });
      }

      [
        images[index],
        images[targetIndex],
      ] = [
        images[targetIndex],
        images[index],
      ];

      const result = await pool.query(
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
          JSON.stringify(images),
          images[0] || null,
          req.params.id,
        ]
      );

      return res.json({
        message: "Image order updated.",
        product: publicProduct(
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

        // Legacy Render image.
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

      } else if (
        removed
      ) {

        // Supabase image is deleted only when
        // the admin explicitly removes it.
        await deleteSupabaseProductImage(
          removed
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
