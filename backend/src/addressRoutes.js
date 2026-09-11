import express from "express";
import crypto from "crypto";
import { z } from "zod";

import {
  pool,
} from "./db.js";

import {
  requireAuth,
} from "./auth.js";


const router =
  express.Router();


const addressSchema =
  z.object({

    fullName:
      z
        .string()
        .trim()
        .min(
          2,
          "Please enter the recipient name."
        )
        .max(120),

    phone:
      z
        .string()
        .trim()
        .min(
          6,
          "Please enter a valid phone number."
        )
        .max(30),

    line1:
      z
        .string()
        .trim()
        .min(
          3,
          "Please enter your address."
        )
        .max(250),

    line2:
      z
        .string()
        .trim()
        .max(250)
        .optional()
        .default(""),

    city:
      z
        .string()
        .trim()
        .min(
          2,
          "Please enter your city."
        )
        .max(120),

    state:
      z
        .string()
        .trim()
        .min(
          2,
          "Please enter your state."
        )
        .max(120),

    postalCode:
      z
        .string()
        .trim()
        .min(
          3,
          "Please enter your PIN code."
        )
        .max(30),

    country:
      z
        .string()
        .trim()
        .min(2)
        .max(80)
        .default("India"),

    isDefault:
      z
        .boolean()
        .optional()
        .default(false),
  });


function publicAddress(
  row
) {
  return {
    id:
      row.id,

    fullName:
      row.full_name,

    phone:
      row.phone,

    line1:
      row.line1,

    line2:
      row.line2 || "",

    city:
      row.city,

    state:
      row.state,

    postalCode:
      row.postal_code,

    country:
      row.country,

    isDefault:
      row.is_default,

    createdAt:
      row.created_at,
  };
}


// ===========================================================
// LIST ADDRESSES
// ===========================================================

router.get(
  "/",
  requireAuth,
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
          FROM addresses
          WHERE user_id = $1

          ORDER BY
            is_default DESC,
            created_at DESC
          `,
          [
            req.userId,
          ]
        );


      return res.json({
        addresses:
          result.rows.map(
            publicAddress
          ),
      });

    } catch (error) {
      next(error);
    }
  }
);


// ===========================================================
// CREATE ADDRESS
// ===========================================================

router.post(
  "/",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {
    const client =
      await pool.connect();

    try {

      const parsed =
        addressSchema.safeParse(
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
              "Please check your address.",
          });
      }


      const data =
        parsed.data;


      await client.query(
        "BEGIN"
      );


      const existing =
        await client.query(
          `
          SELECT COUNT(*)::int
            AS count

          FROM addresses
          WHERE user_id = $1
          `,
          [
            req.userId,
          ]
        );


      const shouldDefault =
        data.isDefault ||
        existing.rows[0]
          .count === 0;


      if (
        shouldDefault
      ) {
        await client.query(
          `
          UPDATE addresses

          SET
            is_default = FALSE,
            updated_at = NOW()

          WHERE user_id = $1
          `,
          [
            req.userId,
          ]
        );
      }


      const id =
        crypto.randomUUID();


      const result =
        await client.query(
          `
          INSERT INTO addresses (
            id,
            user_id,
            full_name,
            phone,
            line1,
            line2,
            city,
            state,
            postal_code,
            country,
            is_default
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
            $11
          )

          RETURNING *
          `,
          [
            id,
            req.userId,
            data.fullName,
            data.phone,
            data.line1,
            data.line2 || null,
            data.city,
            data.state,
            data.postalCode,
            data.country,
            shouldDefault,
          ]
        );


      await client.query(
        "COMMIT"
      );


      return res
        .status(201)
        .json({
          message:
            "Address saved.",

          address:
            publicAddress(
              result.rows[0]
            ),
        });

    } catch (error) {

      await client.query(
        "ROLLBACK"
      );

      next(error);

    } finally {

      client.release();
    }
  }
);


// ===========================================================
// MAKE DEFAULT
// ===========================================================

router.patch(
  "/:id/default",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {
    const client =
      await pool.connect();

    try {

      await client.query(
        "BEGIN"
      );


      const owned =
        await client.query(
          `
          SELECT id

          FROM addresses

          WHERE
            id = $1
            AND user_id = $2

          LIMIT 1
          `,
          [
            req.params.id,
            req.userId,
          ]
        );


      if (
        owned.rowCount ===
        0
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Address not found.",
          });
      }


      await client.query(
        `
        UPDATE addresses

        SET
          is_default = FALSE,
          updated_at = NOW()

        WHERE user_id = $1
        `,
        [
          req.userId,
        ]
      );


      const result =
        await client.query(
          `
          UPDATE addresses

          SET
            is_default = TRUE,
            updated_at = NOW()

          WHERE
            id = $1
            AND user_id = $2

          RETURNING *
          `,
          [
            req.params.id,
            req.userId,
          ]
        );


      await client.query(
        "COMMIT"
      );


      return res.json({
        address:
          publicAddress(
            result.rows[0]
          ),
      });

    } catch (error) {

      await client.query(
        "ROLLBACK"
      );

      next(error);

    } finally {

      client.release();
    }
  }
);


// ===========================================================
// DELETE ADDRESS
// ===========================================================

router.delete(
  "/:id",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {
    try {

      const result =
        await pool.query(
          `
          DELETE FROM addresses

          WHERE
            id = $1
            AND user_id = $2

          RETURNING id
          `,
          [
            req.params.id,
            req.userId,
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
              "Address not found.",
          });
      }


      return res.json({
        message:
          "Address removed.",
      });

    } catch (error) {
      next(error);
    }
  }
);


export default router;
