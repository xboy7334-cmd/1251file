const nav = document.getElementById("nav");
const toggle = document.querySelector(".menu-toggle");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
});
document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => {
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}
);

document.getElementById("year").textContent = new Date().getFullYear();


/* ================================
   D1 MENU + ORDER SYSTEM
================================ */
const API_BASE = "https://1251file.xboy7334.workers.dev";
let restaurantMenu = [];
let cart = [];

function escapeMenuHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadRestaurantMenu() {
  const grid = document.getElementById("menuGrid");
  const status = document.getElementById("menuStatus");
  if (!grid) return;

  try {
    const response = await fetch(API_BASE + "/api/menu");
    const data = await response.json();

    if (!response.ok) throw new Error(data.message || ("HTTP " + response.status));

    restaurantMenu = Array.isArray(data.menu) ? data.menu : [];

    buildMenuCategories();
    renderRestaurantMenu();
  } catch (error) {
    if (status) status.textContent = "Menu load failed: " + error.message;
  }
}

function buildMenuCategories() {
  const select = document.getElementById("menuCategory");
  if (!select) return;

  const current = select.value;
  const categories = [...new Set(
    restaurantMenu.map(item => item.category).filter(Boolean)
  )].sort();

  select.innerHTML = '<option value="">All Categories</option>' +
    categories.map(cat =>
      '<option value="' + escapeMenuHtml(cat) + '">' +
      escapeMenuHtml(cat) + '</option>'
    ).join("");

  if (categories.includes(current)) select.value = current;
}

function renderRestaurantMenu() {
  const grid = document.getElementById("menuGrid");
  const status = document.getElementById("menuStatus");
  if (!grid) return;

  const search = (document.getElementById("menuSearch")?.value || "").toLowerCase().trim();
  const category = document.getElementById("menuCategory")?.value || "";

  const filtered = restaurantMenu.filter(item => {
    const text = ((item.name || "") + " " + (item.category || "") + " " + (item.description || "")).toLowerCase();
    return (!search || text.includes(search)) &&
           (!category || item.category === category);
  });

  if (status) status.textContent = filtered.length + " menu item" + (filtered.length === 1 ? "" : "s");

  if (!filtered.length) {
    grid.innerHTML = '<div class="menu-empty">No menu item found.</div>';
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const image = item.image
      ? '<img src="' + escapeMenuHtml(item.image) + '" alt="' +
        escapeMenuHtml(item.name) +
        '" onerror="this.style.display=\'none\'">'
      : '<div class="menu-placeholder">🍽️</div>';

    return `
      <article class="menu-card">
        <div class="menu-card-image">${image}</div>
        <div class="menu-card-body">
          <span class="menu-category">${escapeMenuHtml(item.category || "Menu")}</span>
          <h3>${escapeMenuHtml(item.name)}</h3>
          <p>${escapeMenuHtml(item.description || "")}</p>
          <div class="menu-card-bottom">
            <strong>₹${Number(item.price || 0).toFixed(0)}</strong>
            <button class="menu-order-btn" type="button" data-menu-id="${item.id}">
              Order
            </button>
          </div>
        </div>
      </article>`;
  }).join("");

  grid.querySelectorAll(".menu-order-btn").forEach(button => {
    button.addEventListener("click", () => {
      addToCart(Number(button.dataset.menuId));
    });
  });
}

function addToCart(id) {
  const item = restaurantMenu.find(x => Number(x.id) === id);
  if (!item) return;

  const existing = cart.find(x => Number(x.id) === id);
  if (existing) existing.quantity += 1;
  else cart.push({
    id: Number(item.id),
    name: item.name,
    price: Number(item.price || 0),
    quantity: 1
  });

  renderCart();
  showToast("Added to cart");
}

