/* =========================================================
   YOUR CHOICE FAMILY RESTAURANT
   Customer Website Script
   Menu + Cart + Orders + Booking + Order Tracking
   Cloudflare Worker + D1
========================================================= */

"use strict";

const API = "https://1251file.xboy7334.workers.dev";

let menu = [];
let cart = [];
let activeCategory = "all";

const $ = selector => document.querySelector(selector);

/* =========================================================
   SAFE HTML
========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   MENU LOAD
========================================================= */

async function loadMenu() {
  const menuGrid = $("#menuGrid");

  try {
    if (menuGrid) {
      menuGrid.innerHTML = `
        <div style="
          grid-column:1/-1;
          padding:30px;
          text-align:center;
        ">
          <p>Loading menu...</p>
        </div>
      `;
    }

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

    setupCategoryButtons();
    renderMenu();
    renderCart();

  } catch (error) {
    console.error("Menu loading failed:", error);

    if (menuGrid) {
      menuGrid.innerHTML = `
        <div style="
          grid-column:1/-1;
          padding:30px;
          text-align:center;
          border-radius:20px;
          background:rgba(255,255,255,.7);
        ">
          <h3>Menu loading failed</h3>
          <p>Please try again.</p>

          <button
            type="button"
            onclick="loadMenu()"
            style="
              padding:10px 18px;
              border:0;
              border-radius:20px;
              background:#d88925;
              color:#fff;
              cursor:pointer;
            "
          >
            Try Again
          </button>
        </div>
      `;
    }
  }
}

/* =========================================================
   CATEGORY
========================================================= */

