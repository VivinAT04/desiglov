import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

import { pool } from "./db.js";
import { requireAuth } from "./auth.js";

const router = express.Router();


// ============================================================
// REVIEW MEDIA CONFIG
// ============================================================

const REVIEW_MEDIA_BUCKET = "product-images";

const MAX_REVIEW_FILES = 5;

const IMAGE_MAX_BYTES =
  5 * 1024 * 1024;

const VIDEO_MAX_BYTES =
  40 * 1024 * 1024;

const ABSOLUTE_MAX_BYTES =
  VIDEO_MAX_BYTES;

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const allowedVideoTypes = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);


const reviewUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      files:
        MAX_REVIEW_FILES,

      fileSize:
        ABSOLUTE_MAX_BYTES,
    },

    fileFilter: (
      req,
      file,
      callback
    ) => {

      const allowed =
        allowedImageTypes.has(
          file.mimetype
        ) ||
        allowedVideoTypes.has(
          file.mimetype
        );

      if (!allowed) {
        return callback(
          new Error(
            "Only JPG, PNG, WEBP, MP4, MOV and WEBM files are allowed."
          )
        );
      }

      callback(
        null,
        true
      );
    },
  });


function getReviewStorageClient() {

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


function getReviewMediaExtension(
  file
) {

  const extension =
    path
      .extname(
        file.originalname || ""
      )
      .toLowerCase();

  const allowedExtensions =
    new Set([
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".mp4",
      ".mov",
      ".webm",
    ]);

  if (
    allowedExtensions.has(
      extension
    )
  ) {
    return extension;
  }

  switch (file.mimetype) {
    case "image/png":
      return ".png";

    case "image/webp":
      return ".webp";

    case "image/jpeg":
      return ".jpg";

    case "video/webm":
      return ".webm";

    case "video/quicktime":
      return ".mov";

    default:
      return ".mp4";
  }
}


function validateReviewMediaFiles(
  files
) {

  const selectedFiles =
    Array.isArray(files)
      ? files
      : [];

  if (
    selectedFiles.length >
    MAX_REVIEW_FILES
  ) {
    throw new Error(
      `You can upload up to ${MAX_REVIEW_FILES} photos or videos.`
    );
  }

  for (
    const file of
    selectedFiles
  ) {

    if (
      allowedImageTypes.has(
        file.mimetype
      ) &&
      file.size >
        IMAGE_MAX_BYTES
    ) {
      throw new Error(
        `${file.originalname || "Image"} is too large. Images must be 5 MB or smaller.`
      );
    }

    if (
      allowedVideoTypes.has(
        file.mimetype
      ) &&
      file.size >
        VIDEO_MAX_BYTES
    ) {
      throw new Error(
        `${file.originalname || "Video"} is too large. Videos must be 40 MB or smaller.`
      );
    }
  }
}


async function uploadReviewMedia(
  files,
  {
    productId,
    userId,
  }
) {

  const selectedFiles =
    Array.isArray(files)
      ? files
      : [];

  if (
    selectedFiles.length === 0
  ) {
    return [];
  }

  validateReviewMediaFiles(
    selectedFiles
  );

  const supabase =
    getReviewStorageClient();

  const uploaded = [];

  try {

    for (
      const file of
      selectedFiles
    ) {

      if (!file.buffer) {
        throw new Error(
          "Review media buffer is missing."
        );
      }

      const extension =
        getReviewMediaExtension(
          file
        );

      const safeUserId =
        String(userId)
          .replace(
            /[^a-zA-Z0-9_-]/g,
            ""
          );

      const objectPath =
        `reviews/product-${productId}/${safeUserId}/${Date.now()}-${crypto
          .randomBytes(10)
          .toString("hex")}${extension}`;

      const {
        error: uploadError,
      } =
        await supabase
          .storage
          .from(
            REVIEW_MEDIA_BUCKET
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

      if (uploadError) {
        throw new Error(
          `Review media upload failed: ${uploadError.message}`
        );
      }

      const {
        data,
      } =
        supabase
          .storage
          .from(
            REVIEW_MEDIA_BUCKET
          )
          .getPublicUrl(
            objectPath
          );

      if (
        !data?.publicUrl
      ) {
        throw new Error(
          "Review media public URL was not generated."
        );
      }

      uploaded.push({
        type:
          allowedVideoTypes.has(
            file.mimetype
          )
            ? "video"
            : "image",

        url:
          data.publicUrl,

        objectPath,

        mimeType:
          file.mimetype,

        name:
          file.originalname || "",
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
            REVIEW_MEDIA_BUCKET
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


function getReviewMediaObjectPath(
  mediaUrl
) {

  if (
    typeof mediaUrl !==
    "string"
  ) {
    return null;
  }

  const marker =
    `/storage/v1/object/public/${REVIEW_MEDIA_BUCKET}/`;

  const markerIndex =
    mediaUrl.indexOf(
      marker
    );

  if (
    markerIndex === -1
  ) {
    return null;
  }

  const encodedPath =
    mediaUrl.slice(
      markerIndex +
      marker.length
    );

  if (!encodedPath) {
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


async function deleteReviewMedia(
  media
) {

  const items =
    Array.isArray(media)
      ? media
      : [];

  const objectPaths =
    items
      .map(
        (item) =>
          item?.objectPath ||
          getReviewMediaObjectPath(
            item?.url
          )
      )
      .filter(Boolean);

  if (
    objectPaths.length === 0
  ) {
    return;
  }

  const supabase =
    getReviewStorageClient();

  const {
    error,
  } =
    await supabase
      .storage
      .from(
        REVIEW_MEDIA_BUCKET
      )
      .remove(
        objectPaths
      );

  if (error) {
    console.error(
      "Supabase review media deletion failed:",
      error.message
    );
  }
}


// ============================================================
// HELPERS
// ============================================================

function validProductId(value) {

  const id =
    Number(value);

  return (
    Number.isInteger(id) &&
    id > 0
      ? id
      : null
  );
}


function normaliseMedia(
  value
) {

  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item ===
          "object" &&
        typeof item.url ===
          "string" &&
        item.url
    )
    .slice(
      0,
      MAX_REVIEW_FILES
    )
    .map(
      (item) => ({
        type:
          item.type ===
          "video"
            ? "video"
            : "image",

        url:
          item.url,

        mimeType:
          item.mimeType || "",

        name:
          item.name || "",
      })
    );
}


function normaliseReview(row) {

  return {
    id:
      row.id,

    productId:
      row.product_id,

    userId:
      row.user_id,

    customerName:
      row.customer_name ||
      "Customer",

    rating:
      Number(row.rating),

    comment:
      row.comment || "",

    media:
      normaliseMedia(
        row.media
      ),

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}


async function getSummary(
  productId
) {

  const result =
    await pool.query(
      `
        SELECT
          COUNT(*)::int AS review_count,
          COALESCE(AVG(rating), 0)::numeric(10,2) AS average_rating,

          COUNT(*) FILTER (
            WHERE rating = 5
          )::int AS five_star,

          COUNT(*) FILTER (
            WHERE rating = 4
          )::int AS four_star,

          COUNT(*) FILTER (
            WHERE rating = 3
          )::int AS three_star,

          COUNT(*) FILTER (
            WHERE rating = 2
          )::int AS two_star,

          COUNT(*) FILTER (
            WHERE rating = 1
          )::int AS one_star

        FROM product_reviews
        WHERE product_id = $1
      `,
      [
        productId,
      ]
    );

  const row =
    result.rows[0];

  return {
    count:
      Number(
        row.review_count || 0
      ),

    average:
      Number(
        row.average_rating || 0
      ),

    breakdown: {
      5:
        Number(
          row.five_star || 0
        ),

      4:
        Number(
          row.four_star || 0
        ),

      3:
        Number(
          row.three_star || 0
        ),

      2:
        Number(
          row.two_star || 0
        ),

      1:
        Number(
          row.one_star || 0
        ),
    },
  };
}


// ============================================================
// GET REVIEWS FOR ONE PRODUCT
// ============================================================

router.get(
  "/product/:productId",

  async (
    req,
    res,
    next
  ) => {

    try {

      const productId =
        validProductId(
          req.params.productId
        );

      if (!productId) {
        return res
          .status(400)
          .json({
            error:
              "Invalid product.",
          });
      }

      const product =
        await pool.query(
          `
            SELECT id
            FROM products
            WHERE id = $1
            LIMIT 1
          `,
          [
            productId,
          ]
        );

      if (
        product.rowCount ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Product not found.",
          });
      }

      const reviews =
        await pool.query(
          `
            SELECT
              r.id,
              r.product_id,
              r.user_id,
              u.full_name AS customer_name,
              r.rating,
              r.comment,
              r.media,
              r.created_at,
              r.updated_at

            FROM product_reviews r

            JOIN users u
              ON u.id = r.user_id

            WHERE r.product_id = $1

            ORDER BY
              r.updated_at DESC,
              r.created_at DESC
          `,
          [
            productId,
          ]
        );

      const summary =
        await getSummary(
          productId
        );

      return res.json({
        summary,

        reviews:
          reviews.rows.map(
            normaliseReview
          ),
      });

    } catch (error) {
      next(error);
    }
  }
);


// ============================================================
// CREATE / UPDATE MY REVIEW
// One review per customer per product.
// ============================================================

router.post(
  "/product/:productId",

  requireAuth,

  reviewUpload.array(
    "media",
    MAX_REVIEW_FILES
  ),

  async (
    req,
    res,
    next
  ) => {

    let uploadedMedia = [];

    try {

      const productId =
        validProductId(
          req.params.productId
        );

      if (!productId) {
        return res
          .status(400)
          .json({
            error:
              "Invalid product.",
          });
      }

      const rating =
        Number(
          req.body?.rating
        );

      const comment =
        String(
          req.body?.comment ||
          ""
        ).trim();

      if (
        !Number.isInteger(
          rating
        ) ||
        rating < 1 ||
        rating > 5
      ) {
        return res
          .status(400)
          .json({
            error:
              "Please select a rating from 1 to 5 stars.",
          });
      }

      if (
        comment.length < 3
      ) {
        return res
          .status(400)
          .json({
            error:
              "Please write a short review.",
          });
      }

      if (
        comment.length >
        1500
      ) {
        return res
          .status(400)
          .json({
            error:
              "Review must be 1500 characters or fewer.",
          });
      }

      validateReviewMediaFiles(
        req.files || []
      );

      const product =
        await pool.query(
          `
            SELECT id
            FROM products
            WHERE id = $1
              AND active = TRUE
            LIMIT 1
          `,
          [
            productId,
          ]
        );

      if (
        product.rowCount ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Product not found.",
          });
      }

      const existing =
        await pool.query(
          `
            SELECT
              id,
              media
            FROM product_reviews
            WHERE product_id = $1
              AND user_id = $2
            LIMIT 1
          `,
          [
            productId,
            req.userId,
          ]
        );

      const previousMedia =
        existing.rows[0]?.media ||
        [];

      if (
        (req.files || [])
          .length >
        0
      ) {
        uploadedMedia =
          await uploadReviewMedia(
            req.files,
            {
              productId,
              userId:
                req.userId,
            }
          );
      }

      /*
       * If new media is selected while editing,
       * it replaces the old media set.
       *
       * If no new media is selected,
       * existing media is preserved.
       */
      const mediaToSave =
        uploadedMedia.length >
        0
          ? uploadedMedia
          : previousMedia;

      const result =
        await pool.query(
          `
            INSERT INTO product_reviews (
              id,
              product_id,
              user_id,
              rating,
              comment,
              media,
              created_at,
              updated_at
            )

            VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3,
              $4,
              $5::jsonb,
              NOW(),
              NOW()
            )

            ON CONFLICT (
              product_id,
              user_id
            )

            DO UPDATE SET
              rating =
                EXCLUDED.rating,

              comment =
                EXCLUDED.comment,

              media =
                EXCLUDED.media,

              updated_at =
                NOW()

            RETURNING *
          `,
          [
            productId,
            req.userId,
            rating,
            comment,
            JSON.stringify(
              mediaToSave
            ),
          ]
        );

      /*
       * Database save succeeded.
       * Old media can now safely be removed
       * when it was replaced.
       */
      if (
        uploadedMedia.length >
          0 &&
        Array.isArray(
          previousMedia
        ) &&
        previousMedia.length >
          0
      ) {
        await deleteReviewMedia(
          previousMedia
        );
      }

      const user =
        await pool.query(
          `
            SELECT full_name
            FROM users
            WHERE id = $1
            LIMIT 1
          `,
          [
            req.userId,
          ]
        );

      const summary =
        await getSummary(
          productId
        );

      return res.json({
        message:
          "Thank you. Your review has been saved.",

        review:
          normaliseReview({
            ...result.rows[0],

            customer_name:
              user.rows[0]
                ?.full_name ||
              "Customer",
          }),

        summary,
      });

    } catch (error) {

      /*
       * If upload succeeded but DB work failed,
       * remove the newly uploaded media.
       */
      if (
        uploadedMedia.length >
        0
      ) {
        try {
          await deleteReviewMedia(
            uploadedMedia
          );
        } catch {
          // Preserve original error.
        }
      }

      next(error);
    }
  }
);


// ============================================================
// MULTER / REVIEW UPLOAD ERROR HANDLER
// ============================================================

router.use(
  (
    error,
    req,
    res,
    next
  ) => {

    if (
      error instanceof
      multer.MulterError
    ) {

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(400)
          .json({
            error:
              "A selected file is too large. Images must be 5 MB or smaller and videos must be 40 MB or smaller.",
          });
      }

      if (
        error.code ===
        "LIMIT_FILE_COUNT" ||
        error.code ===
        "LIMIT_UNEXPECTED_FILE"
      ) {
        return res
          .status(400)
          .json({
            error:
              `You can upload up to ${MAX_REVIEW_FILES} photos or videos.`,
          });
      }
    }

    if (
      error?.message?.includes(
        "Only JPG"
      ) ||
      error?.message?.includes(
        "too large"
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            error.message,
        });
    }

    next(error);
  }
);


export default router;
