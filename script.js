const menu=[
 {id:1,name:"Chicken Biryani",price:220,desc:"Aromatic rice and tender chicken."},
 {id:2,name:"Veg Biryani",price:180,desc:"Fragrant biryani with seasonal vegetables."},
 {id:3,name:"Chicken Fried Rice",price:190,desc:"Indo-Chinese style fried rice."},
 {id:4,name:"Chicken Chowmein",price:190,desc:"Stir-fried noodles with chicken."},
 {id:5,name:"Paneer Butter Masala",price:210,desc:"Creamy tomato gravy with paneer."},
 {id:6,name:"Chicken Curry",price:230,desc:"Classic homestyle chicken curry."}
];
let cart=[];
const $=s=>document.querySelector(s);
function renderMenu(list=menu){$("#menuGrid").innerHTML=list.map(x=>`<article class="card"><div class="food">🍛</div><h3>${x.name}</h3><p>${x.desc}</p><div class="card-row"><strong>₹${x.price}</strong><button class="add" onclick="add(${x.id})">Add to Cart</button></div></article>`).join("")}
function add(id){const x=cart.find(i=>i.id===id);if(x)x.qty++;else cart.push({...menu.find(i=>i.id===id),qty:1});renderCart();toast("Added to cart")}
function renderCart(){let n=cart.reduce((a,b)=>a+b.qty,0),t=cart.reduce((a,b)=>a+b.qty*b.price,0);$("#cartCount").textContent=n;$("#total").textContent=t;$("#cartItems").innerHTML=cart.length?cart.map(x=>`<div class="drawer-item"><span>${x.name}<br>₹${x.price} × ${x.qty}</span><span class="qty"><button onclick="change(${x.id},-1)">−</button> <button onclick="change(${x.id},1)">+</button></span></div>`).join(""):"<p>Your cart is empty.</p>"}
function change(id,d){const x=cart.find(i=>i.id===id);if(!x)return;x.qty+=d;if(x.qty<=0)cart=cart.filter(i=>i.id!==id);renderCart()}
function openCart(){ $("#cartPanel").classList.add("open");$("#overlay").classList.add("show")}
function closeCart(){ $("#cartPanel").classList.remove("open");$("#overlay").classList.remove("show")}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
$("#cartBtn").onclick=openCart;$("#closeCart").onclick=closeCart;$("#overlay").onclick=closeCart;
$("#search").oninput=e=>{const q=e.target.value.toLowerCase();renderMenu(menu.filter(x=>(x.name+x.desc).toLowerCase().includes(q)))};
$("#orderForm").onsubmit=e=>{e.preventDefault();if(!cart.length)return toast("Add an item first");const f=new FormData(e.target);const order={customer:f.get("name"),phone:f.get("phone"),address:f.get("address"),payment:"Cash on Delivery",items:cart};console.log("ORDER — connect this to Cloudflare Worker/D1",order);cart=[];renderCart();e.target.reset();toast("Order placed — Cash on Delivery");setTimeout(closeCart,700)};
$("#bookingForm").onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);console.log("BOOKING — connect this to backend",Object.fromEntries(f));e.target.reset();toast("Booking request submitted")};
renderMenu();renderCart();
