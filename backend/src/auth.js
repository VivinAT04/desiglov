import jwt from "jsonwebtoken";

import {
  pool,
} from "./db.js";


const COOKIE_NAME =
  "desiglov_session";


function jwtSecret() {

  const secret =
    process.env.JWT_SECRET;


  if (
    !secret ||
    secret.length < 32
  ) {

    throw new Error(
      "JWT_SECRET must contain at least 32 characters."
    );
  }


  return secret;
}


function isProduction() {

  return (
    process.env.NODE_ENV ===
    "production"
  );
}


export function createToken(
  user
) {

  return jwt.sign(
    {
      sub:
        user.id,

      email:
        user.email,
    },

    jwtSecret(),

    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "7d",

      issuer:
        "desiglov",

      audience:
        "desiglov-web",
    }
  );
}


export function verifyToken(
  token
) {

  return jwt.verify(
    token,
    jwtSecret(),
    {
      issuer:
        "desiglov",

      audience:
        "desiglov-web",
    }
  );
}


export function setAuthCookie(
  res,
  token
) {

  res.cookie(
    COOKIE_NAME,
    token,
    {
      httpOnly:
        true,

      secure:
        isProduction(),

      sameSite:
        isProduction()
          ? "strict"
          : "lax",

      maxAge:
        7 *
        24 *
        60 *
        60 *
        1000,

      path:
        "/",
    }
  );
}


export function clearAuthCookie(
  res
) {

  res.clearCookie(
    COOKIE_NAME,
    {
      httpOnly:
        true,

      secure:
        isProduction(),

      sameSite:
        isProduction()
          ? "strict"
          : "lax",

      path:
        "/",
    }
  );
}


export function requireAuth(
  req,
  res,
  next
) {

  try {

    const token =
      req.cookies[
        COOKIE_NAME
      ];


    if (!token) {

      return res
        .status(401)
        .json({
          error:
            "Please sign in to continue.",
        });
    }


    const decoded =
      verifyToken(
        token
      );


    req.userId =
      decoded.sub;


    next();

  } catch {

    clearAuthCookie(
      res
    );


    return res
      .status(401)
      .json({
        error:
          "Your session has expired. Please sign in again.",
      });
  }
}


export async function requireAdmin(
  req,
  res,
  next
) {

  try {

    if (!req.userId) {

      return res
        .status(401)
        .json({
          error:
            "Authentication required.",
        });
    }


    const result =
      await pool.query(
        `
        SELECT
          id,
          email,
          full_name,
          role

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


    const user =
      result.rows[0];


    if (
      user.role !==
      "ADMIN"
    ) {

      return res
        .status(403)
        .json({
          error:
            "Admin access required.",
        });
    }


    req.admin = {
      id:
        user.id,

      email:
        user.email,

      fullName:
        user.full_name,

      role:
        user.role,
    };


    next();

  } catch (error) {

    next(error);
  }
}


export async function writeAdminAudit(
  req,
  {
    action,
    entityType = null,
    entityId = null,
    metadata = {},
  }
) {

  try {

    await pool.query(
      `
      INSERT INTO admin_audit_log (
        id,
        admin_user_id,
        admin_email,
        action,
        entity_type,
        entity_id,
        metadata,
        ip_address
      )

      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        $5,
        $6::jsonb,
        $7
      )
      `,
      [
        req.admin?.id ||
          null,

        req.admin?.email ||
          null,

        action,

        entityType,

        entityId
          ? String(
              entityId
            )
          : null,

        JSON.stringify(
          metadata || {}
        ),

        req.ip ||
          null,
      ]
    );

  } catch (error) {

    console.error(
      "Could not write admin audit log:",
      error.message
    );
  }
}
