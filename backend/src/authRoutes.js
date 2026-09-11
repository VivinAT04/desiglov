import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import {
  z,
} from "zod";

import {
  pool,
} from "./db.js";

import {
  createToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} from "./auth.js";


const router =
  express.Router();


const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173";


function normaliseEmail(
  email
) {

  return email
    .trim()
    .toLowerCase();
}


function publicUser(
  user
) {

  return {
    id:
      user.id,

    fullName:
      user.full_name,

    email:
      user.email,

    role:
      user.role ||
      "CUSTOMER",

    createdAt:
      user.created_at,
  };
}


const registerSchema =
  z.object({

    fullName:
      z
        .string()
        .trim()
        .min(
          2,
          "Please enter your full name."
        )
        .max(120),

    email:
      z
        .string()
        .trim()
        .email(
          "Please enter a valid email address."
        )
        .max(320),

    password:
      z
        .string()
        .min(
          8,
          "Password must contain at least 8 characters."
        )
        .max(128),
  });


const loginSchema =
  z.object({

    email:
      z
        .string()
        .trim()
        .email(
          "Please enter a valid email address."
        ),

    password:
      z
        .string()
        .min(
          1,
          "Please enter your password."
        ),
  });


const forgotSchema =
  z.object({

    email:
      z
        .string()
        .trim()
        .email(
          "Please enter a valid email address."
        ),
  });


const resetSchema =
  z.object({

    token:
      z
        .string()
        .min(
          20,
          "Invalid reset token."
        ),

    password:
      z
        .string()
        .min(
          8,
          "Password must contain at least 8 characters."
        )
        .max(128),
  });


// ===========================================================
// REGISTER
// ===========================================================

