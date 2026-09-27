export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ================================
    // API: Health Check
    // ================================
    if (
      url.pathname === "/api/health" &&
      request.method === "GET"
    ) {
      return Response.json({
        success: true,
        message: "Restaurant API is working",
        database: !!env.DB
      });
    }

    // ================================
    // API: Admin Orders
    // GET /api/admin/orders
    // ================================
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

    // ================================
    // API: Update Order Status
    // PATCH /api/admin/orders/:id
    // ================================
    if (
      url.pathname.startsWith("/api/admin/orders/") &&
      request.method === "PATCH"
    ) {
      const orderId = url.pathname.split("/").pop();
      const data = await request.json();

      const allowedStatuses = [
        "Pending",
        "Confirmed",
        "Preparing",
        "Delivered",
        "Cancelled"
      ];

      if (!allowedStatuses.includes(data.status)) {
        return Response.json(
          {
            success: false,
            message: "Invalid order status"
          },
          { status: 400 }
        );
      }

      const result = await env.DB
        .prepare(`
          UPDATE orders
          SET status = ?
          WHERE id = ?
        `)
        .bind(
          data.status,
          Number(orderId)
        )
        .run();

      if (!result.meta.changes) {
        return Response.json(
          {
            success: false,
            message: "Order not found"
          },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        message: "Order status updated successfully",
        order_id: Number(orderId),
        status: data.status
      });
    }

    // ================================
    // API: Admin Bookings
    // GET /api/admin/bookings
    // ================================
    if (
      url.pathname === "/api/admin/bookings" &&
      request.method === "GET"
    ) {
      const { results: bookings } = await env.DB
        .prepare(`
          SELECT
            id,
            customer_name,
            phone,
            booking_date,
            booking_time,
            guests,
            status,
            created_at
          FROM bookings
          ORDER BY id DESC
        `)
        .all();

      return Response.json({
        success: true,
        bookings: bookings
      });
    }

    // ================================
    // API: Update Booking Status
    // PATCH /api/admin/bookings/:id
    // ================================
    if (
      url.pathname.startsWith("/api/admin/bookings/") &&
      request.method === "PATCH"
    ) {
      const bookingId = url.pathname.split("/").pop();
      const data = await request.json();

      const allowedStatuses = [
        "Pending",
        "Confirmed",
        "Completed",
        "Cancelled"
      ];

      if (!allowedStatuses.includes(data.status)) {
        return Response.json(
          {
            success: false,
            message: "Invalid booking status"
          },
          { status: 400 }
        );
      }

      const result = await env.DB
        .prepare(`
          UPDATE bookings
          SET status = ?
          WHERE id = ?
        `)
        .bind(
          data.status,
          Number(bookingId)
        )
        .run();

      if (!result.meta.changes) {
        return Response.json(
          {
            success: false,
            message: "Booking not found"
          },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        message: "Booking status updated successfully",
        booking_id: Number(bookingId),
        status: data.status
      });
    }

    // ================================
    // API: ADMIN MENU
    // GET /api/admin/menu
    // ================================
    if (
      url.pathname === "/api/admin/menu" &&
      request.method === "GET"
    ) {
      const { results: menu } = await env.DB
        .prepare(`
          SELECT
            id,
            name,
            category,
            description,
            price,
            image,
            available,
            created_at
          FROM menu_items
          ORDER BY id DESC
        `)
        .all();

      return Response.json({
        success: true,
        menu: menu
      });
    }

    // ================================
    // API: ADD MENU ITEM
    // POST /api/admin/menu
    // ================================
    if (
      url.pathname === "/api/admin/menu" &&
      request.method === "POST"
    ) {
      const data = await request.json();

      if (
        !data.name ||
        data.price === undefined ||
        data.price === null ||
        data.price === ""
      ) {
        return Response.json(
          {
            success: false,
            message: "Menu name and price are required"
          },
          { status: 400 }
        );
      }

      const result = await env.DB
        .prepare(`
          INSERT INTO menu_items
          (
            name,
            category,
            description,
            price,
            image,
            available
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          data.name,
          data.category || "",
          data.description || "",
          Number(data.price),
          data.image || "",
          data.available === undefined
            ? 1
            : Number(data.available)
        )
        .run();

      return Response.json({
        success: true,
        message: "Menu item added successfully",
        menu_id: result.meta.last_row_id
      });
    }

    // ================================
    // API: EDIT MENU ITEM
    // PATCH /api/admin/menu/:id
    // ================================
    if (
      url.pathname.startsWith("/api/admin/menu/") &&
      request.method === "PATCH"
    ) {
      const menuId = url.pathname.split("/").pop();
      const data = await request.json();

      if (
        !data.name ||
        data.price === undefined ||
        data.price === null ||
        data.price === ""
      ) {
        return Response.json(
          {
            success: false,
            message: "Menu name and price are required"
          },
          { status: 400 }
        );
      }

      const result = await env.DB
        .prepare(`
          UPDATE menu_items
          SET
            name = ?,
            category = ?,
            description = ?,
            price = ?,
            image = ?,
            available = ?
          WHERE id = ?
        `)
        .bind(
          data.name,
          data.category || "",
          data.description || "",
          Number(data.price),
          data.image || "",
          Number(data.available),
          Number(menuId)
        )
        .run();

      if (!result.meta.changes) {
        return Response.json(
          {
            success: false,
            message: "Menu item not found"
          },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        message: "Menu item updated successfully",
        menu_id: Number(menuId)
      });
    }

    // ================================
    // API: DELETE MENU ITEM
    // DELETE /api/admin/menu/:id
    // ================================
    if (
      url.pathname.startsWith("/api/admin/menu/") &&
      request.method === "DELETE"
    ) {
      const menuId = url.pathname.split("/").pop();

      const result = await env.DB
        .prepare(`
          DELETE FROM menu_items
          WHERE id = ?
        `)
        .bind(Number(menuId))
        .run();

      if (!result.meta.changes) {
        return Response.json(
          {
            success: false,
            message: "Menu item not found"
          },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        message: "Menu item deleted successfully",
        menu_id: Number(menuId)
      });
    }

    // ================================
    // API: Get Menu For Website
    // GET /api/menu
    // ================================
    if (
      url.pathname === "/api/menu" &&
      request.method === "GET"
    ) {
      const { results } = await env.DB
        .prepare(`
          SELECT
            id,
            name,
            category,
            description,
            price,
            image,
            available
          FROM menu_items
          WHERE available = 1
          ORDER BY id DESC
        `)
        .all();

      return Response.json({
        success: true,
        menu: results
      });
    }

    // ================================
    // API: Create Booking
    // ================================
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
          (
            customer_name,
            phone,
            booking_date,
            booking_time,
            guests
          )
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

    // ================================
    // API: Create Order
    // ================================
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
          (
            customer_name,
            phone,
            address,
            total_amount,
            payment_method
          )
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
              (
                order_id,
                menu_item_id,
                item_name,
                quantity,
                price
              )
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

    // ================================
    // Website Files
    // ================================
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response(
      "Worker is working!",
      {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      }
    );
  }
};
