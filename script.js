/* =========================================================
   YOUR CHOICE FAMILY RESTAURANT
   Website Script
   Menu is loaded from Cloudflare D1 API
========================================================= */

"use strict";

/* =========================
   API
========================= */

const API = "https://1251file.xboy7334.workers.dev";

let menu = [];
let cart = [];


/* =========================
   HELPERS
========================= */

const $ = s => document.querySelector(s);


/* =========================
   LOAD MENU FROM D1
========================= */

async function loadMenu() {
  try {
    const response = await fetch(API + "/api/menu", {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Menu API Error: HTTP " + response.status);
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.menu)) {
      throw new Error("Invalid menu data received");
    }

    menu = data.menu.map(item => ({
      id: Number(item.id),
      name: item.name || "",
      price: Number(item.price || 0),
      desc: item.description || item.desc || "",
      image: item.image || "",
      category: item.category || "",
      available: Number(item.available) === 1
    }));

    console.log("Menu loaded from D1:", menu);

    renderMenu();
    renderCart();

  } catch (error) {

    console.error("Menu loading failed:", error);

    const menuGrid = $("#menuGrid");

    if (menuGrid) {
      menuGrid.innerHTML = `
        <div style="padding:20px;text-align:center;">
          <p>Menu loading failed.</p>
          <button onclick="loadMenu()">
            Try Again
          </button>
        </div>
      `;
    }
  }
}


/* =========================
   RENDER MENU
========================= */

function renderMenu(list = menu) {

  const menuGrid = $("#menuGrid");

  if (!menuGrid) return;

  menuGrid.innerHTML = list.map(x => `
    <article class="card">

      <div class="food">

        ${
          x.image
            ? `
              <img
                src="${x.image}"
                alt="${x.name}"
                loading="lazy"
                onerror="this.style.display='none'"
              >
            `
            : ""
        }

      </div>

      <h3>${x.name}</h3>

      <p>${x.desc}</p>

      <div class="card-row">

        <strong>₹${x.price}</strong>

        <button
          class="add"
          onclick="add(${x.id})"
        >
          Add to Cart
        </button>

      </div>

    </article>
  `).join("");
}


/* =========================
   ADD TO CART
========================= */

function add(id) {

  const item = menu.find(i => Number(i.id) === Number(id));

  if (!item) {
    console.error("Menu item not found:", id);
    return;
  }

  const x = cart.find(i => Number(i.id) === Number(id));

  if (x) {

    x.qty++;

  } else {

    cart.push({
      ...item,
      qty: 1
    });

  }

  renderCart();

  toast("Added to cart");
}


/* =========================
   RENDER CART
========================= */

function renderCart() {

  const cartCount = $("#cartCount");
  const total = $("#total");
  const cartItems = $("#cartItems");

  if (!cartCount || !total || !cartItems) return;

  const n = cart.reduce(
    (a, b) => a + b.qty,
    0
  );

  const t = cart.reduce(
    (a, b) => a + b.qty * b.price,
    0
  );

  cartCount.textContent = n;

  total.textContent = t;

  cartItems.innerHTML = cart.length

    ? cart.map(x => `
        <div class="drawer-item">

          <span>
            ${x.name}<br>
            ₹${x.price} × ${x.qty}
          </span>

          <span>

            <button
              onclick="change(${x.id},-1)"
            >
              −
            </button>

            <button
              onclick="change(${x.id},1)"
            >
              +
            </button>

          </span>

        </div>
      `).join("")

    : "<p>Your cart is empty.</p>";
}


/* =========================
   CHANGE CART QUANTITY
========================= */

function change(id, d) {

  const x = cart.find(
    i => Number(i.id) === Number(id)
  );

  if (!x) return;

  x.qty += d;

  if (x.qty <= 0) {

    cart = cart.filter(
      i => Number(i.id) !== Number(id)
    );

  }

  renderCart();
}


/* =========================
   OPEN CART
========================= */

function openCart() {

  const cartPanel = $("#cartPanel");
  const overlay = $("#overlay");

  if (cartPanel) {
    cartPanel.classList.add("open");
  }

  if (overlay) {
    overlay.classList.add("show");
  }
}


/* =========================
   CLOSE CART
========================= */

function closeCart() {

  const cartPanel = $("#cartPanel");
  const overlay = $("#overlay");

  if (cartPanel) {
    cartPanel.classList.remove("open");
  }

  if (overlay) {
    overlay.classList.remove("show");
  }
}


