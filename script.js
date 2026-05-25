// ====== MASUKKAN URL GOOGLE APPS SCRIPT VERSI BARU DI BAWAH INI ======
const GAS_URL = "https://script.google.com/macros/s/AKfycbxXPMmLYeiro2Bq2kOLnfbUjXNQKFCwD4SK7vupGsaWqNhpxIDu-8y_VHPelrT521JHqw/exec"; 
// =====================================================================

const PIN_RAHASIA = "998877"; 

// Data Pribadi
let keuangan = JSON.parse(localStorage.getItem('keuangan')) || { cash: 0, atm: 0 };
let riwayat = JSON.parse(localStorage.getItem('riwayat')) || [];
let tugas = JSON.parse(localStorage.getItem('tugasPro')) || []; 
let cicilan = JSON.parse(localStorage.getItem('cicilanPro')) || [];
let akunPenting = JSON.parse(localStorage.getItem('akunPenting')) || [];

// Data Bisnis & Joki
let bisnis = JSON.parse(localStorage.getItem('bisnisPro')) || { cash: 0, atm: 0, profit: 0, riwayat: [] };
let joki = JSON.parse(localStorage.getItem('jokiPro')) || [];
let lastDate = localStorage.getItem('lastDateReset');

// Auto Reset Profit Bisnis Harian
const todayStr = new Date().toDateString();
if(lastDate !== todayStr) {
    bisnis.profit = 0; 
    localStorage.setItem('lastDateReset', todayStr);
    simpanData();
}

// Jam Real-time
setInterval(() => {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('live-clock').innerText = now.toLocaleDateString('id-ID', options);
}, 1000);

// Hamburger Logic
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}
document.getElementById('btn-hamburger').addEventListener('click', toggleSidebar);
document.getElementById('btn-close-sidebar').addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

function nav(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    document.getElementById(`sec-${sectionId}`).classList.remove('hidden');
    document.getElementById(`btn-${sectionId}`).classList.add('active-nav');
    if (window.innerWidth < 1024 && !sidebar.classList.contains('-translate-x-full')) toggleSidebar();
    window.scrollTo(0, 0); updateUI();
}

function formatRupiah(angka) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka); }

// --- TOAST NOTIFICATION (POP UP) ---
let toastTimeout;
function showToast(pesan, isError = false) {
    const toast = document.getElementById('toast-notif');
    
    // Ubah warna kalau error
    if(isError) {
        toast.classList.replace('bg-[#a3e635]', 'bg-red-400');
        toast.innerHTML = `<i class="fa-solid fa-circle-xmark text-2xl text-black"></i><span id="toast-msg" class="font-black uppercase text-sm md:text-base tracking-wide">${pesan}</span>`;
    } else {
        toast.classList.replace('bg-red-400', 'bg-[#a3e635]');
        toast.innerHTML = `<i class="fa-solid fa-circle-check text-2xl text-black"></i><span id="toast-msg" class="font-black uppercase text-sm md:text-base tracking-wide">${pesan}</span>`;
    }

    toast.classList.remove('translate-x-[200%]');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('translate-x-[200%]');
    }, 3000);
}

// --- API SENDER DENGAN POP UP SUPER KILAT (FIRE & FORGET) ---
function sendToBackend(payload, btnElement, loadingText, defaultText, successMessage) {
    btnElement.innerText = loadingText; 
    btnElement.disabled = true;

    // Tembak ke Google Scripts secara background tanpa ditunggu (Optimistic Update)
    fetch(GAS_URL, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: JSON.stringify(payload), 
        headers: { 'Content-Type': 'application/json' } 
    }).catch(err => { 
        console.error("Fetch Background Error:", err); 
        showToast("Terjadi gangguan jaringan lokal!", true);
    });

    // Manipulasi UI agar terasa sangat cepat. Beri jeda 0.8 detik saja untuk kesan "proses"
    setTimeout(() => {
        btnElement.innerText = defaultText; 
        btnElement.disabled = false;
        showToast(successMessage);
    }, 800); 
}

// --- KEUANGAN PRIBADI ---
document.getElementById('form-transaksi').addEventListener('submit', function(e) {
    e.preventDefault();
    const jenis = document.getElementById('jenis-trx').value;
    const dompet = document.getElementById('dompet-trx').value;
    const nominal = parseInt(document.getElementById('nominal-trx').value);
    const ket = document.getElementById('ket-trx').value;
    if (jenis === 'masuk') keuangan[dompet] += nominal; else keuangan[dompet] -= nominal;
    riwayat.unshift({ jenis, dompet, nominal, ket, tanggal: new Date().toLocaleTimeString('id-ID') });
    if(riwayat.length > 20) riwayat.pop(); 
    simpanData(); this.reset(); nav('dashboard'); 
    showToast("Transaksi Pribadi Disimpan!");
});

