const KEY = "jajanku-v1";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rp = (n) => (n < 0 ? "−" : "") + "Rp" + Math.abs(Math.round(n)).toLocaleString("id-ID");
const num = (s) => Number(String(s).replace(/\D/g, "")) || 0;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const fmtDate = (t) => new Date(t).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const DAY = 864e5;
const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const LOW = 5;

const seed = () => ({
  shop: { name: "Jajan Mas Adam Ganteng", type: "Jajanan pasar & minuman", owner: "Mas Adam Ganteng" },
  products: [
    ["Keripik Singkong", "Snack kemasan", 4000, 6000, 30], ["Cilok Bumbu Kacang", "Gorengan", 3000, 5000, 25],
    ["Risoles Ayam", "Gorengan", 2000, 3500, 20], ["Pisang Coklat", "Gorengan", 1500, 3000, 18],
    ["Donat Gula", "Kue basah", 1500, 3000, 4], ["Kue Lapis", "Kue basah", 1000, 2000, 24],
    ["Es Teh Manis", "Minuman", 1200, 4000, 40], ["Es Jeruk", "Minuman", 2000, 5000, 3],
  ].map(([name, cat, buy, sell, stock], i) => ({ id: "p" + i, name, cat, buy, sell, stock })),
  sales: [], expenses: [], debts: [],
});
let S = load();
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast("Penyimpanan browser tidak tersedia"); } }
let toastT;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200); }

/* Navigasi */
function go(v) {
  $$(".view").forEach((s) => s.classList.toggle("on", s.id === "v-" + v));
  $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
  window.scrollTo(0, 0);
}
$("#nav").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(b.dataset.view); });

/* Input rupiah dengan titik ribuan */
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("money")) { const n = num(e.target.value); e.target.value = n ? n.toLocaleString("id-ID") : ""; }
});
$$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) d.close(); }));

/* ===== BERANDA ===== */
function renderHome() {
  const now = Date.now(), t0 = dayStart(now);
  const today = S.sales.filter((s) => s.ts >= t0);
  const sales = sum(today, "total"), profit = sum(today, "profit");
  const exp = sum(S.expenses.filter((x) => x.ts >= t0), "amt");
  const h = new Date().getHours();
  $("#greet").textContent = `Selamat ${h < 11 ? "pagi" : h < 15 ? "siang" : h < 18 ? "sore" : "malam"}, ${S.shop.owner || "Juragan"}! 👋`;
  $("#d-sales").textContent = rp(sales);
  $("#d-count").textContent = `${today.length} transaksi`;
  $("#d-profit").textContent = rp(profit - exp);
  const low = S.products.filter((p) => p.stock <= LOW);
  $("#d-low").textContent = low.length + " produk";
  const owed = S.debts.filter((d) => d.type === "piutang" && !d.paid);
  $("#d-debt").textContent = rp(sum(owed, "amt"));

  const days = [...Array(7)].map((_, i) => { const s = t0 - (6 - i) * DAY; return { s, v: sum(S.sales.filter((x) => x.ts >= s && x.ts < s + DAY), "total") }; });
  const max = Math.max(1, ...days.map((d) => d.v));
  $("#chart").innerHTML = days.map((d, i) => `<div class="bar ${i === 6 ? "today" : ""}"><b>${d.v ? Math.round(d.v / 1000) + "rb" : ""}</b><i style="height:${(d.v / max) * 80}%"></i><span>${new Date(d.s).toLocaleDateString("id-ID", { weekday: "short" })}</span></div>`).join("");

  const agg = {};
  S.sales.filter((s) => s.ts >= t0 - 6 * DAY).forEach((s) => s.items.forEach((i) => (agg[i.name] = (agg[i.name] || 0) + i.qty)));
  const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 3);
  $("#best").innerHTML = top.length ? top.map(([n, q]) => `<li>${esc(n)} <small>· ${q} terjual</small></li>`).join("") : "<li><small>Belum ada penjualan minggu ini.</small></li>";

  const late = S.debts.filter((d) => !d.paid && d.due && new Date(d.due) < t0);
  const al = low.map((p) => `<li>${esc(p.name)} tinggal ${p.stock}</li>`).concat(late.map((d) => `<li>Jatuh tempo lewat: ${esc(d.name)} (${rp(d.amt)})</li>`));
  $("#alerts").innerHTML = al.join("") || '<li class="good">Semua aman 👍</li>';

  $("#recent").innerHTML = S.sales.slice(-5).reverse().map((s) => `<tr><td>${s.id}</td><td>${fmtDate(s.ts)}</td><td>${s.items.reduce((a, i) => a + i.qty, 0)}</td><td class="r">${rp(s.total)}</td></tr>`).join("") || '<tr><td class="empty" colspan="4">Belum ada transaksi. Mulai dari menu Kasir.</td></tr>';
}
const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);

