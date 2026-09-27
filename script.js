const nav = document.getElementById("nav");
const toggle = document.querySelector(".menu-toggle");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
});
document.querySelectorAll(".nav a").forEach(a => a.addEventListener("click", () => {
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}));

const dateInput = document.getElementById("date");
const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
dateInput.min = localToday;

document.getElementById("bookingForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const guests = document.getElementById("guests").value;
  const note = document.getElementById("note").value.trim();

  if (!/^[0-9]{10}$/.test(phone)) {
    alert("Please enter a valid 10-digit mobile number.");
    return;
  }

  const dateObj = new Date(date + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });

  const message =
`🍽️ *New Table Booking Request*
*Your Choice Family Restaurant*

👤 Name: ${name}
📱 Customer Mobile: ${phone}
📅 Date: ${formattedDate}
🕐 Time: ${time}
👥 Guests: ${guests}
${note ? `📝 Special Request: ${note}` : ""}

📍 HPL Link Rd, Manjushree, Durgachak, Haldia
⚠️ Please confirm the table booking.`;

  const whatsappUrl = "https://wa.me/917364989504?text=" + encodeURIComponent(message);
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

document.getElementById("year").textContent = new Date().getFullYear();
