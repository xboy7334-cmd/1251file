/* =========================================================
   YOUR CHOICE FAMILY RESTAURANT
   Website Script
   Menu + Orders + Booking + Order Tracking
   Cloudflare Worker + D1
========================================================= */

"use strict";

const API = "https://1251file.xboy7334.workers.dev";

let menu = [];
let cart = [];

const $ = s => document.querySelector(s);

async function loadMenu() {
  try {
    const response = await fetch(API + "/api/menu", { method: "GET", cache: "no-store" });
    if (!response.ok) throw new Error("Menu API Error: HTTP " + response.status);

    const data = await response.json();
    if (!data.success || !Array.isArray(data.menu)) throw new Error("Invalid menu data received");

    menu = data.menu.map(item => ({
      id: Number(item.id),
      name: item.name || "",
      price: Number(item.price || 0),
      desc: item.description || item.desc || "",
      image: item.image || "",
      category: item.category || "",
      available: Number(item.available) === 1
    }));

    renderMenu();
    renderCart();
  } catch (error) {
    console.error("Menu loading failed:", error);
    const menuGrid = $("#menuGrid");
    if (menuGrid) {
      menuGrid.innerHTML = `
        <div style="padding:20px;text-align:center;">
          <p>Menu loading failed.</p>
          <button onclick="loadMenu()">Try Again</button>
        </div>`;
    }
  }
}

function renderMenu(list = menu) {
  const menuGrid = $("#menuGrid");
  if (!menuGrid) return;

  menuGrid.innerHTML = list.map(x => `
    <article class="card">
      <div class="food">
        ${x.image ? `<img src="${escapeHTML(x.image)}" alt="${escapeHTML(x.name)}" loading="lazy" onerror="this.style.display='none'">` : ""}
      </div>
      <h3>${escapeHTML(x.name)}</h3>
      <p>${escapeHTML(x.desc)}</p>
      <div class="card-row">
        <strong>₹${x.price}</strong>
        <button class="add" onclick="add(${x.id})">Add to Cart</button>
      </div>
    </article>
  `).join("");
}

function add(id) {
  const item = menu.find(i => Number(i.id) === Number(id));
  if (!item) return console.error("Menu item not found:", id);

  const x = cart.find(i => Number(i.id) === Number(id));
  if (x) x.qty++;
  else cart.push({ ...item, qty: 1 });

  renderCart();
  toast("Added to cart");
}

function renderCart() {
  const cartCount = $("#cartCount");
  const total = $("#total");
  const cartItems = $("#cartItems");
  if (!cartCount || !total || !cartItems) return;

  const n = cart.reduce((a, b) => a + b.qty, 0);
  const t = cart.reduce((a, b) => a + b.qty * b.price, 0);

  cartCount.textContent = n;
  total.textContent = t;

  cartItems.innerHTML = cart.length
    ? cart.map(x => `
        <div class="drawer-item">
          <span>${escapeHTML(x.name)}<br>₹${x.price} × ${x.qty}</span>
          <span>
            <button onclick="change(${x.id},-1)">−</button>
            <button onclick="change(${x.id},1)">+</button>
          </span>
        </div>
      `).join("")
    : "<p>Your cart is empty.</p>";
}

function change(id, d) {
  const x = cart.find(i => Number(i.id) === Number(id));
  if (!x) return;

  x.qty += d;
  if (x.qty <= 0) cart = cart.filter(i => Number(i.id) !== Number(id));
  renderCart();
}

function openCart() {
  $("#cartPanel")?.classList.add("open");
  $("#overlay")?.classList.add("show");
}

function closeCart() {
  $("#cartPanel")?.classList.remove("open");
  $("#overlay")?.classList.remove("show");
}

function toast(t) {
  const e = $("#toast");
  if (!e) return;
  e.textContent = t;
  e.classList.add("show");
  setTimeout(() => e.classList.remove("show"), 2200);
}

const cartBtn = $("#cartBtn");
const closeCartBtn = $("#closeCart");
const overlay = $("#overlay");