// --- MANDIRI LINK PRO (BISNIS) ---
document.getElementById('form-bisnis').addEventListener('submit', function(e) {
    e.preventDefault();
    const jenis = document.getElementById('jenis-bisnis').value;
    const nominal = parseInt(document.getElementById('nominal-bisnis').value);
    const admin = parseInt(document.getElementById('admin-bisnis').value);
    const ket = document.getElementById('ket-bisnis').value;
    const dompet = document.getElementById('dompet-bisnis').value;

    bisnis[dompet] += nominal; 
    bisnis.profit += admin;    

    bisnis.riwayat.unshift({ jenis, nominal, admin, ket, dompet, tanggal: new Date().toLocaleString('id-ID') });
    simpanData(); this.reset(); updateUI();
    showToast("Transaksi Agen Disimpan!");
});

function downloadLaporan(tipe) {
    let csv = "Tanggal,Jenis,Keterangan,Nominal,Admin,MasukDompet\n";
    bisnis.riwayat.forEach(r => { csv += `${r.tanggal},${r.jenis},${r.ket},${r.nominal},${r.admin},${r.dompet}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Laporan_Agen_${tipe}.csv`);
    a.click();
}

// --- JOKI KILAT ---
document.getElementById('form-joki').addEventListener('submit', function(e) {
    e.preventDefault();
    const newData = { id: "JK-" + Date.now(), nama: document.getElementById('klien-joki').value, wa: document.getElementById('wa-joki').value, biaya: parseInt(document.getElementById('biaya-joki').value), deadline: document.getElementById('deadline-joki').value, email: document.getElementById('email-joki').value, status: "Proses" };
    joki.push(newData); simpanData(); updateUI();
    const btn = document.getElementById('btn-submit-joki');
    sendToBackend({ action: "addJoki", ...newData }, btn, "LOADING...", "SIMPAN ORDER JOKI & ALARM", "Data Joki Masuk Database! 🚀");
    this.reset();
});

function selesaikanJoki(index) {
    if(confirm(`Joki ${joki[index].nama} selesai? Biaya masuk laba Mandiri Link.`)) {
        bisnis.profit += joki[index].biaya;
        bisnis.riwayat.unshift({ jenis: "Joki", nominal: 0, admin: joki[index].biaya, ket: `Pemasukan Dari Joki (${joki[index].nama})`, dompet: "-", tanggal: new Date().toLocaleString('id-ID') });
        joki[index].status = "Selesai"; simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "joki", id: joki[index].id }, document.createElement('button'), "x", "x", "Status Joki Selesai! ✅");
    }
}
function hapusJokiLokal(index) { if(confirm("Hapus tampilan lokal?")) { joki.splice(index, 1); simpanData(); updateUI(); } }


// --- TUGAS PRIBADI ---
document.getElementById('form-tugas').addEventListener('submit', function(e) {
    e.preventDefault();
    const dataBaru = { id: "TGS-" + Date.now(), namaTugas: document.getElementById('nama-tugas').value, matkul: document.getElementById('matkul-tugas').value, tipe: document.getElementById('tipe-tugas').value, deadline: document.getElementById('deadline-tugas').value, email: document.getElementById('email-tugas').value, status: "Belum Selesai" };
    tugas.push(dataBaru); simpanData(); updateUI();
    sendToBackend({ action: "addTugas", ...dataBaru }, document.getElementById('btn-submit-tugas'), "LOADING...", "SIMPAN TUGAS & ALARM", "Tugas Masuk Database! 📚");
    this.reset();
});
function selesaikanTugas(index) {
    if(confirm(`Selesaikan tugas ${tugas[index].namaTugas}?`)) {
        tugas[index].status = "Selesai"; simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "tugas", id: tugas[index].id }, document.createElement('button'), "x", "x", "Tugas Selesai! ✅");
    }
}
function hapusTugasLokal(index) { if(confirm("Hapus?")) { tugas.splice(index, 1); simpanData(); updateUI(); } }