/* =========================
   TOAST
========================= */

function toast(t) {

  const e = $("#toast");

  if (!e) return;

  e.textContent = t;

  e.classList.add("show");

  setTimeout(() => {
    e.classList.remove("show");
  }, 2200);
}


/* =========================
   CART EVENTS
========================= */

const cartBtn = $("#cartBtn");
const closeCartBtn = $("#closeCart");
const overlay = $("#overlay");

if (cartBtn) {
  cartBtn.onclick = openCart;
}

if (closeCartBtn) {
  closeCartBtn.onclick = closeCart;
}

if (overlay) {
  overlay.onclick = closeCart;
}


/* =========================
   SEARCH
========================= */

const search = $("#search");

if (search) {

  search.oninput = e => {

    const q = e.target.value
      .toLowerCase()
      .trim();

    renderMenu(
      menu.filter(x =>
        (
          x.name +
          " " +
          x.desc +
          " " +
          x.category
        )
        .toLowerCase()
        .includes(q)
      )
    );

  };

}


/* =========================
   ORDER → D1 DATABASE
========================= */

const orderForm = $("#orderForm");

if (orderForm) {

  orderForm.onsubmit = async e => {

    e.preventDefault();

    if (!cart.length) {
      return toast("Add an item first");
    }

    const formData = new FormData(e.target);

    const data = Object.fromEntries(
      formData.entries()
    );

    const totalAmount = cart.reduce(
      (total, item) =>
        total + item.price * item.qty,
      0
    );

    const orderData = {

      customer_name:
        data.customer_name ||
        data.name ||
        data.customerName ||
        "",

      phone:
        data.phone ||
        data.mobile ||
        data.mobile_number ||
        "",

      address:
        data.address ||
        "",

      total_amount:
        totalAmount,

      payment_method:
        data.payment_method ||
        "COD",

      items:
        cart.map(item => ({
          menu_item_id: item.id,
          item_name: item.name,
          quantity: item.qty,
          price: item.price
        }))

    };


    if (
      !orderData.customer_name ||
      !orderData.phone
    ) {

      toast(
        "Please enter name and phone"
      );

      return;
    }


    try {

      const response = await fetch(
        API + "/api/orders",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(orderData)
        }
      );


      const result =
        await response.json();


      if (
        !response.ok ||
        !result.success
      ) {

        throw new Error(
          result.message ||
          "Order failed"
        );

      }


      console.log(
        "Order saved:",
        result
      );


      cart = [];

      renderCart();

      e.target.reset();


      toast(
        "Order placed successfully! Order ID: " +
        result.order_id
      );


      setTimeout(
        closeCart,
        1200
      );


    } catch (error) {

      console.error(
        "Order error:",
        error
      );

      toast(
        "Order failed. Please try again."
      );

    }

  };

}


/* =========================
   TABLE BOOKING → D1
========================= */

const bookingForm = $("#bookingForm");

if (bookingForm) {

  bookingForm.onsubmit = async e => {

    e.preventDefault();

    const formData =
      new FormData(e.target);

    const data =
      Object.fromEntries(
        formData.entries()
      );


    const bookingData = {

      customer_name:
        data.customer_name ||
        data.name ||
        data.customerName ||
        "",

      phone:
        data.phone ||
        data.mobile ||
        data.mobile_number ||
        "",

      booking_date:
        data.booking_date ||
        data.date ||
        "",

      booking_time:
        data.booking_time ||
        data.time ||
        "",

      guests:
        Number(
          data.guests ||
          data.guest ||
          1
        )

    };


    if (
      !bookingData.customer_name ||
      !bookingData.phone ||
      !bookingData.booking_date ||
      !bookingData.booking_time ||
      !bookingData.guests
    ) {

      toast(
        "Please fill all booking details"
      );

      return;
    }


    try {

      const response =
        await fetch(
          API + "/api/bookings",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify(
                bookingData
              )
          }
        );


      const result =
        await response.json();


      if (
        !response.ok ||
        !result.success
      ) {

        throw new Error(
          result.message ||
          "Booking failed"
        );

      }


      console.log(
        "Booking saved:",
        result
      );


      e.target.reset();


      toast(
        "Booking confirmed! Booking ID: " +
        result.booking_id
      );


    } catch (error) {

      console.error(
        "Booking error:",
        error
      );

      toast(
        "Booking failed. Please try again."
      );

    }

  };

}


/* =========================
   START WEBSITE
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadMenu();

    renderCart();

  }
);