/* ===== PRODUK ===== */
function renderProducts() {
  const q = $("#pSearch").value.toLowerCase(), f = $("#pFilter").value;
  const rows = S.products.filter((p) => p.name.toLowerCase().includes(q) && (f === "all" || p.stock <= LOW));
  $("#pBody").innerHTML = rows.map((p) => {
    const st = p.stock === 0 ? ["out", "Habis"] : p.stock <= LOW ? ["low", "Menipis"] : ["ok", "Aman"];
    return `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.cat)}</td><td class="r">${rp(p.buy)}</td><td class="r">${rp(p.sell)}</td>
      <td class="r">${p.stock} <span class="tag ${st[0]}">${st[1]}</span></td>
      <td><button class="btn ghost sm" data-a="restock" data-id="${p.id}">+ Stok</button> <button class="btn ghost sm" data-a="edit" data-id="${p.id}">Ubah</button> <button class="btn ghost sm" data-a="del" data-id="${p.id}">Hapus</button></td></tr>`;
  }).join("") || '<tr><td class="empty" colspan="6">Tidak ada produk.</td></tr>';
}
$("#pSearch").oninput = $("#pFilter").onchange = renderProducts;
let editId = null;
function openProduct(p) {
  editId = p ? p.id : null;
  $("#pTitle").textContent = p ? "Ubah produk" : "Tambah produk";
  $("#p-name").value = p?.name || ""; $("#p-cat").value = p?.cat || "Gorengan"; $("#p-stock").value = p?.stock ?? 0;
  $("#p-buy").value = p ? p.buy.toLocaleString("id-ID") : ""; $("#p-sell").value = p ? p.sell.toLocaleString("id-ID") : "";
  $("#dlgProduct").showModal();
}
$("#addProduct").onclick = () => openProduct();
$("#pForm").onsubmit = (e) => {
  e.preventDefault();
  const d = { name: $("#p-name").value.trim(), cat: $("#p-cat").value, stock: Math.max(0, Math.floor(+$("#p-stock").value) || 0), buy: num($("#p-buy").value), sell: num($("#p-sell").value) };
  if (d.sell < d.buy && !confirm("Harga jual lebih rendah dari modal. Tetap simpan?")) return;
  if (editId) Object.assign(S.products.find((p) => p.id === editId), d); else S.products.push({ id: uid("p"), ...d });
  $("#dlgProduct").close(); commit("Produk disimpan");
};
$("#pBody").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const p = S.products.find((x) => x.id === b.dataset.id);
  if (b.dataset.a === "edit") openProduct(p);
  if (b.dataset.a === "restock") { const n = Math.floor(+prompt(`Tambah stok ${p.name} berapa?`, "10")); if (n > 0) { p.stock += n; commit("Stok ditambah"); } }
  if (b.dataset.a === "del" && confirm(`Hapus ${p.name}?`)) { S.products = S.products.filter((x) => x !== p); delete cart[p.id]; commit("Produk dihapus"); }
});

