const menu=[
{id:1,name:"Chicken Biryani",price:220,desc:"Aromatic rice and tender chicken.",image:"images/chicken-biryani.jpg"},
{id:2,name:"Mutton Biryani",price:280,desc:"Fragrant biryani with tender mutton.",image:"images/mutton-biryani.jpg"},
{id:3,name:"Veg Biryani",price:180,desc:"Fragrant biryani with seasonal vegetables.",image:"images/veg-biryani.jpg"},
{id:4,name:"Chicken Fried Rice",price:190,desc:"Indo-Chinese style fried rice.",image:"images/chicken-fried-rice.jpg"},
{id:5,name:"Chicken Chowmein",price:190,desc:"Stir-fried noodles with chicken.",image:"images/chicken-chowmein.jpg"},
{id:6,name:"Paneer Butter Masala",price:210,desc:"Creamy tomato gravy with paneer.",image:"images/paneer-butter-masala.jpg"}
];
let cart=[];const $=s=>document.querySelector(s);
function renderMenu(list=menu){$("#menuGrid").innerHTML=list.map(x=>`<article class="card"><div class="food"><img src="${x.image}" alt="${x.name}" onerror="this.style.display='none'"></div><h3>${x.name}</h3><p>${x.desc}</p><div class="card-row"><strong>₹${x.price}</strong><button class="add" onclick="add(${x.id})">Add to Cart</button></div></article>`).join("")}
function add(id){const x=cart.find(i=>i.id===id);if(x)x.qty++;else cart.push({...menu.find(i=>i.id===id),qty:1});renderCart();toast("Added to cart")}
function renderCart(){let n=cart.reduce((a,b)=>a+b.qty,0),t=cart.reduce((a,b)=>a+b.qty*b.price,0);$("#cartCount").textContent=n;$("#total").textContent=t;$("#cartItems").innerHTML=cart.length?cart.map(x=>`<div class="drawer-item"><span>${x.name}<br>₹${x.price} × ${x.qty}</span><span><button onclick="change(${x.id},-1)">−</button> <button onclick="change(${x.id},1)">+</button></span></div>`).join(""):"<p>Your cart is empty.</p>"}
function change(id,d){const x=cart.find(i=>i.id===id);if(!x)return;x.qty+=d;if(x.qty<=0)cart=cart.filter(i=>i.id!==id);renderCart()}
function openCart(){$("#cartPanel").classList.add("open");$("#overlay").classList.add("show")}function closeCart(){$("#cartPanel").classList.remove("open");$("#overlay").classList.remove("show")}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
$("#cartBtn").onclick=openCart;$("#closeCart").onclick=closeCart;$("#overlay").onclick=closeCart;
$("#search").oninput=e=>{const q=e.target.value.toLowerCase();renderMenu(menu.filter(x=>(x.name+x.desc).toLowerCase().includes(q)))};
$("#orderForm").onsubmit=e=>{e.preventDefault();if(!cart.length)return toast("Add an item first");console.log("Order:",Object.fromEntries(new FormData(e.target)),cart);cart=[];renderCart();e.target.reset();toast("Order placed — Cash on Delivery");setTimeout(closeCart,700)};
$("#bookingForm").onsubmit=e=>{e.preventDefault();console.log("Booking:",Object.fromEntries(new FormData(e.target)));e.target.reset();toast("Booking request submitted")};
renderMenu();renderCart();