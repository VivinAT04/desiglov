import express from "express";
import { pool } from "./db.js";
import { requireAuth } from "./auth.js";

const router = express.Router();

function validProductId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normaliseReview(row) {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    customerName: row.customer_name || "Customer",
    rating: Number(row.rating),
    comment: row.comment || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getSummary(productId) {
  const result = await pool.query(
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
    [productId]
  );

  const row = result.rows[0];

  return {
    count: Number(row.review_count || 0),
    average: Number(row.average_rating || 0),
    breakdown: {
      5: Number(row.five_star || 0),
      4: Number(row.four_star || 0),
      3: Number(row.three_star || 0),
      2: Number(row.two_star || 0),
      1: Number(row.one_star || 0),
    },
  };
}


// ============================================================
// GET REVIEWS FOR ONE PRODUCT
// ============================================================

router.get(
  "/product/:productId",
  async (req, res, next) => {
    try {
      const productId =
        validProductId(req.params.productId);

      if (!productId) {
        return res.status(400).json({
          error: "Invalid product.",
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
          [productId]
        );

      if (product.rowCount === 0) {
        return res.status(404).json({
          error: "Product not found.",
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
          [productId]
        );

      const summary =
        await getSummary(productId);

      return res.json({
        summary,
        reviews:
          reviews.rows.map(normaliseReview),
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
  async (req, res, next) => {
    try {
      const productId =
        validProductId(req.params.productId);

      if (!productId) {
        return res.status(400).json({
          error: "Invalid product.",
        });
      }

      const rating =
        Number(req.body?.rating);

      const comment =
        String(req.body?.comment || "").trim();

      if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
      ) {
        return res.status(400).json({
          error:
            "Please select a rating from 1 to 5 stars.",
        });
      }

      if (comment.length < 3) {
        return res.status(400).json({
          error:
            "Please write a short review.",
        });
      }

      if (comment.length > 1500) {
        return res.status(400).json({
          error:
            "Review must be 1500 characters or fewer.",
        });
      }

      const product =
        await pool.query(
          `
            SELECT id
            FROM products
            WHERE id = $1
              AND active = TRUE
            LIMIT 1
          `,
          [productId]
        );

      if (product.rowCount === 0) {
        return res.status(404).json({
          error: "Product not found.",
        });
      }

      const result =
        await pool.query(
          `
            INSERT INTO product_reviews (
              id,
              product_id,
              user_id,
              rating,
              comment,
              created_at,
              updated_at
            )

            VALUES (
              gen_random_uuid(),
              $1,
              $2,
              $3,
              $4,
              NOW(),
              NOW()
            )

            ON CONFLICT (
              product_id,
              user_id
            )

            DO UPDATE SET
              rating = EXCLUDED.rating,
              comment = EXCLUDED.comment,
              updated_at = NOW()

            RETURNING *
          `,
          [
            productId,
            req.userId,
            rating,
            comment,
          ]
        );

      const user =
        await pool.query(
          `
            SELECT full_name
            FROM users
            WHERE id = $1
            LIMIT 1
          `,
          [req.userId]
        );

      const summary =
        await getSummary(productId);

      return res.json({
        message:
          "Thank you. Your review has been saved.",

        review:
          normaliseReview({
            ...result.rows[0],
            customer_name:
              user.rows[0]?.full_name ||
              "Customer",
          }),

        summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
