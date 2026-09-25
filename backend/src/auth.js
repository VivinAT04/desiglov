import { createClient } from "@supabase/supabase-js";
import { pool } from "./db.js";

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured."
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

function normaliseEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function getFullName(user) {
  const metadata =
    user.user_metadata || {};

  return String(
    metadata.full_name ||
    metadata.fullName ||
    metadata.name ||
    user.email?.split("@")[0] ||
    "DESIGLOV Customer"
  )
    .trim()
    .slice(0, 120);
}

async function syncLocalUser(user) {
  const email =
    normaliseEmail(user.email);

  if (!user.id || !email) {
    throw new Error(
      "Authenticated Supabase user is missing required account information."
    );
  }

  const fullName =
    getFullName(user);

  const adminEmails =
    String(
      process.env.ADMIN_EMAILS ||
      process.env.ADMIN_EMAIL ||
      ""
    )
      .split(",")
      .map(normaliseEmail)
      .filter(Boolean);

  const desiredRole =
    adminEmails.includes(email)
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
        NULL,
        $4
      )

      ON CONFLICT (id)
      DO UPDATE SET
        full_name =
          CASE
            WHEN users.full_name IS NULL
              OR BTRIM(users.full_name) = ''
              THEN EXCLUDED.full_name
            ELSE users.full_name
          END,
        email =
          EXCLUDED.email,
        role =
          CASE
            WHEN users.role = 'ADMIN'
              THEN 'ADMIN'
            ELSE EXCLUDED.role
          END,
        updated_at =
          NOW()

      RETURNING
        id,
        full_name,
        email,
        role,
        created_at,
        updated_at
      `,
      [
        user.id,
        fullName,
        email,
        desiredRole,
      ]
    );

  return result.rows[0];
}

function bearerToken(req) {
  const authorization =
    String(
      req.headers.authorization ||
      ""
    );

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  return match
    ? match[1].trim()
    : null;
}

export async function requireAuth(
  req,
  res,
  next
) {
  try {
    const token =
      bearerToken(req);

    if (!token) {
      return res
        .status(401)
        .json({
          error:
            "Please sign in to continue.",
        });
    }

    const {
      data,
      error,
    } =
      await supabase.auth.getUser(
        token
      );

    if (
      error ||
      !data?.user
    ) {
      return res
        .status(401)
        .json({
          error:
            "Your session is invalid or has expired. Please sign in again.",
        });
    }

    const localUser =
      await syncLocalUser(
        data.user
      );

    req.userId =
      data.user.id;

    req.supabaseUser =
      data.user;

    req.user =
      localUser;

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error
    );

    return res
      .status(401)
      .json({
        error:
          "Unable to verify your session. Please sign in again.",
      });
  }
}

export async function requireAdmin(
  req,
  res,
  next
) {
  try {
    const result =
      await pool.query(
        `
        SELECT
          id,
          full_name,
          email,
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
      result.rowCount === 0 ||
      result.rows[0].role !== "ADMIN"
    ) {
      return res
        .status(403)
        .json({
          error:
            "Administrator access required.",
        });
    }

    const admin =
      result.rows[0];

    req.admin = {
      id:
        admin.id,

      email:
        admin.email,

      fullName:
        admin.full_name,

      role:
        admin.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export async function writeAdminAudit({
  adminUserId,
  adminEmail = null,
  action,
  entityType,
  entityId = null,
  metadata = {},
  ipAddress = null,
}) {
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
      adminUserId,
      adminEmail,
      action,
      entityType,
      entityId,
      JSON.stringify(
        metadata
      ),
      ipAddress,
    ]
  );
}

/*
 * Temporary compatibility exports.
 *
 * Authentication is now owned by Supabase.
 * These functions remain only so the legacy
 * authRoutes.js module can still be imported
 * while we remove the old auth endpoints.
 */

export function createToken() {
  throw new Error(
    "Legacy DESIGLOV JWT authentication has been disabled. Use Supabase Auth."
  );
}

export function setAuthCookie() {
  throw new Error(
    "Legacy DESIGLOV authentication cookies have been disabled. Use Supabase Auth."
  );
}

export function clearAuthCookie(
  res
) {
  if (res?.clearCookie) {
    res.clearCookie(
      "desiglov_session",
      {
        path: "/",
      }
    );
  }
}
