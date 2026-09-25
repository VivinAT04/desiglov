export function normaliseSize(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function parseSizeStock(value) {
  let source = value;

  if (typeof source === "string") {
    try {
      source = JSON.parse(source);
    } catch {
      source = {};
    }
  }

  if (
    !source ||
    typeof source !== "object" ||
    Array.isArray(source)
  ) {
    return {};
  }

  const result = {};

  for (const [rawSize, rawStock] of Object.entries(source)) {
    const size = normaliseSize(rawSize);
    const stock = Number(rawStock);

    if (!size) {
      continue;
    }

    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      const error = new Error(
        `Invalid stock for size ${size}.`
      );

      error.statusCode = 400;
      throw error;
    }

    result[size] = stock;
  }

  return result;
}

export function buildSizeStock(
  sizes,
  suppliedStock = {}
) {
  const parsed =
    parseSizeStock(suppliedStock);

  const result = {};

  for (const rawSize of sizes || []) {
    const size =
      normaliseSize(rawSize);

    if (!size) {
      continue;
    }

    result[size] =
      Number.isInteger(parsed[size])
        ? parsed[size]
        : 0;
  }

  return result;
}

export function totalSizeStock(
  sizeStock
) {
  return Object.values(
    sizeStock || {}
  ).reduce(
    (total, value) =>
      total + Number(value || 0),
    0
  );
}

export async function getSizeStockMap(
  client,
  productId
) {
  const result =
    await client.query(
      `
      SELECT
        size,
        stock,
        reserved_stock

      FROM product_size_stock

      WHERE product_id = $1

      ORDER BY size ASC
      `,
      [productId]
    );

  const stock = {};
  const reserved = {};
  const available = {};

  for (const row of result.rows) {
    const size =
      normaliseSize(row.size);

    const total =
      Number(row.stock || 0);

    const held =
      Number(
        row.reserved_stock || 0
      );

    stock[size] = total;
    reserved[size] = held;
    available[size] =
      Math.max(
        0,
        total - held
      );
  }

  return {
    stock,
    reserved,
    available,
  };
}

export async function syncProductSizeStock(
  client,
  productId,
  sizes,
  suppliedStock
) {
  const wanted =
    buildSizeStock(
      sizes,
      suppliedStock
    );

  const wantedSizes =
    Object.keys(wanted);

  /*
   * Do not delete a size while stock is reserved for an
   * unfinished online payment.
   */
  const reservedResult =
    await client.query(
      `
      SELECT
        size,
        reserved_stock

      FROM product_size_stock

      WHERE
        product_id = $1
        AND reserved_stock > 0
      `,
      [productId]
    );

  for (
    const row of
    reservedResult.rows
  ) {
    if (
      !wantedSizes.includes(
        normaliseSize(row.size)
      )
    ) {
      const error =
        new Error(
          `Cannot remove size ${row.size} while stock is reserved for an order.`
        );

      error.statusCode = 409;
      throw error;
    }
  }

  for (
    const [
      size,
      stock,
    ] of Object.entries(wanted)
  ) {
    const existing =
      await client.query(
        `
        SELECT
          reserved_stock

        FROM product_size_stock

        WHERE
          product_id = $1
          AND size = $2

        FOR UPDATE
        `,
        [
          productId,
          size,
        ]
      );

    const reserved =
      existing.rowCount
        ? Number(
            existing.rows[0]
              .reserved_stock || 0
          )
        : 0;

    if (stock < reserved) {
      const error =
        new Error(
          `Stock for ${size} cannot be lower than its ${reserved} reserved item(s).`
        );

      error.statusCode = 409;
      throw error;
    }

    await client.query(
      `
      INSERT INTO product_size_stock (
        product_id,
        size,
        stock,
        reserved_stock
      )

      VALUES (
        $1,
        $2,
        $3,
        0
      )

      ON CONFLICT (
        product_id,
        size
      )

      DO UPDATE SET
        stock =
          EXCLUDED.stock,
        updated_at =
          NOW()
      `,
      [
        productId,
        size,
        stock,
      ]
    );
  }

  if (wantedSizes.length > 0) {
    await client.query(
      `
      DELETE FROM product_size_stock

      WHERE
        product_id = $1
        AND NOT (
          size = ANY($2::text[])
        )
        AND reserved_stock = 0
      `,
      [
        productId,
        wantedSizes,
      ]
    );
  }

  const totals =
    await client.query(
      `
      SELECT
        COALESCE(
          SUM(stock),
          0
        )::int AS stock,

        COALESCE(
          SUM(reserved_stock),
          0
        )::int AS reserved_stock

      FROM product_size_stock

      WHERE product_id = $1
      `,
      [productId]
    );

  /*
   * Keep the old aggregate columns synchronised.
   * This preserves compatibility with dashboard/reporting code.
   */
  await client.query(
    `
    UPDATE products

    SET
      stock = $1,
      reserved_stock = $2,
      updated_at = NOW()

    WHERE id = $3
    `,
    [
      Number(
        totals.rows[0].stock
      ),
      Number(
        totals.rows[0]
          .reserved_stock
      ),
      productId,
    ]
  );

  return getSizeStockMap(
    client,
    productId
  );
}

export async function ensureProductSizeRows(
  client,
  productId,
  sizes
) {
  for (const rawSize of sizes || []) {
    const size =
      normaliseSize(rawSize);

    if (!size) {
      continue;
    }

    await client.query(
      `
      INSERT INTO product_size_stock (
        product_id,
        size,
        stock,
        reserved_stock
      )

      VALUES (
        $1,
        $2,
        0,
        0
      )

      ON CONFLICT (
        product_id,
        size
      )

      DO NOTHING
      `,
      [
        productId,
        size,
      ]
    );
  }
}
