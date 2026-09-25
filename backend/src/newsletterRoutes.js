import express from "express";
import { pool } from "./db.js";

const router = express.Router();

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  "/subscribe",
  async (req, res, next) => {
    try {
      const email = String(
        req.body?.email || ""
      )
        .trim()
        .toLowerCase();

      if (
        !email ||
        email.length > 320 ||
        !EMAIL_REGEX.test(email)
      ) {
        return res.status(400).json({
          error:
            "Please enter a valid email address.",
        });
      }

      const result =
        await pool.query(
          `
          INSERT INTO newsletter_subscribers (
            email,
            active,
            created_at,
            updated_at
          )

          VALUES (
            $1,
            TRUE,
            NOW(),
            NOW()
          )

          ON CONFLICT (email)

          DO UPDATE SET
            active = TRUE,
            updated_at = NOW()

          RETURNING
            email,
            active
          `,
          [email]
        );

      return res.status(200).json({
        ok: true,
        email:
          result.rows[0].email,
        message:
          "You're on the list.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
