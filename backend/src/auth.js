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

  // ADMIN_EMAILS is authoritative.
  // Browser metadata can never grant administrator access.
  const desiredRole =
    adminEmails.includes(email)
      ? "ADMIN"
      : "CUSTOMER";

  /*
   * 1. Normal path:
   *    Resolve the customer using the permanent Supabase UUID binding.
   *
   * This means that once an account has been migrated, email matching is
   * no longer used to decide which DESIGLOV customer owns the session.
   */
  const bound =
    await pool.query(
      `
        SELECT
          id,
          full_name,
          email,
          role,
          supabase_user_id,
          created_at,
          updated_at
        FROM users
        WHERE supabase_user_id = $1
        LIMIT 1
      `,
      [user.id]
    );

  if (bound.rowCount > 0) {
    const existingUser =
      bound.rows[0];

    const updated =
      await pool.query(
        `
          UPDATE users
          SET
            full_name =
              CASE
                WHEN full_name IS NULL
                  OR BTRIM(full_name) = ''
                  THEN $2
                ELSE full_name
              END,
            email = $1,
            role = $3,
            updated_at = NOW()
          WHERE id = $4
            AND supabase_user_id = $5
          RETURNING
            id,
            full_name,
            email,
            role,
            supabase_user_id,
            created_at,
            updated_at
        `,
        [
          email,
          fullName,
          desiredRole,
          existingUser.id,
          user.id,
        ]
      );

    return updated.rows[0];
  }

  /*
   * 2. Legacy migration path:
   *
   * Existing DESIGLOV customers may have a local UUID different from their
   * Supabase Auth UUID. We may link by email exactly once, but only when:
   *
   * - Supabase says the email is confirmed; and
   * - the local account has never been bound to another Supabase identity.
   *
   * The local UUID is deliberately preserved because customer records
   * reference users(id).
   */
  const emailConfirmed =
    Boolean(
      user.email_confirmed_at ||
      user.confirmed_at
    );

  if (emailConfirmed) {
    const client =
      await pool.connect();

    try {
      await client.query("BEGIN");

      const legacy =
        await client.query(
          `
            SELECT
              id,
              full_name,
              email,
              role,
              supabase_user_id,
              created_at,
              updated_at
            FROM users
            WHERE LOWER(email) = LOWER($1)
            FOR UPDATE
          `,
          [email]
        );

      if (legacy.rowCount > 1) {
        throw new Error(
          "Multiple local accounts use this email address."
        );
      }

      if (legacy.rowCount === 1) {
        const legacyUser =
          legacy.rows[0];

        if (
          legacyUser.supabase_user_id &&
          legacyUser.supabase_user_id !== user.id
        ) {
          throw new Error(
            "This DESIGLOV account is already linked to another authentication identity."
          );
        }

        const migrated =
          await client.query(
            `
              UPDATE users
              SET
                supabase_user_id = $1,
                full_name =
                  CASE
                    WHEN full_name IS NULL
                      OR BTRIM(full_name) = ''
                      THEN $2
                    ELSE full_name
                  END,
                email = $3,
                role = $4,
                updated_at = NOW()
              WHERE id = $5
                AND (
                  supabase_user_id IS NULL
                  OR supabase_user_id = $1
                )
              RETURNING
                id,
                full_name,
                email,
                role,
                supabase_user_id,
                created_at,
                updated_at
            `,
            [
              user.id,
              fullName,
              email,
              desiredRole,
              legacyUser.id,
            ]
          );

        if (migrated.rowCount !== 1) {
          throw new Error(
            "Could not safely bind the existing DESIGLOV account."
          );
        }

        await client.query("COMMIT");

        return migrated.rows[0];
      }

      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      throw error;
    } finally {
      client.release();
    }
  }

  /*
   * 3. New customer:
   *
   * A new local row can be created only for a confirmed Supabase account.
   * The local UUID may equal the Supabase UUID for new customers; existing
   * legacy customer UUIDs remain untouched.
   */
  if (!emailConfirmed) {
    throw new Error(
      "Please verify your email address before using your DESIGLOV account."
    );
  }

  try {
    const result =
      await pool.query(
        `
          INSERT INTO users (
            id,
            full_name,
            email,
            password_hash,
            role,
            supabase_user_id
          )
          VALUES (
            $1,
            $2,
            $3,
            NULL,
            $4,
            $1
          )
          RETURNING
            id,
            full_name,
            email,
            role,
            supabase_user_id,
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
  } catch (error) {
    /*
     * A concurrent first request may have completed the migration/insert
     * between our lookup and INSERT. Resolve by immutable Supabase UUID.
     */
    if (
      error?.code === "23505"
    ) {
      const retry =
        await pool.query(
          `
            SELECT
              id,
              full_name,
              email,
              role,
              supabase_user_id,
              created_at,
              updated_at
            FROM users
            WHERE supabase_user_id = $1
            LIMIT 1
          `,
          [user.id]
        );

      if (retry.rowCount === 1) {
        return retry.rows[0];
      }
    }

    throw error;
  }
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

    // PostgreSQL-facing routes must use the local DESIGLOV user ID.
    // Legacy customers may have a different UUID from their Supabase Auth UUID.
    req.userId =
      localUser.id;

    // Keep the Supabase Auth UUID separately when it is specifically needed.
    req.supabaseUserId =
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
    const authenticatedEmail =
      normaliseEmail(
        req.supabaseUser?.email ||
        req.user?.email
      );

    const adminEmails =
      String(
        process.env.ADMIN_EMAILS ||
        process.env.ADMIN_EMAIL ||
        ""
      )
        .split(",")
        .map(normaliseEmail)
        .filter(Boolean);

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

    const admin =
      result.rows[0] || null;

    const databaseAdmin =
      admin?.role === "ADMIN";

    const configuredAdmin =
      authenticatedEmail &&
      adminEmails.includes(
        authenticatedEmail
      );

    if (
      !databaseAdmin &&
      !configuredAdmin
    ) {
      return res
        .status(403)
        .json({
          error:
            "Administrator access required.",
        });
    }

    req.admin = {
      id:
        admin?.id ||
        req.userId,

      email:
        authenticatedEmail ||
        admin?.email,

      fullName:
        admin?.full_name ||
        req.user?.full_name ||
        "DESIGLOV Administrator",

      role:
        "ADMIN",
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