/* ===== KASIR ===== */
let cart = {};
function renderPos() {
  const q = $("#kSearch").value.toLowerCase();
  $("#kItems").innerHTML = S.products.filter((p) => p.name.toLowerCase().includes(q)).map((p) =>
    `<button class="item" data-id="${p.id}" ${p.stock <= 0 ? "disabled" : ""}><b>${esc(p.name)}</b>${rp(p.sell)}<br><small>${p.stock <= 0 ? "Habis" : "Stok " + p.stock}</small></button>`).join("") || '<p class="hint">Produk tidak ditemukan.</p>';
  const lines = Object.entries(cart).map(([id, qty]) => ({ p: S.products.find((x) => x.id === id), qty })).filter((l) => l.p);
  $("#cartList").innerHTML = lines.map(({ p, qty }) => `<div class="line"><div class="n">${esc(p.name)}<small>${rp(p.sell)} × ${qty}</small></div>
    <div class="qty"><button data-m="-" data-id="${p.id}" aria-label="Kurangi">−</button>${qty}<button data-m="+" data-id="${p.id}" aria-label="Tambah">+</button></div>
    <b>${rp(p.sell * qty)}</b></div>`).join("") || '<div class="empty-cart">Keranjang masih kosong.<br>Pilih jajan di sebelah kiri.</div>';
  const sub = lines.reduce((a, l) => a + l.p.sell * l.qty, 0);
  const disc = Math.min(num($("#c-disc").value), sub), total = sub - disc, paid = num($("#c-paid").value);
  $("#cartCount").textContent = lines.reduce((a, l) => a + l.qty, 0) + " item";
  $("#c-sub").textContent = rp(sub); $("#c-total").textContent = rp(total);
  $("#c-change").textContent = rp(Math.max(0, paid - total));
  return { lines, sub, disc, total, paid };
}
$("#kSearch").oninput = renderPos;
["#c-disc", "#c-paid"].forEach((s) => $(s).addEventListener("input", renderPos));
$("#kItems").addEventListener("click", (e) => {
  const b = e.target.closest(".item"); if (!b) return;
  const p = S.products.find((x) => x.id === b.dataset.id);
  if ((cart[p.id] || 0) >= p.stock) return toast("Stok " + p.name + " tidak cukup");
  cart[p.id] = (cart[p.id] || 0) + 1; renderPos();
});
$("#cartList").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const p = S.products.find((x) => x.id === b.dataset.id);
  if (b.dataset.m === "+") { if (cart[p.id] >= p.stock) return toast("Stok tidak cukup"); cart[p.id]++; }
  else if (--cart[p.id] <= 0) delete cart[p.id];
  renderPos();
});
function clearCart() { cart = {}; $("#c-disc").value = $("#c-paid").value = ""; renderPos(); }
$("#clearCart").onclick = clearCart;
$("#saveSale").onclick = () => {
  const { lines, disc, total, paid } = renderPos();
  if (!lines.length) return toast("Keranjang masih kosong");
  if (paid && paid < total) return toast("Uang diterima kurang " + rp(total - paid));
  const cost = lines.reduce((a, l) => a + l.p.buy * l.qty, 0);
  S.sales.push({ id: "TRX" + String(S.sales.length + 1).padStart(4, "0"), ts: Date.now(),
    items: lines.map((l) => ({ name: l.p.name, qty: l.qty, buy: l.p.buy, sell: l.p.sell })), discount: disc, total, profit: total - cost });
  lines.forEach((l) => (l.p.stock -= l.qty));
  const change = paid ? paid - total : 0;
  cart = {}; $("#c-disc").value = $("#c-paid").value = "";
  commit(change ? `Tersimpan. Kembalian ${rp(change)}` : "Transaksi tersimpan");
};

/* ===== LAPORAN ===== */
function renderReport() {
  const d = +$("#rPeriod").value, from = d ? dayStart(Date.now()) - (d - 1) * DAY : 0;
  const sales = S.sales.filter((s) => s.ts >= from), exp = S.expenses.filter((x) => x.ts >= from);
  const total = sum(sales, "total"), gross = sum(sales, "profit"), ex = sum(exp, "amt");
  $("#r-sales").textContent = rp(total); $("#r-cost").textContent = rp(total - gross);
  $("#r-gross").textContent = rp(gross); $("#r-exp").textContent = rp(ex); $("#r-net").textContent = rp(gross - ex);
  $("#rBody").innerHTML = sales.slice().reverse().map((s) => `<tr><td>${s.id}</td><td>${fmtDate(s.ts)}</td><td>${esc(s.items.map((i) => i.qty + "× " + i.name).join(", "))}</td><td class="r">${rp(s.total)}</td><td class="r">${rp(s.profit)}</td></tr>`).join("") || '<tr><td class="empty" colspan="5">Belum ada transaksi pada periode ini.</td></tr>';
  $("#expList").innerHTML = exp.slice().reverse().map((x) => `<li><span>${esc(x.name)} <small>${fmtDate(x.ts)}</small></span><b>${rp(x.amt)}</b></li>`).join("") || '<li><small>Belum ada pengeluaran.</small></li>';
}
$("#rPeriod").onchange = renderReport;
$("#expForm").onsubmit = (e) => {
  e.preventDefault();
  const amt = num($("#e-amt").value); if (!amt) return toast("Isi jumlah pengeluaran");
  S.expenses.push({ id: uid("e"), name: $("#e-name").value.trim(), amt, ts: Date.now() });
  e.target.reset(); commit("Pengeluaran dicatat");
};
const download = (name, text, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
$("#csv").onclick = () => {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["ID", "Waktu", "Rincian", "Total", "Laba"], ...S.sales.map((s) => [s.id, new Date(s.ts).toLocaleString("id-ID"), s.items.map((i) => i.qty + "x " + i.name).join("; "), s.total, s.profit])];
  download("laporan-jajanku.csv", rows.map((r) => r.map(q).join(",")).join("\n"), "text/csv");
};

