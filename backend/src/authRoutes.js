import crypto from "crypto";
import path from "path";

import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireAuth } from "./auth.js";
import { pool } from "./db.js";


const router =
  express.Router();


const PROFILE_BUCKET =
  "product-images";


const profileSchema =
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

    phone:
      z
        .string()
        .trim()
        .max(30)
        .optional()
        .default(""),
  });


const storage =
  multer.memoryStorage();


const upload =
  multer({
    storage,

    limits: {
      fileSize:
        5 *
        1024 *
        1024,

      files: 1,
    },

    fileFilter: (
      req,
      file,
      callback
    ) => {
      const allowed = [
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
            "Profile photo must be JPG, PNG or WEBP."
          )
        );
      }

      callback(
        null,
        true
      );
    },
  });


function getStorageClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Supabase profile storage is not configured."
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


function profileImageExtension(
  file
) {
  const original =
    path
      .extname(
        file.originalname ||
          ""
      )
      .toLowerCase();

  if (
    [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ].includes(
      original
    )
  ) {
    return original ===
      ".jpeg"
      ? ".jpg"
      : original;
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


function publicUser(
  row
) {
  return {
    id:
      row.id,

    fullName:
      row.full_name,

    email:
      row.email,

    phone:
      row.phone || "",

    avatarUrl:
      row.avatar_url || "",

    role:
      row.role,
  };
}


async function getCurrentUser(
  userId
) {
  const result =
    await pool.query(
      `
      SELECT
        id,
        full_name,
        email,
        phone,
        avatar_url,
        role

      FROM users

      WHERE id = $1

      LIMIT 1
      `,
      [
        userId,
      ]
    );

  return result.rows[0] ||
    null;
}


// ===========================================================
// GET CURRENT PROFILE
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
      const row =
        await getCurrentUser(
          req.userId
        );

      if (!row) {
        return res
          .status(404)
          .json({
            error:
              "Account not found.",
          });
      }

      return res.json({
        user:
          publicUser(
            row
          ),
      });
    } catch (error) {
      next(error);
    }
  }
);


// ===========================================================
// UPDATE PROFILE DETAILS
// ===========================================================

router.patch(
  "/me",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {
    try {
      const parsed =
        profileSchema.safeParse(
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
              "Please check your account details.",
          });
      }

      const data =
        parsed.data;

      const result =
        await pool.query(
          `
          UPDATE users

          SET
            full_name = $1,
            phone = $2,
            updated_at = NOW()

          WHERE id = $3

          RETURNING
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role
          `,
          [
            data.fullName,
            data.phone ||
              null,
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
              "Account not found.",
          });
      }

      return res.json({
        message:
          "Account details updated.",

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
// UPLOAD PROFILE PHOTO
// ===========================================================

router.post(
  "/me/avatar",
  requireAuth,
  upload.single(
    "photo"
  ),
  async (
    req,
    res,
    next
  ) => {
    try {
      if (
        !req.file
      ) {
        return res
          .status(400)
          .json({
            error:
              "Choose a profile photo first.",
          });
      }

      const supabase =
        getStorageClient();

      const extension =
        profileImageExtension(
          req.file
        );

      const objectPath =
        `profiles/${req.userId}/${crypto.randomUUID()}${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase
          .storage
          .from(
            PROFILE_BUCKET
          )
          .upload(
            objectPath,
            req.file.buffer,
            {
              contentType:
                req.file
                  .mimetype,

              cacheControl:
                "3600",

              upsert:
                false,
            }
          );

      if (
        uploadError
      ) {
        throw new Error(
          uploadError.message ||
            "Could not upload profile photo."
        );
      }

      const {
        data:
          publicUrlData,
      } =
        supabase
          .storage
          .from(
            PROFILE_BUCKET
          )
          .getPublicUrl(
            objectPath
          );

      const avatarUrl =
        publicUrlData
          ?.publicUrl ||
        "";

      if (
        !avatarUrl
      ) {
        await supabase
          .storage
          .from(
            PROFILE_BUCKET
          )
          .remove([
            objectPath,
          ]);

        throw new Error(
          "Could not create profile photo URL."
        );
      }

      const existing =
        await getCurrentUser(
          req.userId
        );

      const oldAvatar =
        existing?.avatar_url ||
        "";

      const result =
        await pool.query(
          `
          UPDATE users

          SET
            avatar_url = $1,
            updated_at = NOW()

          WHERE id = $2

          RETURNING
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role
          `,
          [
            avatarUrl,
            req.userId,
          ]
        );

      if (
        oldAvatar &&
        oldAvatar.includes(
          "/product-images/"
        )
      ) {
        try {
          const marker =
            "/product-images/";

          const index =
            oldAvatar.indexOf(
              marker
            );

          if (
            index !== -1
          ) {
            const oldPath =
              decodeURIComponent(
                oldAvatar.slice(
                  index +
                    marker.length
                )
              );

            if (
              oldPath.startsWith(
                `profiles/${req.userId}/`
              )
            ) {
              await supabase
                .storage
                .from(
                  PROFILE_BUCKET
                )
                .remove([
                  oldPath,
                ]);
            }
          }
        } catch (
          cleanupError
        ) {
          console.warn(
            "Old profile photo cleanup failed:",
            cleanupError
              ?.message ||
              cleanupError
          );
        }
      }

      return res.json({
        message:
          "Profile photo updated.",

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
// REMOVE PROFILE PHOTO
// ===========================================================

router.delete(
  "/me/avatar",
  requireAuth,
  async (
    req,
    res,
    next
  ) => {
    try {
      const existing =
        await getCurrentUser(
          req.userId
        );

      if (
        !existing
      ) {
        return res
          .status(404)
          .json({
            error:
              "Account not found.",
          });
      }

      const oldAvatar =
        existing.avatar_url ||
        "";

      const result =
        await pool.query(
          `
          UPDATE users

          SET
            avatar_url = NULL,
            updated_at = NOW()

          WHERE id = $1

          RETURNING
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role
          `,
          [
            req.userId,
          ]
        );

      if (
        oldAvatar &&
        oldAvatar.includes(
          "/product-images/"
        )
      ) {
        try {
          const supabase =
            getStorageClient();

          const marker =
            "/product-images/";

          const index =
            oldAvatar.indexOf(
              marker
            );

          if (
            index !== -1
          ) {
            const oldPath =
              decodeURIComponent(
                oldAvatar.slice(
                  index +
                    marker.length
                )
              );

            if (
              oldPath.startsWith(
                `profiles/${req.userId}/`
              )
            ) {
              await supabase
                .storage
                .from(
                  PROFILE_BUCKET
                )
                .remove([
                  oldPath,
                ]);
            }
          }
        } catch (
          cleanupError
        ) {
          console.warn(
            "Profile photo cleanup failed:",
            cleanupError
              ?.message ||
              cleanupError
          );
        }
      }

      return res.json({
        message:
          "Profile photo removed.",

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


export default router;