function normalizeCategory(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[–—-]/g, " ")
    .replace(/[.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORY_ALIASES = {
  "biryani and mughlai": [
    "biryani and mughlai",
    "biryani mughlai",
    "biryani mughlai dish",
    "biryani and mughlai dish"
  ],

  "soups": [
    "soups",
    "soup"
  ],

  "chinese starter": [
    "chinese starter",
    "chinese starters"
  ],

  "chinese rice": [
    "chinese rice"
  ],

  "noodles": [
    "noodles",
    "noodle"
  ],

  "chinese main course": [
    "chinese main course"
  ],

  "tandoor and starter": [
    "tandoor and starter",
    "tandoor starter"
  ],

  "salad and raita": [
    "salad and raita",
    "salad raita"
  ],

  "rice and pulao": [
    "rice and pulao",
    "rice pulao"
  ],

  "roti": [
    "roti"
  ],

  "indian main course": [
    "indian main course"
  ],

  "dal": [
    "dal"
  ],

  "egg": [
    "egg"
  ],

  "chicken": [
    "chicken"
  ],

  "mutton": [
    "mutton"
  ]
};

function categoryMatches(itemCategory, selectedCategory) {
  if (selectedCategory === "all") {
    return true;
  }

  const item = normalizeCategory(itemCategory);
  const selected = normalizeCategory(selectedCategory);

  if (item === selected) {
    return true;
  }

  const aliases = CATEGORY_ALIASES[selected] || [];

  return aliases.some(
    alias => normalizeCategory(alias) === item
  );
}

function getCategoryLabel(category) {
  const key = normalizeCategory(category);

  const labels = {
    "biryani and mughlai": "Biryani & Mughlai",
    "soups": "Soups",
    "chinese starter": "Chinese Starter",
    "chinese rice": "Chinese Rice",
    "noodles": "Noodles",
    "chinese main course": "Chinese Main Course",
    "tandoor and starter": "Tandoor & Starter",
    "salad and raita": "Salad & Raita",
    "rice and pulao": "Rice & Pulao",
    "roti": "Roti",
    "indian main course": "Indian Main Course",
    "dal": "Dal",
    "egg": "Egg",
    "chicken": "Chicken",
    "mutton": "Mutton"
  };

  return labels[key] || String(category || "Other");
}

/* =========================================================
   MENU RENDER
========================================================= */

function renderMenu() {
  const menuGrid = $("#menuGrid");

  if (!menuGrid) {
    return;
  }

  const searchInput = $("#search");

  const query = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";

  let source = menu.filter(item => {
    if (!item.available) {
      return false;
    }

    const searchable = (
      item.name + " " +
      item.desc + " " +
      item.category
    ).toLowerCase();

    const matchesSearch =
      !query || searchable.includes(query);

    const matchesCategory =
      categoryMatches(
        item.category,
        activeCategory
      );

    return matchesSearch && matchesCategory;
  });

  if (!source.length) {
    menuGrid.innerHTML = `
      <div style="
        width:100%;
        padding:30px;
        text-align:center;
        border-radius:22px;
        background:rgba(255,255,255,.65);
        border:1px solid rgba(255,255,255,.75);
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
      ">
        <h3>No menu items found</h3>
        <p>Try another category or search term.</p>
      </div>
    `;

    return;
  }

  /*
    ALL category:
    Group menu items according to D1 category.
  */

  if (activeCategory === "all" && !query) {

    const groups = {};

    source.forEach(item => {

      const key =
        normalizeCategory(item.category) || "other";

      if (!groups[key]) {
        groups[key] = {
          label: getCategoryLabel(item.category),
          items: []
        };
      }

      groups[key].items.push(item);
    });

    const orderedKeys = [
      "biryani and mughlai",
      "soups",
      "chinese starter",
      "chinese rice",
      "noodles",
      "chinese main course",
      "tandoor and starter",
      "salad and raita",
      "rice and pulao",
      "roti",
      "indian main course",
      "dal",
      "egg",
      "chicken",
      "mutton"
    ];

    const keys = [
      ...orderedKeys.filter(
        key => groups[key]
      ),

      ...Object.keys(groups).filter(
        key => !orderedKeys.includes(key)
      )
    ];

    menuGrid.innerHTML = keys.map(key => {

      const group = groups[key];

      return `
        <section class="menu-category-section">

          <div class="menu-category-title">
            <span></span>

            <h3>
              ${escapeHTML(group.label)}
            </h3>

            <span></span>
          </div>

          <div class="menu-category-grid">
            ${group.items
              .map(renderMenuCard)
              .join("")}
          </div>

        </section>
      `;

    }).join("");

    return;
  }

  menuGrid.innerHTML =
    source.map(renderMenuCard).join("");
}

/* =========================================================
   MENU CARD
========================================================= */

function renderMenuCard(item) {

  const imageHTML = item.image
    ? `
      <img
        src="${escapeHTML(item.image)}"
        alt="${escapeHTML(item.name)}"
        loading="lazy"
        onerror="this.style.display='none'"
      >
    `
    : `
      <div style="
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:#8b735f;
        font-weight:700;
      ">
        Food Image
      </div>
    `;

  return `
    <article class="card">

      <div class="food">
        ${imageHTML}
      </div>

      <h3>
        ${escapeHTML(item.name)}
      </h3>

      <p>
        ${escapeHTML(item.desc)}
      </p>

      <div class="card-row">

        <strong>
          ₹${Number(item.price || 0)}
        </strong>

        <button
          class="add"
          type="button"
          onclick="add(${Number(item.id)})"
        >
          Add to Cart
        </button>

      </div>

    </article>
  `;
}

/* =========================================================
   CATEGORY BUTTONS
========================================================= */

function setupCategoryButtons() {

  const buttons =
    document.querySelectorAll(".category-btn");

  buttons.forEach(button => {

    button.onclick = () => {

      activeCategory =
        button.dataset.category || "all";

      buttons.forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      renderMenu();
    };

  });
}

/* =========================================================
   SEARCH
========================================================= */

const searchInput = $("#search");

if (searchInput) {

  searchInput.addEventListener(
    "input",
    renderMenu
  );

}

/* =========================================================
   CART
========================================================= */

function add(id) {

  const item = menu.find(
    menuItem =>
      Number(menuItem.id) === Number(id)
  );

  if (!item) {
    console.error(
      "Menu item not found:",
      id
    );

    return;
  }

  if (!item.available) {
    toast(
      "This item is currently unavailable"
    );

    return;
  }

  const existing = cart.find(
    cartItem =>
      Number(cartItem.id) === Number(id)
  );

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      ...item,
      qty: 1
    });
  }

  renderCart();

  toast("Added to cart");
}

function change(id, amount) {

  const item = cart.find(
    cartItem =>
      Number(cartItem.id) === Number(id)
  );

  if (!item) {
    return;
  }

  item.qty += amount;

  if (item.qty <= 0) {

    cart = cart.filter(
      cartItem =>
        Number(cartItem.id) !== Number(id)
    );

  }

  renderCart();
}