/* ===== UTANG ===== */
function renderDebts() {
  $("#u-in").textContent = rp(sum(S.debts.filter((d) => d.type === "piutang" && !d.paid), "amt"));
  $("#u-out").textContent = rp(sum(S.debts.filter((d) => d.type === "utang" && !d.paid), "amt"));
  $("#uBody").innerHTML = S.debts.slice().reverse().map((d) => `<tr><td><b>${esc(d.name)}</b></td><td>${d.type === "piutang" ? "Piutang" : "Utang"}</td>
    <td>${d.due ? new Date(d.due).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}</td><td class="r">${rp(d.amt)}</td>
    <td><span class="tag ${d.paid ? "ok" : "low"}">${d.paid ? "Lunas" : "Belum lunas"}</span></td>
    <td>${d.paid ? "" : `<button class="btn ghost sm" data-a="paid" data-id="${d.id}">Tandai lunas</button> `}<button class="btn ghost sm" data-a="del" data-id="${d.id}">Hapus</button></td></tr>`).join("") || '<tr><td class="empty" colspan="6">Belum ada catatan.</td></tr>';
}
$("#addDebt").onclick = () => { $("#dForm").reset(); $("#dlgDebt").showModal(); };
$("#dForm").onsubmit = (e) => {
  e.preventDefault();
  const amt = num($("#d-amt").value); if (!amt) return toast("Isi jumlah");
  S.debts.push({ id: uid("d"), name: $("#d-name").value.trim(), type: $("#d-type").value, amt, due: $("#d-due").value, paid: false });
  $("#dlgDebt").close(); commit("Catatan disimpan");
};
$("#uBody").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const d = S.debts.find((x) => x.id === b.dataset.id);
  if (b.dataset.a === "paid") { d.paid = true; commit("Ditandai lunas"); }
  if (b.dataset.a === "del" && confirm("Hapus catatan ini?")) { S.debts = S.debts.filter((x) => x !== d); commit("Catatan dihapus"); }
});

/* ===== PENGATURAN ===== */
$("#setForm").onsubmit = (e) => {
  e.preventDefault();
  S.shop = { name: $("#s-name").value.trim(), type: $("#s-type").value.trim(), owner: $("#s-owner").value.trim() };
  commit("Pengaturan disimpan");
};
$("#export").onclick = () => download("cadangan-jajanku.json", JSON.stringify(S, null, 2), "application/json");
$("#reset").onclick = () => { if (confirm("Semua data akan dihapus dan dikembalikan ke contoh awal. Lanjutkan?")) { S = seed(); cart = {}; commit("Data direset"); } };

/* ===== RENDER ===== */
function renderShop() {
  $("#shopName").textContent = S.shop.name; $("#shopType").textContent = S.shop.type;
  $("#s-name").value = S.shop.name; $("#s-type").value = S.shop.type; $("#s-owner").value = S.shop.owner;
}
function renderAll() { renderShop(); renderHome(); renderProducts(); renderPos(); renderReport(); renderDebts(); }
function commit(msg) { save(); renderAll(); if (msg) toast(msg); }
$("#today").textContent = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
renderAll();