if (cartBtn) cartBtn.onclick = openCart;
if (closeCartBtn) closeCartBtn.onclick = closeCart;
if (overlay) overlay.onclick = closeCart;

const search = $("#search");
if (search) {
  search.oninput = e => {
    const q = e.target.value.toLowerCase().trim();
    renderMenu(menu.filter(x => (x.name + " " + x.desc + " " + x.category).toLowerCase().includes(q)));
  };
}

function showOrderSuccess(orderId) {
  const existing = $("#orderSuccess");
  if (existing) existing.remove();

  const box = document.createElement("div");
  box.id = "orderSuccess";
  box.style.cssText = `
    position:fixed;
    inset:0;
    z-index:99999;
    background:rgba(0,0,0,.65);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:18px;
  `;

  box.innerHTML = `
    <div style="
      width:min(430px,100%);
      background:#fff;
      border-radius:20px;
      padding:28px 22px;
      text-align:center;
      box-shadow:0 15px 50px rgba(0,0,0,.3);
    ">
      <div style="font-size:48px;margin-bottom:8px;">✅</div>
      <h2 style="margin:0 0 8px;">Order Confirmed</h2>
      <p style="margin:0 0 18px;color:#666;">Your order has been placed successfully.</p>

      <div style="
        background:#f5f5f5;
        border-radius:14px;
        padding:16px;
        margin-bottom:18px;
      ">
        <div style="font-size:13px;color:#777;">YOUR ORDER ID</div>
        <div id="successOrderId" style="font-size:30px;font-weight:800;margin:5px 0 12px;">
          #${escapeHTML(orderId)}
        </div>
        <button id="copyOrderId" type="button" style="
          border:0;
          border-radius:10px;
          padding:10px 16px;
          font-weight:700;
          cursor:pointer;
        ">Copy Order ID</button>
      </div>

      <button id="goTrackOrder" type="button" style="
        width:100%;
        border:0;
        border-radius:12px;
        padding:13px;
        font-weight:800;
        cursor:pointer;
        margin-bottom:10px;
      ">Track Order</button>

      <button id="closeOrderSuccess" type="button" style="
        width:100%;
        border:1px solid #ddd;
        background:#fff;
        border-radius:12px;
        padding:12px;
        cursor:pointer;
      ">Close</button>

      <p style="font-size:12px;color:#777;margin:14px 0 0;">
        Please save this Order ID for tracking your order.
      </p>
    </div>
  `;

  document.body.appendChild(box);

  $("#copyOrderId").onclick = async () => {
    try {
      await navigator.clipboard.writeText(String(orderId));
      toast("Order ID copied");
    } catch {
      toast("Order ID: " + orderId);
    }
  };

  $("#goTrackOrder").onclick = () => {
    box.remove();
    closeCart();
    const tracking = $("#tracking");
    if (tracking) tracking.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => $("#trackingForm")?.querySelector('[name="order_id"]')?.focus(), 500);
  };

  $("#closeOrderSuccess").onclick = () => box.remove();
}

const orderForm = $("#orderForm");

if (orderForm) {
  orderForm.onsubmit = async e => {
    e.preventDefault();

    if (!cart.length) return toast("Add an item first");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const totalAmount = cart.reduce((total, item) => total + item.price * item.qty, 0);

    const orderData = {
      customer_name: data.customer_name || data.name || data.customerName || "",
      phone: data.phone || data.mobile || data.mobile_number || "",
      address: data.address || "",
      total_amount: totalAmount,
      payment_method: data.payment_method || data.payment || "COD",
      items: cart.map(item => ({
        menu_item_id: item.id,
        item_name: item.name,
        quantity: item.qty,
        price: item.price
      }))
    };

    if (!orderData.customer_name || !orderData.phone) {
      toast("Please enter name and phone");
      return;
    }

    try {
      const response = await fetch(API + "/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Order failed");
      }

      const orderId = result.order_id;

      cart = [];
      renderCart();
      e.target.reset();

      closeCart();
      showOrderSuccess(orderId);

    } catch (error) {
      console.error("Order error:", error);
      toast("Order failed. Please try again.");
    }
  };
}

