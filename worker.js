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

      if (
        !data.customer_name ||
        !data.phone ||
        !data.booking_date ||
        !data.booking_time ||
        !data.guests
      ) {
        return Response.json(
          { success: false, message: "All booking fields are required" },
          { status: 400 }
        );
      }

      const result = await env.DB.prepare(`
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

     
