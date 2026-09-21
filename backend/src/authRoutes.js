import express from "express";
import { requireAuth } from "./auth.js";

const router = express.Router();

/*
 * Authentication is handled by Supabase Auth.
 *
 * The frontend sends:
 *
 * Authorization: Bearer <supabase_access_token>
 *
 * requireAuth validates that token and synchronises
 * the authenticated customer with DESIGLOV's local
 * users table.
 */

router.get("/me", requireAuth, async (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      fullName: req.user.full_name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

export default router;