const bookingForm = $("#bookingForm");

if (bookingForm) {
  bookingForm.onsubmit = async e => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const bookingData = {
      customer_name: data.customer_name || data.name || data.customerName || "",
      phone: data.phone || data.mobile || data.mobile_number || "",
      booking_date: data.booking_date || data.date || "",
      booking_time: data.booking_time || data.time || "",
      guests: Number(data.guests || data.guest || 1)
    };

    if (!bookingData.customer_name || !bookingData.phone || !bookingData.booking_date ||
        !bookingData.booking_time || !bookingData.guests) {
      toast("Please fill all booking details");
      return;
    }

    try {
      const response = await fetch(API + "/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Booking failed");

      e.target.reset();
      toast("Booking confirmed! Booking ID: " + result.booking_id);
    } catch (error) {
      console.error("Booking error:", error);
      toast("Booking failed. Please try again.");
    }
  };
}

const trackingForm = $("#trackingForm");

if (trackingForm) {
  trackingForm.onsubmit = async e => {
    e.preventDefault();

    const trackingResult = $("#trackingResult");
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const orderId = String(data.order_id || "").trim();
    const phone = String(data.phone || "").trim();

    if (!orderId || !phone) {
      toast("Please enter Order ID and mobile number");
      return;
    }

    if (trackingResult) {
      trackingResult.innerHTML = `<div style="padding:20px;text-align:center;"><p>Checking your order...</p></div>`;
    }

    try {
      const response = await fetch(API + "/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: Number(orderId), phone })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Order not found");
      }

      const order = result.order;
      const items = Array.isArray(order.items) ? order.items : [];

      const itemsHTML = items.length
        ? items.map(item => `
            <div class="tracking-item" style="display:flex;justify-content:space-between;gap:15px;padding:10px 0;border-bottom:1px solid #ddd;">
              <span>${escapeHTML(item.item_name || "")} × ${Number(item.quantity || 0)}</span>
              <strong>₹${Number(item.price || 0)}</strong>
            </div>
          `).join("")
        : "<p>No items found.</p>";

      if (trackingResult) {
        trackingResult.innerHTML = `
          <div class="tracking-card" style="margin-top:25px;padding:22px;border-radius:16px;background:#fff;box-shadow:0 8px 25px rgba(0,0,0,.10);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;">
              <div>
                <p style="margin:0 0 5px;opacity:.7;">Order ID</p>
                <h3 style="margin:0;">#${order.id}</h3>
              </div>
              <div style="padding:8px 14px;border-radius:30px;font-weight:700;background:#f1f1f1;">
                ${escapeHTML(order.status || "Pending")}
              </div>
            </div>
            <hr style="margin:20px 0;border:0;border-top:1px solid #eee">
            <div>
              <p><strong>Customer:</strong> ${escapeHTML(order.customer_name || "")}</p>
              <p><strong>Payment:</strong> ${escapeHTML(order.payment_method || "")}</p>
              <p><strong>Order Time:</strong> ${formatDateTime(order.created_at)}</p>
            </div>
            <h3 style="margin-top:25px;">Order Items</h3>
            <div>${itemsHTML}</div>
            <div style="display:flex;justify-content:space-between;margin-top:20px;padding-top:15px;border-top:2px solid #eee;font-size:18px;">
              <strong>Total</strong>
              <strong>₹${Number(order.total_amount || 0)}</strong>
            </div>
          </div>
        `;
      }

      toast("Order details loaded");
    } catch (error) {
      console.error("Tracking error:", error);

      if (trackingResult) {
        trackingResult.innerHTML = `
          <div style="margin-top:20px;padding:18px;border-radius:12px;background:#fff3f3;color:#b00020;">
            <strong>Order not found</strong>
            <p>${escapeHTML(error.message || "Please check your Order ID and mobile number.")}</p>
          </div>`;
      }

      toast("Order not found");
    }
  };
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(value) {
  if (!value) return "Not available";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHTML(value);

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return escapeHTML(value);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
  renderCart();
});