function renderCart() {

  const cartCount = $("#cartCount");
  const total = $("#total");
  const cartItems = $("#cartItems");

  if (!cartCount || !total || !cartItems) {
    return;
  }

  const count = cart.reduce(
    (sum, item) =>
      sum + Number(item.qty || 0),
    0
  );

  const amount = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
      Number(item.qty || 0),
    0
  );

  cartCount.textContent = count;
  total.textContent = amount;

  if (!cart.length) {

    cartItems.innerHTML = `
      <p style="
        text-align:center;
        padding:25px 0;
        color:#777;
      ">
        Your cart is empty.
      </p>
    `;

    return;
  }

  cartItems.innerHTML =
    cart.map(item => `
      <div class="drawer-item">

        <span>
          <strong>
            ${escapeHTML(item.name)}
          </strong>

          <br>

          ₹${Number(item.price || 0)}
          ×
          ${Number(item.qty || 0)}
        </span>

        <span style="
          display:flex;
          gap:5px;
          align-items:center;
        ">

          <button
            type="button"
            onclick="change(${item.id},-1)"
            style="
              width:30px;
              height:30px;
              border:0;
              border-radius:50%;
              cursor:pointer;
            "
          >
            −
          </button>

          <button
            type="button"
            onclick="change(${item.id},1)"
            style="
              width:30px;
              height:30px;
              border:0;
              border-radius:50%;
              cursor:pointer;
            "
          >
            +
          </button>

        </span>

      </div>
    `).join("");
}

/* =========================================================
   CART OPEN / CLOSE
========================================================= */

function openCart() {

  const panel = $("#cartPanel");
  const overlay = $("#overlay");

  if (panel) {
    panel.classList.add("open");
  }

  if (overlay) {
    overlay.classList.add("show");
  }
}

function closeCart() {

  const panel = $("#cartPanel");
  const overlay = $("#overlay");

  if (panel) {
    panel.classList.remove("open");
  }

  if (overlay) {
    overlay.classList.remove("show");
  }
}

const cartBtn = $("#cartBtn");
const closeCartBtn = $("#closeCart");
const overlay = $("#overlay");

if (cartBtn) {
  cartBtn.addEventListener(
    "click",
    openCart
  );
}

if (closeCartBtn) {
  closeCartBtn.addEventListener(
    "click",
    closeCart
  );
}

if (overlay) {
  overlay.addEventListener(
    "click",
    closeCart
  );
}

/* =========================================================
   TOAST
========================================================= */

function toast(message) {

  const element = $("#toast");

  if (!element) {
    return;
  }

  element.textContent = message;

  element.classList.add("show");

  clearTimeout(
    window.__toastTimer
  );

  window.__toastTimer =
    setTimeout(() => {
      element.classList.remove("show");
    }, 2200);
}

/* =========================================================
   ORDER SUCCESS
========================================================= */