// --- TAGIHAN ---
document.getElementById('form-cicilan').addEventListener('submit', function(e) {
    e.preventDefault();
    const dataBaru = { id: "ID-" + Date.now(), nama: document.getElementById('nama-tagihan').value, jumlah: parseInt(document.getElementById('jumlah-tagihan').value), tanggalFull: document.getElementById('tgl-jatuh-tempo').value, email: document.getElementById('email-tagihan').value, status: "Belum Bayar" };
    cicilan.push(dataBaru); simpanData(); updateUI();
    sendToBackend({ action: "addTagihan", ...dataBaru }, document.getElementById('btn-submit-tagihan'), "LOADING...", "SIMPAN TAGIHAN & ALARM", "Tagihan Masuk Database! 💸");
    this.reset();
});
function bayarTagihan(index) {
    if(confirm(`Lunas ${cicilan[index].nama}?`)) {
        cicilan[index].status = "Lunas"; simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "tagihan", id: cicilan[index].id }, document.createElement('button'), "x", "x", "Tagihan Lunas! ✅");
    }
}
function hapusCicilanLokal(index) { if(confirm("Hapus?")) { cicilan.splice(index, 1); simpanData(); updateUI(); } }

// --- AKUN ---
function checkPasswordAndNav() { document.getElementById('password-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('password-modal').classList.add('hidden'); document.getElementById('input-password').value = ''; }
function verifyPassword() { if (document.getElementById('input-password').value === PIN_RAHASIA) { closeModal(); nav('akun'); } else { showToast("PIN SALAH!", true); document.getElementById('input-password').value = ''; } }
function lockAccounts() { nav('dashboard'); }
document.getElementById('form-akun').addEventListener('submit', function(e) { e.preventDefault(); akunPenting.push({ platform: document.getElementById('platform-akun').value, user: document.getElementById('user-akun').value, pass: document.getElementById('pass-akun').value }); simpanData(); this.reset(); updateUI(); showToast("Akun Disimpan!"); });
function hapusAkun(index) { akunPenting.splice(index, 1); simpanData(); updateUI(); }

function simpanData() { localStorage.setItem('keuangan', JSON.stringify(keuangan)); localStorage.setItem('riwayat', JSON.stringify(riwayat)); localStorage.setItem('tugasPro', JSON.stringify(tugas)); localStorage.setItem('cicilanPro', JSON.stringify(cicilan)); localStorage.setItem('akunPenting', JSON.stringify(akunPenting)); localStorage.setItem('bisnisPro', JSON.stringify(bisnis)); localStorage.setItem('jokiPro', JSON.stringify(joki)); }

function updateUI() {
    // Dashboard Stats
    document.getElementById('saldo-pribadi').innerText = formatRupiah(keuangan.cash + keuangan.atm);
    document.getElementById('laba-bisnis').innerText = formatRupiah(bisnis.profit);
    document.getElementById('count-tugas').innerText = tugas.filter(t => t.status !== "Selesai").length; 
    document.getElementById('count-joki').innerText = joki.filter(j => j.status !== "Selesai").length;
    
    // Bisnis Stats
    document.getElementById('bisnis-cash').innerText = formatRupiah(bisnis.cash);
    document.getElementById('bisnis-atm').innerText = formatRupiah(bisnis.atm);
    document.getElementById('bisnis-profit').innerText = formatRupiah(bisnis.profit);

    // Cek Tombol Download Bulanan
    const today = new Date(); const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const btnBulan = document.getElementById('btn-dl-bulan');
    if(today.getDate() === lastDay) { btnBulan.disabled = false; btnBulan.classList.replace('bg-gray-300', 'bg-white'); btnBulan.classList.replace('text-gray-500', 'text-black'); }

    // Render Riwayat Pribadi
    const lr = document.getElementById('list-riwayat'); lr.innerHTML = riwayat.length === 0 ? '<p class="font-bold">Kosong</p>' : '';
    riwayat.forEach(r => { const color = r.jenis === 'masuk' ? 'text-green-600' : 'text-red-600'; lr.innerHTML += `<li class="flex justify-between border-b-2 border-black pb-2"><div><p class="font-black uppercase">${r.ket}</p><p class="text-xs font-bold">${r.dompet}</p></div><span class="${color} font-black">${r.jenis === 'masuk'?'+':'-'} ${formatRupiah(r.nominal)}</span></li>`; });

    // Render Riwayat Bisnis
    const lb = document.getElementById('list-bisnis'); lb.innerHTML = bisnis.riwayat.length === 0 ? '<p class="font-bold">Belum ada trx agen.</p>' : '';
    bisnis.riwayat.forEach(r => { lb.innerHTML += `<li class="flex justify-between items-center border-b-2 border-black pb-2"><div><p class="font-black uppercase">${r.jenis} - ${r.ket}</p><p class="text-xs font-bold">Laba: ${formatRupiah(r.admin)}</p></div><span class="font-black">${formatRupiah(r.nominal)}</span></li>`; });

    // Render Joki
    const lj = document.getElementById('list-joki'); lj.innerHTML = joki.length === 0 ? '<p class="font-bold">Data Kosong</p>' : '';
    joki.forEach((j, i) => { const d = new Date(j.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short'}); const s = j.status === "Selesai";
        lj.innerHTML += `<div class="neubrutalism-card ${s?"bg-gray-300":"bg-[#ffc900]"} p-4"><h4 class="font-black text-xl uppercase ${s?'line-through':''}">${j.nama}</h4><p class="font-bold text-sm">WA: ${j.wa}</p><p class="font-black my-2">Fee: ${formatRupiah(j.biaya)}</p><p class="font-bold mb-4 text-sm">DUE: <span class="bg-white px-2 border-2 border-black">${d}</span></p>${!s ? `<button onclick="selesaikanJoki(${i})" class="neubrutalism-btn w-full bg-black text-white py-2 text-sm mb-2">SELESAI (MASUK LABA)</button>` : `<p class="font-black text-green-800 mb-2 uppercase border-4 border-green-800 text-center py-1">✓ SELESAI</p>`}<button onclick="hapusJokiLokal(${i})" class="w-full text-xs underline font-bold">Hapus Data</button></div>`; });

    // Render Tugas
    const lt = document.getElementById('list-tugas'); lt.innerHTML = tugas.length === 0 ? '' : '';
    tugas.forEach((t, i) => { const d = new Date(t.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short'}); const s = t.status === "Selesai";
        lt.innerHTML += `<div class="neubrutalism-card ${s?"bg-gray-300":"bg-white"} p-4"><h4 class="font-black text-xl uppercase truncate ${s?'line-through':''}">${t.namaTugas}</h4><p class="font-bold text-sm mb-4">${t.matkul} - ${d}</p>${!s ? `<button onclick="selesaikanTugas(${i})" class="neubrutalism-btn w-full bg-[#ff90e8] py-2 text-sm mb-2">SELESAI</button>` : `<p class="font-black text-green-800 mb-2 text-center border-4 border-green-800 py-1">✓ BERHENTI</p>`}<button onclick="hapusTugasLokal(${i})" class="w-full text-xs underline font-bold">Hapus Data</button></div>`; });

    // Render Tagihan
    const lc = document.getElementById('list-cicilan'); lc.innerHTML = cicilan.length === 0 ? '' : '';
    cicilan.forEach((c, i) => { const d = new Date(c.tanggalFull).toLocaleDateString('id-ID', {day:'numeric',month:'short'}); const s = c.status === "Lunas";
        lc.innerHTML += `<div class="neubrutalism-card ${s?"bg-gray-300":"bg-white"} p-4"><h4 class="font-black text-xl uppercase truncate ${s?'line-through':''}">${c.nama}</h4><p class="font-black my-2">${formatRupiah(c.jumlah)}</p><p class="font-bold text-sm mb-4">DUE: ${d}</p>${!s ? `<button onclick="bayarTagihan(${i})" class="neubrutalism-btn w-full bg-[#38bdf8] py-2 text-sm mb-2">LUNAS</button>` : `<p class="font-black text-green-800 mb-2 text-center border-4 border-green-800 py-1">✓ BERHENTI</p>`}<button onclick="hapusCicilanLokal(${i})" class="w-full text-xs underline font-bold">Hapus Data</button></div>`; });

    // Render Akun Penting
    const la = document.getElementById('list-akun'); la.innerHTML = akunPenting.length === 0 ? '<p class="font-bold">Aman, Belum ada akun disimpan.</p>' : '';
    akunPenting.forEach((a, i) => { la.innerHTML += `<div class="flex justify-between items-center bg-[#ffc900] p-4 border-4 border-black"><div class="overflow-hidden mr-3"><p class="font-black uppercase bg-black text-white px-2 inline-block mb-1 text-xs">${a.platform}</p><p class="font-bold text-sm truncate"><i class="fa-solid fa-user"></i> ${a.user}</p><p class="font-bold mt-1 text-sm truncate bg-white px-2 border-2 border-black tracking-widest">${a.pass}</p></div><button onclick="hapusAkun(${i})" class="bg-red-400 p-2 border-4 border-black"><i class="fa-solid fa-trash"></i></button></div>`; });
}
updateUI();