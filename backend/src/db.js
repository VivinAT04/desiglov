import pg from "pg";

const { Pool } = pg;

export const pool =
  new Pool({
    connectionString:
      process.env.DATABASE_URL,

    // Do not allow a stalled remote database connection
    // to leave an API request hanging indefinitely.
    connectionTimeoutMillis:
      10000,

    // Release unused connections so Supabase can recycle
    // pooled sessions cleanly.
    idleTimeoutMillis:
      30000,

    // Keep the local API pool deliberately small.
    max:
      5,

    // Allow Node to exit when only idle DB connections remain.
    allowExitOnIdle:
      true,
  });

pool.on(
  "error",
  (error) => {
    console.error(
      "Unexpected PostgreSQL pool error:",
      {
        message:
          error?.message,
        code:
          error?.code,
      }
    );
  }
);


export async function initialiseDatabase() {

  // =========================================================
  // USERS
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,

      full_name VARCHAR(120)
        NOT NULL,

      email VARCHAR(320)
        UNIQUE
        NOT NULL,

      password_hash TEXT
        NOT NULL,

      role VARCHAR(30)
        NOT NULL
        DEFAULT 'CUSTOMER',

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);


  await pool.query(`
    ALTER TABLE users

    ADD COLUMN IF NOT EXISTS role
    VARCHAR(30)
    NOT NULL
    DEFAULT 'CUSTOMER';
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS users_email_index
    ON users (email);
  `);


  // =========================================================
  // ADDRESSES
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS addresses (
      id UUID PRIMARY KEY,

      user_id UUID
        NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      full_name VARCHAR(120)
        NOT NULL,

      phone VARCHAR(30)
        NOT NULL,

      line1 VARCHAR(250)
        NOT NULL,

      line2 VARCHAR(250),

      city VARCHAR(120)
        NOT NULL,

      state VARCHAR(120)
        NOT NULL,

      postal_code VARCHAR(30)
        NOT NULL,

      country VARCHAR(80)
        NOT NULL
        DEFAULT 'India',

      is_default BOOLEAN
        NOT NULL
        DEFAULT FALSE,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS addresses_user_index
    ON addresses (user_id);
  `);


  // =========================================================
  // PRODUCTS
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,

      slug VARCHAR(180)
        UNIQUE
        NOT NULL,

      name VARCHAR(180)
        NOT NULL,

      category VARCHAR(120)
        NOT NULL,

      subcategory VARCHAR(120),

      price_inr INTEGER
        NOT NULL
        CHECK (price_inr >= 0),

      stock INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (stock >= 0),

      reserved_stock INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (reserved_stock >= 0),

      badge VARCHAR(80),

      colour VARCHAR(120),

      material TEXT,

      description TEXT,

      image_path TEXT,

      sizes JSONB
        NOT NULL
        DEFAULT '[]'::jsonb,

      images JSONB
        NOT NULL
        DEFAULT '[]'::jsonb,

      active BOOLEAN
        NOT NULL
        DEFAULT TRUE,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);


  // =========================================================
  // ONLINE PAYMENT STOCK RESERVATION
  // =========================================================

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS reserved_stock INTEGER
    NOT NULL
    DEFAULT 0;
  `);

  await pool.query(`
    UPDATE products
    SET reserved_stock = 0
    WHERE reserved_stock IS NULL;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_reserved_stock_nonnegative'
      ) THEN
        ALTER TABLE products
        ADD CONSTRAINT products_reserved_stock_nonnegative
        CHECK (reserved_stock >= 0);
      END IF;
    END
    $$;
  `);


  await pool.query(`
    ALTER TABLE products

    ADD COLUMN IF NOT EXISTS sizes
    JSONB
    NOT NULL
    DEFAULT '[]'::jsonb;
  `);


  await pool.query(`
    ALTER TABLE products

    ADD COLUMN IF NOT EXISTS images
    JSONB
    NOT NULL
    DEFAULT '[]'::jsonb;
  `);


  // =========================================================
  // STOCK BY PRODUCT SIZE
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_size_stock (
      product_id INTEGER
        NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

      size VARCHAR(50)
        NOT NULL,

      stock INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (stock >= 0),

      reserved_stock INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (reserved_stock >= 0),

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      PRIMARY KEY (
        product_id,
        size
      ),

      CHECK (
        reserved_stock <= stock
      )
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS product_size_stock_product_index
    ON product_size_stock (product_id);
  `);

  /*
   * Existing products are deliberately initialised with
   * ZERO stock for each size.
   *
   * We cannot safely guess how an old total such as 8 should
   * be divided between XS/S/M/L. The admin will allocate it.
   */
  await pool.query(`
    INSERT INTO product_size_stock (
      product_id,
      size,
      stock,
      reserved_stock
    )

    SELECT
      p.id,
      UPPER(TRIM(size_value)),
      0,
      0

    FROM products p

    CROSS JOIN LATERAL
      jsonb_array_elements_text(
        p.sizes
      ) AS size_value

    WHERE
      TRIM(size_value) <> ''

    ON CONFLICT (
      product_id,
      size
    )

    DO NOTHING;
  `);

  // =========================================================
  // TIMED PRODUCT SALES
  // =========================================================

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sale_price_inr INTEGER;
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_sale_price_nonnegative'
      ) THEN
        ALTER TABLE products
        ADD CONSTRAINT products_sale_price_nonnegative
        CHECK (
          sale_price_inr IS NULL
          OR sale_price_inr >= 0
        );
      END IF;
    END
    $$;
  `);

  // =========================================================
  // PRODUCT REVIEWS
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id UUID PRIMARY KEY,

      product_id INTEGER
        NOT NULL
        REFERENCES products(id)
        ON DELETE CASCADE,

      user_id UUID
        NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      rating INTEGER
        NOT NULL
        CHECK (
          rating >= 1
          AND rating <= 5
        ),

      comment TEXT
        NOT NULL,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      UNIQUE (
        product_id,
        user_id
      )
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS product_reviews_product_index
    ON product_reviews (
      product_id,
      updated_at DESC
    );
  `);


  // =========================================================
  // SEED PRODUCTS
  //
  // Price, stock and active are NOT overwritten on restart.
  // That means admin changes remain permanent.
  // =========================================================

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS subcategory VARCHAR(120);
  `);

  const products = [

    {
      id: 1,
      slug: "neelam",
      name: "Neelam",
      category: "Kurtis",
      price: 599,
      stock: 10,
      badge: "NEW",
      colour: "Peacock Blue",
      material:
        "Kalamkari detailed fabric",
      description:
        "Peacock blue long kurti finished with contrasting mustard Kalamkari detailing, delicate lace work, practical pockets and full sleeves.",
      sizes: [
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "XXL",
      ],
      images: [
        "/products/neelam/1.jpg",
        "/products/neelam/2.jpg",
      ],
    },


    {
      id: 2,
      slug: "moonlight",
      name: "Moonlight",
      category: "Kurtis",
      price: 669,
      stock: 10,
      badge: "SIGNATURE",
      colour: "Black & White",
      material:
        "Comfort fabric",
      description:
        "A striking black-and-white kurti featuring a high-neck front pattern and an elegant oval back detail.",
      sizes: [
        "XS",
        "S",
        "M",
        "L",
      ],
      images: [
        "/products/moonlight/1.jpg",
        "/products/moonlight/2.jpg",
        "/products/moonlight/3.jpg",
        "/products/moonlight/4.jpg",
      ],
    },


    {
      id: 3,
      slug: "grape",
      name: "Grape",
      category: "Coord Sets",
      price: 719,
      stock: 5,
      badge: "LIMITED",
      colour: "Lavender",
      material:
        "Comfort blend",
      description:
        "A soft lavender coord set with flowing palazzo pants, practical pockets, three-quarter sleeves and adjustable knot detailing.",
      sizes: [
        "M",
        "L",
        "XL",
      ],
      images: [
        "/products/grape/1.jpg",
        "/products/grape/2.jpg",
      ],
    },


    {
      id: 4,
      slug: "chocolate",
      name: "Chocolate",
      category: "Coord Sets",
      price: 799,
      stock: 3,
      badge: "LIMITED",
      colour: "Brown",
      material:
        "Comfort blend",
      description:
        "An earthy brown coord set with palazzo pants, practical pockets, short sleeves and adjustable knot detailing.",
      sizes: [
        "M",
        "L",
        "XL",
      ],
      images: [
        "/products/chocolate/1.jpg",
      ],
    },


    {
      id: 5,
      slug: "softrose",
      name: "Softrose",
      category: "Coord Sets",
      price: 799,
      stock: 7,
      badge: "NEW",
      colour: "Pink",
      material:
        "Comfort blend",
      description:
        "A feminine pink side-close coord set paired with palazzo pants, pockets, three-quarter sleeves and adjustable knot detailing.",
      sizes: [
        "M",
        "L",
        "XL",
        "XXL",
      ],
      images: [
        "/products/softrose/1.jpg",
      ],
    },


    {
      id: 6,
      slug: "ivorybloom",
      name: "Ivorybloom",
      category: "3 Piece Sets",
      price: 849,
      stock: 6,
      badge: "BESTSELLER",
      colour: "Ivory",
      material:
        "Cotton blend with Zardosi bead work",
      description:
        "An elegant white three-piece ensemble with straight-fit pants and shawl, finished with intricate Zardosi bead work.",
      sizes: [
        "M",
        "L",
        "XL",
        "XXL",
      ],
      images: [
        "/products/ivorybloom/1.jpg",
        "/products/ivorybloom/2.jpg",
      ],
    },


    {
      id: 7,
      slug: "mulchanderi",
      name: "Mulchanderi",
      category: "3 Piece Sets",
      price: 1200,
      stock: 3,
      badge: "PREMIUM",
      colour: "Mustard",
      material:
        "Space Silk",
      description:
        "A rich mustard Space Silk Anarkali set paired with a contrasting green cotton shawl and straight-fit trousers.",
      sizes: [
        "M",
        "L",
        "XL",
      ],
      images: [
        "/products/mulchanderi/1.jpg",
      ],
    },


    {
      id: 8,
      slug: "hoops-and-gems",
      name: "Hoops & Gems",
      category: "Jewellery",
      price: 229,
      stock: 10,
      badge: "TRENDING",
      colour: "Gold",
      material:
        "Anti-tarnish jewellery",
      description:
        "A contemporary anti-tarnish earring design made for effortless everyday styling.",
      sizes: [
        "ONE SIZE",
      ],
      images: [
        "/products/hoops-gems/1.png",
        "/products/hoops-gems/2.png",
      ],
    },


    {
      id: 9,
      slug: "tri-heart",
      name: "Tri Heart",
      category: "Jewellery",
      price: 299,
      stock: 10,
      badge: "NEW",
      colour: "Gold",
      material:
        "Anti-tarnish jewellery",
      description:
        "A playful anti-tarnish heart design created to add a distinctive finishing touch to your everyday look.",
      sizes: [
        "ONE SIZE",
      ],
      images: [
        "/products/tri-heart/1.png",
        "/products/tri-heart/2.png",
        "/products/tri-heart/3.png",
      ],
    },


    {
      id: 10,
      slug: "spikes",
      name: "Spikes",
      category: "Jewellery",
      price: 479,
      stock: 10,
      badge: "STATEMENT",
      colour: "Gold",
      material:
        "Anti-tarnish jewellery",
      description:
        "A bold anti-tarnish statement piece for styling beyond the ordinary.",
      sizes: [
        "ONE SIZE",
      ],
      images: [
        "/products/spikes/1.jpg",
      ],
    },
  ];


  for (
    const product of products
  ) {

    await pool.query(
      `
      INSERT INTO products (
        id,
        slug,
        name,
        category,
        price_inr,
        stock,
        badge,
        colour,
        material,
        description,
        image_path,
        sizes,
        images
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
        $11,
        $12::jsonb,
        $13::jsonb
      )

      ON CONFLICT (id)
      DO NOTHING
      `,
      [
        product.id,
        product.slug,
        product.name,
        product.category,
        product.price,
        product.stock,
        product.badge,
        product.colour,
        product.material,
        product.description,
        product.images[0],
        JSON.stringify(
          product.sizes
        ),
        JSON.stringify(
          product.images
        ),
      ]
    );
  }


  // =========================================================
  // ORDERS
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,

      order_number VARCHAR(40)
        UNIQUE
        NOT NULL,

      user_id UUID
        NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

      address_id UUID
        REFERENCES addresses(id)
        ON DELETE SET NULL,

      status VARCHAR(40)
        NOT NULL
        DEFAULT 'PLACED',

      payment_status VARCHAR(40)
        NOT NULL
        DEFAULT 'PENDING',

      payment_method VARCHAR(40)
        NOT NULL,

      subtotal_inr INTEGER
        NOT NULL,

      shipping_inr INTEGER
        NOT NULL
        DEFAULT 0,

      cod_fee_inr INTEGER
        NOT NULL
        DEFAULT 0,

      total_inr INTEGER
        NOT NULL,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);


  // =========================================================
  // COD CONVENIENCE FEE
  // =========================================================

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS cod_fee_inr INTEGER
    NOT NULL
    DEFAULT 0;
  `);


  // =========================================================
  // DELIVERY TRACKING
  // =========================================================

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS courier VARCHAR(80)
    NOT NULL
    DEFAULT 'Delhivery';
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS awb_number VARCHAR(120);
  `);


  // =========================================================
  // RAZORPAY PAYMENT REFERENCES
  // =========================================================

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(120);
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(120);
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
  `);


  // =========================================================
  // ONLINE PAYMENT STOCK RESERVATION EXPIRY
  // =========================================================

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMPTZ;
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN
    NOT NULL
    DEFAULT FALSE;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_index
    ON orders (razorpay_order_id)
    WHERE razorpay_order_id IS NOT NULL;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_index
    ON orders (razorpay_payment_id)
    WHERE razorpay_payment_id IS NOT NULL;
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS orders_user_index
    ON orders (user_id);
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS orders_created_index
    ON orders (created_at DESC);
  `);


  // =========================================================
  // DISCOUNT CODES
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS discount_codes (
      id UUID PRIMARY KEY,

      code VARCHAR(50)
        NOT NULL,

      discount_type VARCHAR(20)
        NOT NULL
        CHECK (
          discount_type IN (
            'PERCENTAGE',
            'FIXED'
          )
        ),

      discount_value INTEGER
        NOT NULL
        CHECK (
          discount_value > 0
        ),

      minimum_order_inr INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (
          minimum_order_inr >= 0
        ),

      expires_at TIMESTAMPTZ,

      active BOOLEAN
        NOT NULL
        DEFAULT TRUE,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS discount_codes_code_unique
    ON discount_codes (
      UPPER(code)
    );
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50);
  `);

  await pool.query(`
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS discount_inr INTEGER
    NOT NULL
    DEFAULT 0;
  `);


  // =========================================================
  // ORDER ITEMS
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY,

      order_id UUID
        NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE,

      product_id INTEGER
        NOT NULL,

      product_name VARCHAR(180)
        NOT NULL,

      product_slug VARCHAR(180)
        NOT NULL,

      size VARCHAR(50)
        NOT NULL,

      quantity INTEGER
        NOT NULL
        CHECK (quantity > 0),

      unit_price_inr INTEGER
        NOT NULL
        CHECK (unit_price_inr >= 0),

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS order_items_order_index
    ON order_items (order_id);
  `);


  // =========================================================
  // ADMIN
  // =========================================================

  const adminEmails =
    String(
      process.env.ADMIN_EMAILS ||
      process.env.ADMIN_EMAIL ||
      ""
    )
      .split(",")
      .map((email) =>
        email.trim().toLowerCase()
      )
      .filter(Boolean);

  if (adminEmails.length > 0) {

    const result =
      await pool.query(
        `
        UPDATE users

        SET
          role = 'ADMIN',
          updated_at = NOW()

        WHERE LOWER(email) = ANY($1::text[])

        RETURNING email
        `,
        [
          adminEmails,
        ]
      );


    for (const row of result.rows) {
      console.log(
        `✓ Admin enabled: ${row.email}`
      );
    }
  }


  // =========================================================
  // ADMIN AUDIT LOG
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id UUID PRIMARY KEY,

      admin_user_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

      admin_email VARCHAR(320),

      action VARCHAR(120)
        NOT NULL,

      entity_type VARCHAR(80),

      entity_id VARCHAR(120),

      metadata JSONB
        NOT NULL
        DEFAULT '{}'::jsonb,

      ip_address VARCHAR(120),

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS admin_audit_created_index
    ON admin_audit_log (
      created_at DESC
    );
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS admin_audit_admin_index
    ON admin_audit_log (
      admin_user_id
    );
  `);


  // =========================================================
  // PASSWORD RESET TOKENS
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY,

      user_id UUID
        NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

      token_hash TEXT
        UNIQUE
        NOT NULL,

      expires_at TIMESTAMPTZ
        NOT NULL,

      used_at TIMESTAMPTZ,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS password_reset_user_index
    ON password_reset_tokens (
      user_id
    );
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS password_reset_expiry_index
    ON password_reset_tokens (
      expires_at
    );
  `);


  // =========================================================
  // NEWSLETTER SUBSCRIBERS
  // =========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      email VARCHAR(320)
        PRIMARY KEY,

      active BOOLEAN
        NOT NULL
        DEFAULT TRUE,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    );
  `);


  await pool.query(`
    CREATE INDEX IF NOT EXISTS newsletter_subscribers_active_index
    ON newsletter_subscribers (
      active
    );
  `);


  console.log(
    "✓ PostgreSQL ready"
  );
}
