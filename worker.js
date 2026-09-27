export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API: Health check
    if (url.pathname === "/api/health") {
      return Response.json({
        success: true,
        message: "Restaurant API is working",
        database: !!env.DB
      });
    }

    // API: Get menu
    if (url.pathname === "/api/menu" && request.method === "GET") {
      const { results } = await env.DB
        .prepare(
          "SELECT id, name, category, description, price, image, available FROM menu_items WHERE available = 1 ORDER BY id DESC"
        )
        .all();

      return Response.json({
        success: true,
        menu: results
      });
    }

    // API: Create booking
    if (url.pathname === "/api/bookings" && request.method === "POST") {
      const data = await request.json();
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API: Health check
    if (url.pathname === "/api/health") {
      return Response.json({
        success: true,
        message: "Restaurant API is working",
        database: !!env.DB
      });
    }

    // API: Admin orders
    if (
      url.pathname === "/api/admin/orders" &&
      request.method === "GET"
    ) {
      const { results: orders } = await env.DB
        .prepare(`
          SELECT
            id,
            customer_name,
            phone,
            address,
            total_amount,
            payment_method,
            status,
            created_at
          FROM orders
          ORDER BY id DESC
        `)
        .all();

      for (const order of orders) {
        const { results: items } = await env.DB
          .prepare(`
            SELECT
              item_name,
              quantity,
              price
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
          `)
          .bind(order.id)
          .all();

        order.items = items;
      }

      return Response.json({
        success: true,
        orders: orders
      });
    }

    // API: Get menu
    if (
      url.pathname === "/api/menu" &&
      request.method === "GET"
    ) {
      const { results } = await env.DB
        .prepare(
          "SELECT id, name, category, description, price, image, available FROM menu_items WHERE available = 1 ORDER BY id DESC"
        )
        .all();

      return Response.json({
        success: true,
        menu: results
      });
    }

    // API: Create booking
    if (
      url.pathname === "/api/bookings" &&
      request.method === "POST"
    ) {
      const data = await request.json();

      if (
        !data.customer_name ||
        !data.phone ||
        !data.booking_date ||
        !data.booking_time ||
        !data.guests
      ) {
        return Response.json(
          {
            success: false,
            message: "All booking fields are required"
          },
          { status: 400 }
        );
      }

      const result = await env.DB
        .prepare(`
          INSERT INTO bookings
          (customer_name, phone, booking_date, booking_time, guests)
          VALUES (?, ?, ?, ?, ?)
        `)
        .bind(
          data.customer_name,
          data.phone,
          data.booking_date,
          data.booking_time,
          Number(data.guests)
        )
        .run();

      return Response.json({
        success: true,
        message: "Booking saved successfully",
        booking_id: result.meta.last_row_id
      });
    }

    // API: Create order
    if (
      url.pathname === "/api/orders" &&
      request.method === "POST"
    ) {
      const data = await request.json();

      if (
        !data.customer_name ||
        !data.phone ||
        !data.total_amount
      ) {
        return Response.json(
          {
            success: false,
            message: "Customer and order details are required"
          },
          { status: 400 }
        );
      }

      const order = await env.DB
        .prepare(`
          INSERT INTO orders
          (customer_name, phone, address, total_amount, payment_method)
          VALUES (?, ?, ?, ?, ?)
        `)
        .bind(
          data.customer_name,
          data.phone,
          data.address || "",
          Number(data.total_amount),
          data.payment_method || "COD"
        )
        .run();

      const orderId = order.meta.last_row_id;

      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          await env.DB
            .prepare(`
              INSERT INTO order_items
              (order_id, menu_item_id, item_name, quantity, price)
              VALUES (?, ?, ?, ?, ?)
            `)
            .bind(
              orderId,
              item.menu_item_id || null,
              item.item_name,
              Number(item.quantity),
              Number(item.price)
            )
            .run();
        }
      }

      return Response.json({
        success: true,
        message: "Order saved successfully",
        order_id: orderId
      });
    }

    // Website files
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Worker is working!", {
      status: 200,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }
};