function renderCart() {
  let panel = document.getElementById("restaurantCart");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "restaurantCart";
    panel.className = "restaurant-cart";
    document.body.appendChild(panel);
  }

  const totalQty = cart.reduce((sum, x) => sum + x.quantity, 0);
  const total = cart.reduce((sum, x) => sum + x.price * x.quantity, 0);

  panel.innerHTML = `
    <div class="cart-head">
      <strong>Your Cart (${totalQty})</strong>
      <button type="button" id="closeRestaurantCart">×</button>
    </div>
    <div class="cart-list">
      ${cart.length ? cart.map((item, i) => `
        <div class="cart-row">
          <div>
            <b>${escapeMenuHtml(item.name)}</b>
            <small>₹${item.price} × ${item.quantity}</small>
          </div>
          <div class="cart-controls">
            <button type="button" data-cart-minus="${i}">−</button>
            <b>${item.quantity}</b>
            <button type="button" data-cart-plus="${i}">+</button>
          </div>
        </div>`).join("") : '<p class="menu-empty">Your cart is empty.</p>'}
    </div>
    <div class="cart-total">Total: ₹${total.toFixed(0)}</div>
    ${cart.length ? `
      <form id="restaurantOrderForm" class="cart-form">
        <input name="customer_name" placeholder="Customer name" required>
        <input name="phone" type="tel" placeholder="Mobile number" required>
        <textarea name="address" placeholder="Delivery address" required></textarea>
        <button class="btn btn-primary" type="submit">Place Order</button>
      </form>` : ""}
  `;

  panel.classList.add("open");

  document.getElementById("closeRestaurantCart").onclick = () => panel.classList.remove("open");

  panel.querySelectorAll("[data-cart-minus]").forEach(btn => {
    btn.onclick = () => {
      const i = Number(btn.dataset.cartMinus);
      cart[i].quantity--;
      if (cart[i].quantity <= 0) cart.splice(i, 1);
      renderCart();
    };
  });

  panel.querySelectorAll("[data-cart-plus]").forEach(btn => {
    btn.onclick = () => {
      cart[Number(btn.dataset.cartPlus)].quantity++;
      renderCart();
    };
  });

  const form = document.getElementById("restaurantOrderForm");
  if (form) form.onsubmit = submitRestaurantOrder;
}

async function submitRestaurantOrder(event) {
  event.preventDefault();

  if (!cart.length) return;

  const form = event.currentTarget;
  const fd = new FormData(form);
  const total = cart.reduce((sum, x) => sum + x.price * x.quantity, 0);

  const payload = {
    customer_name: String(fd.get("customer_name") || "").trim(),
    phone: String(fd.get("phone") || "").trim(),
    address: String(fd.get("address") || "").trim(),
    total_amount: total,
    payment_method: "COD",
    items: cart.map(item => ({
      menu_item_id: item.id,
      item_name: item.name,
      quantity: item.quantity,
      price: item.price
    }))
  };

  try {
    const response = await fetch(API_BASE + "/api/orders", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || ("HTTP " + response.status));

    cart = [];
    renderCart();
    showToast("Order placed successfully");
    alert("Order placed successfully. Order ID: #" + (data.order_id || data.id || ""));
  } catch (error) {
    alert("Order failed: " + error.message);
  }
}

function showToast(message) {
  let toast = document.getElementById("restaurantToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "restaurantToast";
    toast.className = "restaurant-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

document.addEventListener("DOMContentLoaded", () => {
  loadRestaurantMenu();

  const search = document.getElementById("menuSearch");
  const category = document.getElementById("menuCategory");

  if (search) search.addEventListener("input", renderRestaurantMenu);
  if (category) category.addEventListener("change", renderRestaurantMenu);
});


/* TABLE BOOKING — D1 ONLY */
async function submitTableBooking(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const fd = new FormData(form);

  const payload = {
    customer_name: String(fd.get("name") || fd.get("customer_name") || "").trim(),
    phone: String(fd.get("phone") || "").trim(),
    booking_date: String(fd.get("date") || fd.get("booking_date") || "").trim(),
    booking_time: String(fd.get("time") || fd.get("booking_time") || "").trim(),
    guests: Number(fd.get("guests") || 1)
  };

  try {
    const response = await fetch(API_BASE + "/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || ("HTTP " + response.status));
    }

    form.reset();
    if (typeof showToast === "function") {
      showToast("Table booking received");
    }
  } catch (error) {
    alert("Booking failed: " + error.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const bookingForm = document.getElementById("bookingForm");
  if (bookingForm) {
    bookingForm.addEventListener("submit", submitTableBooking);
  }
});
