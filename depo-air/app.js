// ====== CONFIG ======
const API_URL = "https://script.google.com/macros/s/AKfycbxQwEq2-OAUHSBBLX1iG3KQZVAXgzts3VLQmzonjuc3elDMBIEquhyD1vCcxR3Hhv6v/exec";
const SHEET_PENJUALAN = "Penjualan";
const SHEET_PENGATURAN = "Pengaturan";

let penjualanRows = [];
let pengaturanRowsByKolom = {};
let pengaturanData = {};

const rupiah = n => (isNaN(n) ? "-" : new Intl.NumberFormat("id-ID").format(n));
const byId = id => document.getElementById(id);
const toDateKey = (d) => {
  const dt = new Date(d);
  if (isNaN(dt)) return "Invalid";
  const utc = dt.getTime() + (dt.getTimezoneOffset()*60000);
  const wib = new Date(utc + 7*3600*1000);
  return wib.toISOString().slice(0,10);
};
function weekOfYear(d){
  const date = new Date(d);
  const onejan = new Date(date.getFullYear(),0,1);
  const millis = (date - onejan) + ((onejan.getTimezoneOffset()-date.getTimezoneOffset())*60000);
  const day = Math.floor(millis / 86400000) + 1;
  return Math.ceil(day / 7);
}
function groupReport(rows){
  const res = {harian:{}, mingguan:{}, bulanan:{}, tahunan:{}};
  rows.forEach(r=>{
    const tgl = r["Tanggal"];
    const total = Number(r["Total"])||0;
    const status = (r["Status Pembayaran"]||"").toLowerCase();
    const bayarHutang = Number(r["Bayar Hutang"])||0;
    const pemasukan = (status==="lunas" ? total : 0) + bayarHutang;

    const keyDay = toDateKey(tgl);
    const dt = new Date(tgl);
    const kWeek = `${dt.getFullYear()}-W${weekOfYear(dt)}`;
    const kMonth = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    const kYear = `${dt.getFullYear()}`;

    for (const [bucket,key] of [["harian",keyDay],["mingguan",kWeek],["bulanan",kMonth],["tahunan",kYear]]){
      const obj = res[bucket][key] ||= { transaksi:0, penjualan:0, hutang:0, pemasukan:0 };
      obj.transaksi += 1;
      obj.penjualan += total;
      obj.hutang += (status==="hutang" ? total : 0);
      obj.pemasukan += pemasukan;
    }
  });
  return res;
}
function tableFromReport(obj, label){
  const entries = Object.entries(obj).sort();
  if (!entries.length) return `<div class="muted">Belum ada data.</div>`;
  let html = `<div class="table-wrap"><table><thead><tr><th>${label}</th><th>Transaksi</th><th>Total Penjualan</th><th>Total Hutang</th><th>Total Pemasukan</th></tr></thead><tbody>`;
  for (const [k,v] of entries){
    html += `<tr><td>${k}</td><td>${v.transaksi}</td><td>${rupiah(v.penjualan)}</td><td>${rupiah(v.hutang)}</td><td>${rupiah(v.pemasukan)}</td></tr>`;
  }
  html += `</tbody></table></div>`;
  return html;
}

