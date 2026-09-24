import express from "express";

import {
  pool,
} from "./db.js";


const router =
  express.Router();


function publicOrigin() {

  return (
    process.env.PUBLIC_API_ORIGIN ||
    `http://localhost:${
      process.env.PORT || 4000
    }`
  );
}


function resolveImage(
  image
) {

  if (!image) {
    return "";
  }


  if (
    image.startsWith(
      "http://"
    ) ||
    image.startsWith(
      "https://"
    )
  ) {

    return image;
  }


  if (
    image.startsWith(
      "/uploads/"
    )
  ) {

    return (
      publicOrigin() +
      image
    );
  }


  return image;
}


export function publicProduct(
  row
) {

  const storedImages =
    Array.isArray(
      row.images
    )
      ? row.images
      : [];


  const images =
    storedImages.length > 0
      ? storedImages
      : row.image_path
      ? [
          row.image_path,
        ]
      : [];


  return {

    id:
      row.id,

    slug:
      row.slug,

    name:
      row.name,

    category:
      row.category,

    priceINR:
      row.price_inr,

    oldPriceINR:
      null,

    stock:
      row.stock,

    badge:
      row.badge || "",

    colour:
      row.colour || "",

    material:
      row.material || "",

    description:
      row.description || "",

    sizes:
      Array.isArray(
        row.sizes
      )
        ? row.sizes
        : [],

    images:
      images
        .filter(Boolean)
        .map(
          resolveImage
        ),

    active:
      row.active,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}


// ===========================================================
// ACTIVE PUBLIC CATALOGUE
// ===========================================================

router.get(
  "/",
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

          FROM products

          WHERE active = TRUE

          ORDER BY
            created_at DESC,
            id DESC
          `
        );


      return res.json({
        products:
          result.rows.map(
            publicProduct
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


// ===========================================================
// SINGLE PUBLIC PRODUCT
// ===========================================================

router.get(
  "/:slug",
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

          FROM products

          WHERE
            slug = $1
            AND active = TRUE

          LIMIT 1
          `,
          [
            req.params.slug,
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
              "Product not found.",
          });
      }


      return res.json({
        product:
          publicProduct(
            result.rows[0]
          ),
      });

    } catch (error) {

      next(error);
    }
  }
);


export default router;