function showOrderSuccess(orderId) {

  const oldBox =
    document.getElementById(
      "orderSuccess"
    );

  if (oldBox) {
    oldBox.remove();
  }

  const box =
    document.createElement("div");

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
      border-radius:22px;
      padding:28px 22px;
      text-align:center;
      box-shadow:0 15px 50px rgba(0,0,0,.3);
    ">

      <div style="
        font-size:48px;
        margin-bottom:8px;
      ">
        ✅
      </div>

      <h2 style="
        margin:0 0 8px;
      ">
        Order Confirmed
      </h2>

      <p style="
        margin:0 0 18px;
        color:#666;
      ">
        Your order has been placed successfully.
      </p>

      <div style="
        background:#f5f5f5;
        border-radius:14px;
        padding:16px;
        margin-bottom:18px;
      ">

        <div style="
          font-size:13px;
          color:#777;
        ">
          YOUR ORDER ID
        </div>

        <div style="
          font-size:30px;
          font-weight:800;
          margin:5px 0 12px;
        ">
          #${escapeHTML(orderId)}
        </div>

        <button
          id="copyOrderId"
          type="button"
          style="
            border:0;
            border-radius:10px;
            padding:10px 16px;
            font-weight:700;
            cursor:pointer;
          "
        >
          Copy Order ID
        </button>

      </div>

      <button
        id="goTrackOrder"
        type="button"
        style="
          width:100%;
          border:0;
          border-radius:12px;
          padding:13px;
          font-weight:800;
          cursor:pointer;
          margin-bottom:10px;
          background:#d88925;
          color:#fff;
        "
      >
        Track Order
      </button>

      <button
        id="closeOrderSuccess"
        type="button"
        style="
          width:100%;
          border:1px solid #ddd;
          background:#fff;
          border-radius:12px;
          padding:12px;
          cursor:pointer;
        "
      >
        Close
      </button>

      <p style="
        font-size:12px;
        color:#777;
        margin:14px 0 0;
      ">
        Please save this Order ID for tracking your order.
      </p>

    </div>
  `;

  document.body.appendChild(box);

  const copyButton =
    $("#copyOrderId");

  if (copyButton) {

    copyButton.onclick =
      async () => {

        try {

          await navigator.clipboard.writeText(
            String(orderId)
          );

          toast(
            "Order ID copied"
          );

        } catch {

          toast(
            "Order ID: " + orderId
          );

        }

      };
  }

  const trackButton =
    $("#goTrackOrder");

  if (trackButton) {

    trackButton.onclick = () => {

      box.remove();

      closeCart();

      const tracking =
        $("#tracking");

      if (tracking) {

        tracking.scrollIntoView({
          behavior: "smooth"
        });

      }

      setTimeout(() => {

        const input =
          $("#trackingForm")
            ?.querySelector(
              '[name="order_id"]'
            );

        if (input) {
          input.focus();
        }

      }, 500);
    };
  }

  const closeButton =
    $("#closeOrderSuccess");

  if (closeButton) {

    closeButton.onclick = () => {
      box.remove();
    };

  }
}

/* =========================================================
   ORDER FORM
========================================================= */

const orderForm = $("#orderForm");

if (orderForm) {

  orderForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      if (!cart.length) {

        toast(
          "Add an item first"
        );

        return;
      }

      const formData =
        new FormData(
          orderForm
        );

      const data =
        Object.fromEntries(
          formData.entries()
        );

      const totalAmount =
        cart.reduce(
          (total, item) =>
            total +
            Number(item.price || 0) *
            Number(item.qty || 0),
          0
        );

      const orderData = {

        customer_name:
          data.name ||
          data.customer_name ||
          "",

        phone:
          data.phone ||
          "",

        address:
          data.address ||
          "",

        total_amount:
          totalAmount,

        payment_method:
          data.payment ||
          "Cash on Delivery",

        items:
          cart.map(item => ({
            menu_item_id:
              Number(item.id),

            item_name:
              item.name,

            quantity:
              Number(item.qty),

            price:
              Number(item.price)
          }))
      };

      if (
        !orderData.customer_name ||
        !orderData.phone ||
        !orderData.address
      ) {

        toast(
          "Please fill all order details"
        );

        return;
      }

      try {

        const response =
          await fetch(
            API + "/api/orders",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  orderData
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
            "Order failed"
          );
        }

        const orderId =
          result.order_id;

        cart = [];

        renderCart();

        orderForm.reset();

        closeCart();

        showOrderSuccess(
          orderId
        );

      } catch (error) {

        console.error(
          "Order error:",
          error
        );

        toast(
          error.message ||
          "Order failed. Please try again."
        );
      }
    }
  );
}

/* =========================================================
   BOOKING
========================================================= */

const bookingForm =
  $("#bookingForm");

if (bookingForm) {

  bookingForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const formData =
        new FormData(
          bookingForm
        );

      const data =
        Object.fromEntries(
          formData.entries()
        );

      const bookingData = {

        customer_name:
          data.name ||
          "",

        phone:
          data.phone ||
          "",

        booking_date:
          data.date ||
          "",

        booking_time:
          data.time ||
          "",

        guests:
          Number(
            data.guests || 1
          )
      };

      if (
        !bookingData.customer_name ||
        !bookingData.phone ||
        !bookingData.booking_date ||
        !bookingData.booking_time
      ) {

        toast(
          "Please fill all booking details"
        );

        return;
      }

      if (
        bookingData.guests < 1 ||
        bookingData.guests > 10
      ) {

        toast(
          "Guests must be between 1 and 10"
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

        bookingForm.reset();

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
          error.message ||
          "Booking failed. Please try again."
        );
      }
    }
  );
}

/* =========================================================
   ORDER TRACKING
========================================================= */

const trackingForm =
  $("#trackingForm");

if (trackingForm) {

  trackingForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const trackingResult =
        $("#trackingResult");

      const formData =
        new FormData(
          trackingForm
        );

      const data =
        Object.fromEntries(
          formData.entries()
        );

      const orderId =
        String(
          data.order_id || ""
        ).trim();

      const phone =
        String(
          data.phone || ""
        ).trim();

      if (!orderId || !phone) {

        toast(
          "Please enter Order ID and mobile number"
        );

        return;
      }

      if (trackingResult) {

        trackingResult.innerHTML = `
          <div style="
            padding:20px;
            text-align:center;
          ">
            <p>
              Checking your order...
            </p>
          </div>
        `;
      }

      try {

        const response =
          await fetch(
            API + "/api/track-order",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  order_id:
                    Number(orderId),

                  phone:
                    phone
                })
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
            "Order not found"
          );
        }

        const order =
          result.order || {};

        const items =
          Array.isArray(order.items)
            ? order.items
            : [];

        const itemsHTML =
          items.length
            ? items.map(item => `
                <div
                  class="tracking-item"
                  style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                    padding:10px 0;
                    border-bottom:1px solid #ddd;
                  "
                >

                  <span>
                    ${escapeHTML(
                      item.item_name || ""
                    )}
                    ×
                    ${Number(
                      item.quantity || 0
                    )}
                  </span>

                  <strong>
                    ₹${Number(
                      item.price || 0
                    )}
                  </strong>

                </div>
              `).join("")
            : `
              <p>
                No items found.
              </p>
            `;

        const status =
          order.status ||
          "Pending";

        if (trackingResult) {

          trackingResult.innerHTML = `
            <div class="tracking-card">

              <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:15px;
                flex-wrap:wrap;
              ">

                <div>

                  <p style="
                    margin:0 0 5px;
                    opacity:.7;
                  ">
                    Order ID
                  </p>

                  <h3 style="
                    margin:0;
                  ">
                    #${escapeHTML(
                      order.id ||
                      orderId
                    )}
                  </h3>

                </div>

                <div
                  class="
                    tracking-status
                    ${getStatusClass(status)}
                  "
                >
                  ${escapeHTML(status)}
                </div>

              </div>

              <hr style="
                margin:20px 0;
                border:0;
                border-top:1px solid #ddd;
              ">

              <p>
                <strong>
                  Customer:
                </strong>
                ${escapeHTML(
                  order.customer_name ||
                  order.name ||
                  ""
                )}
              </p>

              <p>
                <strong>
                  Phone:
                </strong>
                ${escapeHTML(
                  order.phone ||
                  phone
                )}
              </p>

              <p>
                <strong>
                  Payment:
                </strong>
                ${escapeHTML(
                  order.payment_method ||
                  order.payment ||
                  "Cash on Delivery"
                )}
              </p>

              <p>
                <strong>
                  Order Time:
                </strong>
                ${formatDateTime(
                  order.created_at
                )}
              </p>

              <h3>
                Order Items
              </h3>

              <div>
                ${itemsHTML}
              </div>

              <div style="
                margin-top:18px;
                padding-top:15px;
                border-top:1px solid #ddd;
                display:flex;
                justify-content:space-between;
                font-size:18px;
                font-weight:800;
              ">

                <span>
                  Total
                </span>

                <span>
                  ₹${Number(
                    order.total_amount || 0
                  )}
                </span>

              </div>

            </div>
          `;
        }

      } catch (error) {

        console.error(
          "Tracking error:",
          error
        );

        if (trackingResult) {

          trackingResult.innerHTML = `
            <div style="
              padding:20px;
              border-radius:16px;
              background:#fff0f0;
              color:#842029;
            ">
              <strong>
                Order not found
              </strong>

              <p style="
                margin-bottom:0;
              ">
                Please check your Order ID
                and mobile number.
              </p>
            </div>
          `;
        }
      }
    }
  );
}

/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

  const value =
    String(status || "")
      .toLowerCase()
      .trim();

  switch (value) {

    case "confirmed":
      return "status-confirmed";

    case "preparing":
      return "status-preparing";

    case "delivered":
      return "status-delivered";

    case "cancelled":
      return "status-cancelled";

    case "pending":
    default:
      return "status-pending";
  }
}

/* =========================================================
   DATE / TIME
========================================================= */

function formatDateTime(value) {

  if (!value) {
    return "—";
  }

  try {

    const date =
      new Date(value);

    if (Number.isNaN(
      date.getTime()
    )) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata"
      }
    ).format(date);

  } catch {

    return String(value);
  }
}

/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadMenu();

  }
);
