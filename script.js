const menu = [
  {
    id: 1,
    name: "Chicken Biryani",
    price: 220,
    desc: "Aromatic rice and tender chicken.",
    image: "images/chicken-biryani.jpg"
  },
  {
    id: 2,
    name: "Mutton Biryani",
    price: 280,
    desc: "Fragrant biryani with tender mutton.",
    image: "images/mutton-biryani.jpg"
  },
  {
    id: 3,
    name: "Veg Biryani",
    price: 180,
    desc: "Fragrant biryani with seasonal vegetables.",
    image: "images/veg-biryani.jpg"
  },
  {
    id: 4,
    name: "Chicken Fried Rice",
    price: 190,
    desc: "Indo-Chinese style fried rice.",
    image: "images/chicken-fried-rice.jpg"
  },
  {
    id: 5,
    name: "Chicken Chowmein",
    price: 190,
    desc: "Stir-fried noodles with chicken.",
    image: "images/chicken-chowmein.jpg"
  },
  {
    id: 6,
    name: "Paneer Butter Masala",
    price: 210,
    desc: "Creamy tomato gravy with paneer.",
    image: "images/paneer-butter-masala.jpg"
  }
];

let cart = [];

const $ = s => document.querySelector(s);

function renderMenu(list = menu) {
  $("#menuGrid").innerHTML = list.map(x => `
    <article class="card">
      <div class="food">
        <img
          src="${x.image}"
          alt="${x.name}"
          onerror="this.style.display='none'"
        >
      </div>

      <h3>${x.name}</h3>
      <p>${x.desc}</p>

      <div class="card-row">
        <strong>₹${x.price}</strong>
        <button class="add" onclick="add(${x.id})">
          Add to Cart
        </button>
      </div>
    </article>
  `).join("");
}

function add(id) {
  const x = cart.find(i => i.id === id);

  if (x) {
    x.qty++;
  } else {
    cart.push({
      ...menu.find(i => i.id === id),
      qty: 1
    });
  }

  renderCart();
  toast("Added to cart");
}

function renderCart() {
  const n = cart.reduce((a, b) => a + b.qty, 0);
  const t = cart.reduce((a, b) => a + b.qty * b.price, 0);

  $("#cartCount").textContent = n;
  $("#total").textContent = t;

  $("#cartItems").innerHTML = cart.length
    ? cart.map(x => `
        <div class="drawer-item">
          <span>
            ${x.name}<br>
            ₹${x.price} × ${x.qty}
          </span>

          <span>
            <button onclick="change(${x.id},-1)">−</button>
            <button onclick="change(${x.id},1)">+</button>
          </span>
        </div>
      `).join("")
    : "<p>Your cart is empty.</p>";
}

function change(id, d) {
  const x = cart.find(i => i.id === id);

  if (!x) return;

  x.qty += d;

  if (x.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }

  renderCart();
}

function openCart() {
  $("#cartPanel").classList.add("open");
  $("#overlay").classList.add("show");
}

function closeCart() {
  $("#cartPanel").classList.remove("open");
  $("#overlay").classList.remove("show");
}

function toast(t) {
  const e = $("#toast");

  e.textContent = t;
  e.classList.add("show");

  setTimeout(() => {
    e.classList.remove("show");
  }, 2200);
}


/* =========================
   CART EVENTS
========================= */

$("#cartBtn").onclick = openCart;
$("#closeCart").onclick = closeCart;
$("#overlay").onclick = closeCart;


/* =========================
   SEARCH
========================= */

$("#search").oninput = e => {
  const q = e.target.value.toLowerCase();

  renderMenu(
    menu.filter(x =>
      (x.name + x.desc)
        .toLowerCase()
        .includes(q)
    )
  );
};


/* =========================
   ORDER → D1 DATABASE
========================= */

$("#orderForm").onsubmit = async e => {
  e.preventDefault();

  if (!cart.length) {
    return toast("Add an item first");
  }

  const formData = new FormData(e.target);

  const data = Object.fromEntries(formData.entries());

  const totalAmount = cart.reduce(
    (total, item) => total + item.price * item.qty,
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

    total_amount: totalAmount,

    payment_method:
      data.payment_method ||
      "COD",

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
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Order failed"
      );
    }

    console.log("Order saved:", result);

    cart = [];
    renderCart();
    e.target.reset();

    toast(
      "Order placed successfully! Order ID: " +
      result.order_id
    );

    setTimeout(closeCart, 1200);

  } catch (error) {
    console.error("Order error:", error);

    toast(
      "Order failed. Please try again."
    );
  }
};


/* =========================
   BOOKING → D1 DATABASE
========================= */

$("#bookingForm").onsubmit = async e => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

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
    toast("Please fill all booking details");
    return;
  }

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bookingData)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Booking failed"
      );
    }

    console.log("Booking saved:", result);

    e.target.reset();

    toast(
      "Booking confirmed! Booking ID: " +
      result.booking_id
    );

  } catch (error) {
    console.error("Booking error:", error);

    toast(
      "Booking failed. Please try again."
    );
  }
};


/* =========================
   START
========================= */

renderMenu();
renderCart();
