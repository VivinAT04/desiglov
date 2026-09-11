import { z } from "zod";

export const registerSchema =
  z.object({
    fullName:
      z
        .string()
        .trim()
        .min(
          2,
          "Please enter your full name."
        )
        .max(
          120,
          "Name is too long."
        ),

    email:
      z
        .string()
        .trim()
        .email(
          "Please enter a valid email address."
        )
        .max(320)
        .transform(
          (value) =>
            value.toLowerCase()
        ),

    password:
      z
        .string()
        .min(
          8,
          "Password must contain at least 8 characters."
        )
        .max(
          128,
          "Password is too long."
        ),
  });

export const loginSchema =
  z.object({
    email:
      z
        .string()
        .trim()
        .email(
          "Please enter a valid email address."
        )
        .transform(
          (value) =>
            value.toLowerCase()
        ),

    password:
      z
        .string()
        .min(
          1,
          "Please enter your password."
        ),
  });