async function apiGet(sheet){ 
  const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(sheet)}&action=get-data`);
  return res.json();
}
async function apiInsert(sheet, params){
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(sheet)}&action=insert&${qs}`);
  return res.json();
}
async function apiUpdate(sheet, row, params){
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(sheet)}&action=update&row=${row}&${qs}`);
  return res.json();
}
async function apiDelete(sheet, row){
  const res = await fetch(`${API_URL}?sheet=${encodeURIComponent(sheet)}&action=delete&row=${row}`);
  return res.json();
}

async function loadPengaturan(){
  const out = await apiGet(SHEET_PENGATURAN);
  if (!out.success){ console.warn(out.message); return; }
  pengaturanRowsByKolom = {};
  pengaturanData = {};
  out.data.forEach((row,idx)=>{
    const lineRow = idx + 2;
    pengaturanRowsByKolom[row["Kolom"]] = lineRow;
    pengaturanData[row["Kolom"]] = row["Nilai"];
  });
  byId("store-name").textContent = `Store: ${pengaturanData["Nama Toko"]||"-"}`;
  byId("store-address").textContent = pengaturanData["Alamat Toko"]||"-";
  byId("store-owner").textContent = pengaturanData["Owner"]||"-";
  byId("store-cashier").textContent = pengaturanData["Kasir"]||"-";
  byId("stok-toren").textContent = pengaturanData["Stok Toren (liter)"]||0;
}
async function setStokToren(newVal){
  const row = pengaturanRowsByKolom["Stok Toren (liter)"];
  if (!row){ alert("Baris 'Stok Toren (liter)' tidak ditemukan di sheet Pengaturan."); return; }
  const res = await apiUpdate(SHEET_PENGATURAN, row, {"Nilai": newVal});
  if (res.success){
    pengaturanData["Stok Toren (liter)"] = newVal;
    byId("stok-toren").textContent = newVal;
  }else{
    alert("Gagal memperbarui stok toren: " + res.message);
  }
}

async function loadPenjualan(){
  const out = await apiGet(SHEET_PENJUALAN);
  const tbody = byId("sales-body");
  tbody.innerHTML = "";
  penjualanRows = [];
  if (!out.success){ 
    tbody.innerHTML = `<tr><td colspan="11">${out.message||"Gagal memuat data"}</td></tr>`;
    return;
  }
  const q = (byId("search").value||"").toLowerCase();
  out.data.forEach((item, idx)=>{
    const rowNumber = idx + 2;
    const line = {
      tgl: item["Tanggal"],
      nama: item["Nama Pelanggan"],
      alamat: item["Alamat"],
      produk: item["Produk"],
      qty: item["Qty"],
      harga: item["Harga Satuan"],
      total: item["Total"],
      status: item["Status Pembayaran"],
      hutang: item["Hutang"]||0,
      bayar: item["Bayar Hutang"]||0,
    };
    const match = `${line.nama} ${line.alamat} ${line.produk}`.toLowerCase().includes(q);
    if (!match) return;
    penjualanRows.push(rowNumber);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${line.tgl||""}</td>
      <td>${line.nama||""}</td>
      <td>${line.alamat||""}</td>
      <td>${line.produk||""}</td>
      <td>${line.qty||0}</td>
      <td>${rupiah(line.harga||0)}</td>
      <td>${rupiah(line.total||0)}</td>
      <td>${line.status||""}</td>
      <td>${rupiah(line.hutang||0)}</td>
      <td>${rupiah(line.bayar||0)}</td>
      <td>
        <button onclick="openPayDialog(${penjualanRows.length-1}, '${(line.nama||"").replace(/'/g,"\'")}', ${Number(line.hutang)||0})">💳</button>
        <button onclick="handleDelete(${penjualanRows.length-1})">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });
  renderReports(out.data);
}

function renderReports(rows){
  const rep = groupReport(rows);
  byId("laporan-harian").innerHTML = tableFromReport(rep.harian, "Tanggal (WIB)");
  byId("laporan-mingguan").innerHTML = tableFromReport(rep.mingguan, "Tahun-Minggu");
  byId("laporan-bulanan").innerHTML = tableFromReport(rep.bulanan, "Tahun-Bulan");
  byId("laporan-tahunan").innerHTML = tableFromReport(rep.tahunan, "Tahun");
}

function syncHargaTotal(){
  const sel = byId("produk").selectedOptions[0];
  const basePrice = Number(sel.dataset.price||0);
  const qty = Number(byId("qty").value||0);
  byId("harga").value = basePrice;
  byId("total").value = basePrice * qty;
}
byId("produk").addEventListener("change", syncHargaTotal);
byId("qty").addEventListener("input", syncHargaTotal);

byId("btn-refill").addEventListener("click", async ()=>{
  const val = Number(byId("manual-refill").value||0);
  const newStock = val>0 ? val : 8000;
  await setStokToren(newStock);
  byId("manual-refill").value = "";
  alert("Stok toren diperbarui.");
});

byId("btn-refresh").addEventListener("click", async ()=>{
  await loadPengaturan();
  await loadPenjualan();
});

byId("search").addEventListener("input", loadPenjualan);

byId("sales-form").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form).entries());
  if (!data["Total"] || Number(data["Total"])<=0){
    syncHargaTotal();
    data["Total"] = byId("total").value;
  }
  if ((data["Status Pembayaran"]||"").toLowerCase()==="hutang"){
    data["Hutang"] = data["Total"];
  }else{
    data["Hutang"] = 0;
  }

  const res = await apiInsert(SHEET_PENJUALAN, data);
  if (!res.success){ alert("Gagal menyimpan: " + res.message); return; }

  const sel = byId("produk").selectedOptions[0];
  const liters = Number(sel.dataset.liters||0);
  if (liters>0){
    await loadPengaturan();
    const now = Number(pengaturanData["Stok Toren (liter)"]||0);
    const newVal = now - (liters * Number(data["Qty"]||0));
    if (newVal <= 0){
      await setStokToren(8000);
      alert("Stok toren habis. Sistem otomatis reset ke 8000 liter.");
    }else{
      await setStokToren(newVal);
    }
  }

  form.reset();
  syncHargaTotal();
  await loadPenjualan();
  alert("Transaksi tersimpan.");
});

async function handleDelete(idx){
  const row = penjualanRows[idx];
  if (!row) return;
  if (!confirm("Hapus data ini?")) return;
  const res = await apiDelete(SHEET_PENJUALAN, row);
  if (!res.success){ alert("Gagal menghapus: " + res.message); return; }
  await loadPenjualan();
}
window.handleDelete = handleDelete;

const payDialog = byId("pay-dialog");
let payContext = { idx: null, hutang: 0 };
function openPayDialog(idx, nama, hutang){
  payContext.idx = idx;
  payContext.hutang = Number(hutang)||0;
  byId("pay-name").textContent = nama;
  byId("pay-debt").textContent = rupiah(payContext.hutang);
  byId("pay-amount").value = payContext.hutang;
  payDialog.showModal();
}
window.openPayDialog = openPayDialog;

byId("pay-form").addEventListener("close", async ()=>{
  if (payDialog.returnValue !== "confirm") return;
  const amount = Number(byId("pay-amount").value||0);
  if (amount < payContext.hutang){
    alert("Nominal harus ≥ total hutang untuk ditandai Lunas.");
    return;
  }
  const row = penjualanRows[payContext.idx];
  if (!row){ alert("Row tidak ditemukan."); return; }
  const res = await apiUpdate(SHEET_PENJUALAN, row, {
    "Bayar Hutang": amount,
    "Status Pembayaran": "Lunas",
    "Hutang": 0
  });
  if (!res.success){ alert("Gagal update hutang: " + res.message); return; }
  await loadPenjualan();
  alert("Hutang dibayar. Status jadi Lunas & masuk ke pemasukan.");
});

document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    document.querySelectorAll(".report").forEach(el=>el.classList.remove("visible"));
    byId("laporan-"+tab).classList.add("visible");
  });
});

(async function init(){
  const today = new Date().toISOString().slice(0,10);
  document.querySelector('input[name="Tanggal"]').value = today;
  syncHargaTotal();
  await loadPengaturan();
  await loadPenjualan();
  console.log("Siap digunakan.");
})();