router.post(
  "/register",
  async (
    req,
    res,
    next
  ) => {

    try {

      const parsed =
        registerSchema.safeParse(
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
              "Please check your details.",
          });
      }


      const {
        fullName,
        password,
      } =
        parsed.data;


      const email =
        normaliseEmail(
          parsed.data.email
        );


      const existing =
        await pool.query(
          `
          SELECT id

          FROM users

          WHERE LOWER(email) = $1

          LIMIT 1
          `,
          [
            email,
          ]
        );


      if (
        existing.rowCount >
        0
      ) {

        return res
          .status(409)
          .json({
            error:
              "An account already exists with this email address.",
          });
      }


      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      const id =
        crypto.randomUUID();


      const role =
        process.env.ADMIN_EMAIL &&
        normaliseEmail(
          process.env.ADMIN_EMAIL
        ) === email
          ? "ADMIN"
          : "CUSTOMER";


      const result =
        await pool.query(
          `
          INSERT INTO users (
            id,
            full_name,
            email,
            password_hash,
            role
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )

          RETURNING
            id,
            full_name,
            email,
            role,
            created_at
          `,
          [
            id,
            fullName,
            email,
            passwordHash,
            role,
          ]
        );


      const user =
        result.rows[0];


      const token =
        createToken(
          user
        );


      setAuthCookie(
        res,
        token
      );


      return res
        .status(201)
        .json({
          message:
            "Your DEsiglov account has been created.",

          user:
            publicUser(
              user
            ),
        });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// LOGIN
// ===========================================================

router.post(
  "/login",
  async (
    req,
    res,
    next
  ) => {

    try {

      const parsed =
        loginSchema.safeParse(
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
              "Please check your login details.",
          });
      }


      const email =
        normaliseEmail(
          parsed.data.email
        );


      const result =
        await pool.query(
          `
          SELECT
            id,
            full_name,
            email,
            password_hash,
            role,
            created_at

          FROM users

          WHERE LOWER(email) = $1

          LIMIT 1
          `,
          [
            email,
          ]
        );


      if (
        result.rowCount ===
        0
      ) {

        return res
          .status(401)
          .json({
            error:
              "Email or password is incorrect.",
          });
      }


      const user =
        result.rows[0];


      const valid =
        await bcrypt.compare(
          parsed.data.password,
          user.password_hash
        );


      if (!valid) {

        return res
          .status(401)
          .json({
            error:
              "Email or password is incorrect.",
          });
      }


      const token =
        createToken(
          user
        );


      setAuthCookie(
        res,
        token
      );


      return res.json({
        message:
          "Welcome back to DEsiglov.",

        user:
          publicUser(
            user
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// LOGOUT
// ===========================================================

router.post(
  "/logout",
  (
    req,
    res
  ) => {

    clearAuthCookie(
      res
    );


    return res.json({
      message:
        "You have been signed out.",
    });
  }
);


// ===========================================================
// CURRENT USER
// ===========================================================

router.get(
  "/me",
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
          SELECT
            id,
            full_name,
            email,
            role,
            created_at

          FROM users

          WHERE id = $1

          LIMIT 1
          `,
          [
            req.userId,
          ]
        );


      if (
        result.rowCount ===
        0
      ) {

        clearAuthCookie(
          res
        );


        return res
          .status(401)
          .json({
            error:
              "Account not found.",
          });
      }


      return res.json({
        user:
          publicUser(
            result.rows[0]
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// FORGOT PASSWORD
// ===========================================================

router.post(
  "/forgot-password",
  async (
    req,
    res,
    next
  ) => {

    try {

      const parsed =
        forgotSchema.safeParse(
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
              "Please enter a valid email address.",
          });
      }


      const email =
        normaliseEmail(
          parsed.data.email
        );


      const genericMessage =
        "If an account exists with that email, password reset instructions have been prepared.";


      const userResult =
        await pool.query(
          `
          SELECT
            id,
            email

          FROM users

          WHERE LOWER(email) = $1

          LIMIT 1
          `,
          [
            email,
          ]
        );


      if (
        userResult.rowCount ===
        0
      ) {

        return res.json({
          message:
            genericMessage,
        });
      }


      const user =
        userResult.rows[0];


      // Invalidate old unused reset links.

      await pool.query(
        `
        UPDATE password_reset_tokens

        SET
          used_at = NOW()

        WHERE
          user_id = $1
          AND used_at IS NULL
        `,
        [
          user.id,
        ]
      );


      const rawToken =
        crypto
          .randomBytes(32)
          .toString("hex");


      const tokenHash =
        crypto
          .createHash("sha256")
          .update(
            rawToken
          )
          .digest("hex");


      const resetId =
        crypto.randomUUID();


      await pool.query(
        `
        INSERT INTO password_reset_tokens (
          id,
          user_id,
          token_hash,
          expires_at
        )

        VALUES (
          $1,
          $2,
          $3,
          NOW() + INTERVAL '30 minutes'
        )
        `,
        [
          resetId,
          user.id,
          tokenHash,
        ]
      );


      const resetUrl =
        `${FRONTEND_ORIGIN}/reset-password?token=${rawToken}`;


      console.log("");
      console.log("============================================");
      console.log(" DESIGLOV PASSWORD RESET — DEVELOPMENT");
      console.log("============================================");
      console.log(`Account: ${user.email}`);
      console.log(`Reset:   ${resetUrl}`);
      console.log("Expires: 30 minutes");
      console.log("============================================");
      console.log("");


      const response = {
        message:
          genericMessage,
      };


      // Never expose this in production.
      if (
        process.env.NODE_ENV !==
        "production"
      ) {

        response.devResetUrl =
          resetUrl;
      }


      return res.json(
        response
      );

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// VALIDATE RESET TOKEN
// ===========================================================

router.get(
  "/reset-password/validate",
  async (
    req,
    res,
    next
  ) => {

    try {

      const token =
        String(
          req.query.token ||
          ""
        );


      if (
        token.length < 20
      ) {

        return res
          .status(400)
          .json({
            valid:
              false,

            error:
              "This password reset link is invalid.",
          });
      }


      const tokenHash =
        crypto
          .createHash("sha256")
          .update(
            token
          )
          .digest("hex");


      const result =
        await pool.query(
          `
          SELECT id

          FROM password_reset_tokens

          WHERE
            token_hash = $1
            AND used_at IS NULL
            AND expires_at > NOW()

          LIMIT 1
          `,
          [
            tokenHash,
          ]
        );


      if (
        result.rowCount ===
        0
      ) {

        return res
          .status(400)
          .json({
            valid:
              false,

            error:
              "This password reset link is invalid or has expired.",
          });
      }


      return res.json({
        valid:
          true,
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// RESET PASSWORD
// ===========================================================

router.post(
  "/reset-password",
  async (
    req,
    res,
    next
  ) => {

    const client =
      await pool.connect();


    try {

      const parsed =
        resetSchema.safeParse(
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
              "Please check your password.",
          });
      }


      const tokenHash =
        crypto
          .createHash("sha256")
          .update(
            parsed.data.token
          )
          .digest("hex");


      await client.query(
        "BEGIN"
      );


      const tokenResult =
        await client.query(
          `
          SELECT
            prt.id,
            prt.user_id,

            u.email

          FROM password_reset_tokens prt

          JOIN users u
            ON u.id =
              prt.user_id

          WHERE
            prt.token_hash = $1
            AND prt.used_at IS NULL
            AND prt.expires_at > NOW()

          LIMIT 1

          FOR UPDATE OF prt
          `,
          [
            tokenHash,
          ]
        );


      if (
        tokenResult.rowCount ===
        0
      ) {

        await client.query(
          "ROLLBACK"
        );


        return res
          .status(400)
          .json({
            error:
              "This password reset link is invalid or has expired.",
          });
      }


      const reset =
        tokenResult.rows[0];


      const passwordHash =
        await bcrypt.hash(
          parsed.data.password,
          12
        );


      await client.query(
        `
        UPDATE users

        SET
          password_hash = $1,
          updated_at = NOW()

        WHERE id = $2
        `,
        [
          passwordHash,
          reset.user_id,
        ]
      );


      // Mark every outstanding reset link for this user as used.

      await client.query(
        `
        UPDATE password_reset_tokens

        SET
          used_at = NOW()

        WHERE
          user_id = $1
          AND used_at IS NULL
        `,
        [
          reset.user_id,
        ]
      );


      await client.query(
        "COMMIT"
      );


      // Clear old login session after changing password.
      clearAuthCookie(
        res
      );


      return res.json({
        message:
          "Your password has been changed successfully. You can now sign in with your new password.",
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


export default router;
