const GAS_URL = "https://script.google.com/macros/s/AKfycbxXPMmLYeiro2Bq2kOLnfbUjXNQKFCwD4SK7vupGsaWqNhpxIDu-8y_VHPelrT521JHqw/exec"; 
const PIN_RAHASIA = "998877"; 

let keuangan = JSON.parse(localStorage.getItem('keuangan')) || { cash: 0, atm: 0 };
let riwayat = JSON.parse(localStorage.getItem('riwayat')) || [];
let tugas = JSON.parse(localStorage.getItem('tugasPro')) || []; 
let cicilan = JSON.parse(localStorage.getItem('cicilanPro')) || [];
let akunPenting = JSON.parse(localStorage.getItem('akunPenting')) || [];
let bisnis = JSON.parse(localStorage.getItem('bisnisPro')) || { cash: 0, atm: 0, profit: 0, riwayat: [] };
let joki = JSON.parse(localStorage.getItem('jokiPro')) || [];
let lastDate = localStorage.getItem('lastDateReset');

const todayStr = new Date().toDateString();
if(lastDate !== todayStr) {
    bisnis.profit = 0; localStorage.setItem('lastDateReset', todayStr); simpanData();
}

setInterval(() => {
    const now = new Date();
    document.getElementById('live-clock').innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}, 1000);

// Logika Navigasi Horizontal Mobile & Vertical Desktop
function nav(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    
    // Reset semua warna tombol nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('nav-active', 'bg-blue-50');
        if(btn.closest('aside')) btn.classList.remove('text-blue-600');
    });
    
    document.getElementById(`sec-${sectionId}`).classList.remove('hidden');
    
    // Warnai icon yang aktif (Kecuali dashboard karena tidak ada di nav bawah)
    document.querySelectorAll(`.btn-${sectionId}`).forEach(btn => {
        btn.classList.add('nav-active');
        if(btn.closest('aside')) btn.classList.add('bg-blue-50', 'text-blue-600');
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateUI();
}

function formatRupiah(angka) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka); }

async function sendToBackend(payload, btnElement, loadingText, defaultText) {
    btnElement.innerText = loadingText; btnElement.disabled = true;
    try { await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }); } catch(err) { console.error(err); }
    btnElement.innerText = defaultText; btnElement.disabled = false;
}

document.getElementById('form-transaksi').addEventListener('submit', function(e) {
    e.preventDefault();
    const jenis = document.getElementById('jenis-trx').value, dompet = document.getElementById('dompet-trx').value, nominal = parseInt(document.getElementById('nominal-trx').value), ket = document.getElementById('ket-trx').value;
    if (jenis === 'masuk') keuangan[dompet] += nominal; else keuangan[dompet] -= nominal;
    riwayat.unshift({ jenis, dompet, nominal, ket, tanggal: new Date().toLocaleTimeString('id-ID') });
    if(riwayat.length > 20) riwayat.pop(); 
    simpanData(); this.reset(); nav('dashboard'); 
});

document.getElementById('form-bisnis').addEventListener('submit', function(e) {
    e.preventDefault();
    const jenis = document.getElementById('jenis-bisnis').value, nominal = parseInt(document.getElementById('nominal-bisnis').value), admin = parseInt(document.getElementById('admin-bisnis').value), ket = document.getElementById('ket-bisnis').value, dompet = document.getElementById('dompet-bisnis').value;
    bisnis[dompet] += nominal; bisnis.profit += admin;
    bisnis.riwayat.unshift({ jenis, nominal, admin, ket, dompet, tanggal: new Date().toLocaleString('id-ID') });
    simpanData(); this.reset(); updateUI();
});

function downloadLaporan(tipe) {
    let csv = "Tanggal,Jenis,Keterangan,Nominal,Admin,MasukDompet\n";
    bisnis.riwayat.forEach(r => { csv += `${r.tanggal},${r.jenis},${r.ket},${r.nominal},${r.admin},${r.dompet}\n`; });
    const a = document.createElement('a');
    a.setAttribute('href', window.URL.createObjectURL(new Blob([csv], { type: 'text/csv' })));
    a.setAttribute('download', `Laporan_Agen_${tipe}.csv`); a.click();
}

document.getElementById('form-joki').addEventListener('submit', async function(e) {
    e.preventDefault();
    const newData = { id: "JK-" + Date.now(), nama: document.getElementById('klien-joki').value, wa: document.getElementById('wa-joki').value, biaya: parseInt(document.getElementById('biaya-joki').value), deadline: document.getElementById('deadline-joki').value, email: document.getElementById('email-joki').value, status: "Proses" };
    joki.push(newData); simpanData(); updateUI();
    await sendToBackend({ action: "addJoki", ...newData }, document.getElementById('btn-submit-joki'), "LOADING...", "SIMPAN ORDER & PASANG ALARM");
    alert("Joki dicatat & Alarm klien diset!"); this.reset();
});

async function selesaikanJoki(index) {
    if(confirm(`Selesaikan Joki ${joki[index].nama}?`)) {
        bisnis.profit += joki[index].biaya;
        bisnis.riwayat.unshift({ jenis: "Joki", nominal: 0, admin: joki[index].biaya, ket: `Joki: ${joki[index].nama}`, dompet: "-", tanggal: new Date().toLocaleString('id-ID') });
        joki[index].status = "Selesai"; simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "joki", id: joki[index].id }, document.createElement('button'), "x", "x");
    }
}
function hapusJokiLokal(index) { if(confirm("Hapus?")) { joki.splice(index, 1); simpanData(); updateUI(); } }

document.getElementById('form-tugas').addEventListener('submit', async function(e) {
    e.preventDefault();
    const dataBaru = { id: "TGS-" + Date.now(), namaTugas: document.getElementById('nama-tugas').value, matkul: document.getElementById('matkul-tugas').value, tipe: document.getElementById('tipe-tugas').value, deadline: document.getElementById('deadline-tugas').value, email: document.getElementById('email-tugas').value, status: "Belum Selesai" };
    tugas.push(dataBaru); simpanData(); updateUI();
    await sendToBackend({ action: "addTugas", ...dataBaru }, document.getElementById('btn-submit-tugas'), "LOADING...", "SIMPAN TUGAS & ALARM"); this.reset();
});
async function selesaikanTugas(index) {
    if(confirm(`Selesai tugas ${tugas[index].namaTugas}?`)) {
        tugas[index].status = "Selesai"; simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "tugas", id: tugas[index].id }, document.createElement('button'), "x", "x");
    }
}
function hapusTugasLokal(index) { if(confirm("Hapus?")) { tugas.splice(index, 1); simpanData(); updateUI(); } }

document.getElementById('form-cicilan').addEventListener('submit', async function(e) {
    e.preventDefault();
    const dataBaru = { id: "ID-" + Date.now(), nama: document.getElementById('nama-tagihan').value, jumlah: parseInt(document.getElementById('jumlah-tagihan').value), tanggalFull: document.getElementById('tgl-jatuh-tempo').value, email: document.getElementById('email-tagihan').value, status: "Belum Bayar" };
    cicilan.push(dataBaru); simpanData(); updateUI();
    await sendToBackend({ action: "addTagihan", ...dataBaru }, document.getElementById('btn-submit-tagihan'), "LOADING...", "SIMPAN TAGIHAN & ALARM"); this.reset();
});
async function bayarTagihan(index) {
    if(confirm(`Lunas ${cicilan[index].nama}?`)) {
        cicilan[index].status = "Lunas"; simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "tagihan", id: cicilan[index].id }, document.createElement('button'), "x", "x");
    }
}
function hapusCicilanLokal(index) { if(confirm("Hapus?")) { cicilan.splice(index, 1); simpanData(); updateUI(); } }

function checkPasswordAndNav() { document.getElementById('password-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('password-modal').classList.add('hidden'); document.getElementById('input-password').value = ''; }
function verifyPassword() { if (document.getElementById('input-password').value === PIN_RAHASIA) { closeModal(); nav('akun'); } else { alert("PIN SALAH!"); document.getElementById('input-password').value = ''; } }
function lockAccounts() { nav('dashboard'); }
document.getElementById('form-akun').addEventListener('submit', function(e) { e.preventDefault(); akunPenting.push({ platform: document.getElementById('platform-akun').value, user: document.getElementById('user-akun').value, pass: document.getElementById('pass-akun').value }); simpanData(); this.reset(); updateUI(); });
function hapusAkun(index) { akunPenting.splice(index, 1); simpanData(); updateUI(); }

function simpanData() { localStorage.setItem('keuangan', JSON.stringify(keuangan)); localStorage.setItem('riwayat', JSON.stringify(riwayat)); localStorage.setItem('tugasPro', JSON.stringify(tugas)); localStorage.setItem('cicilanPro', JSON.stringify(cicilan)); localStorage.setItem('akunPenting', JSON.stringify(akunPenting)); localStorage.setItem('bisnisPro', JSON.stringify(bisnis)); localStorage.setItem('jokiPro', JSON.stringify(joki)); }

function updateUI() {
    document.getElementById('saldo-pribadi').innerText = formatRupiah(keuangan.cash + keuangan.atm);
    document.getElementById('laba-bisnis').innerText = formatRupiah(bisnis.profit);
    document.getElementById('count-tugas').innerText = tugas.filter(t => t.status !== "Selesai").length; 
    document.getElementById('count-joki').innerText = joki.filter(j => j.status !== "Selesai").length;
    document.getElementById('bisnis-cash').innerText = formatRupiah(bisnis.cash);
    document.getElementById('bisnis-atm').innerText = formatRupiah(bisnis.atm);
    document.getElementById('bisnis-profit').innerText = formatRupiah(bisnis.profit);

    const today = new Date(); const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const btnBulan = document.getElementById('btn-dl-bulan');
    if(today.getDate() === lastDay) { btnBulan.disabled = false; btnBulan.classList.replace('text-slate-400', 'text-blue-600'); btnBulan.classList.replace('cursor-not-allowed', 'hover:bg-blue-50'); }

    const lr = document.getElementById('list-riwayat'); lr.innerHTML = riwayat.length === 0 ? '<p class="text-sm text-slate-400">Belum ada data.</p>' : '';
    riwayat.forEach(r => { const color = r.jenis === 'masuk' ? 'text-green-500' : 'text-red-500'; lr.innerHTML += `<li class="flex justify-between border-b border-slate-100 pb-3"><div><p class="font-bold text-slate-700 capitalize">${r.ket}</p><p class="text-xs text-slate-400 capitalize">${r.dompet}</p></div><span class="${color} font-bold">${r.jenis === 'masuk'?'+':'-'} ${formatRupiah(r.nominal)}</span></li>`; });

    const lb = document.getElementById('list-bisnis'); lb.innerHTML = bisnis.riwayat.length === 0 ? '<p class="text-sm text-slate-400">Belum ada trx agen.</p>' : '';
    bisnis.riwayat.forEach(r => { lb.innerHTML += `<li class="flex justify-between items-center border-b border-slate-100 pb-3"><div><p class="font-bold text-slate-700">${r.jenis} <span class="text-xs text-slate-400">(${r.ket})</span></p><p class="text-xs font-semibold text-green-500">Laba: ${formatRupiah(r.admin)}</p></div><span class="font-bold text-slate-700">${formatRupiah(r.nominal)}</span></li>`; });

    const lj = document.getElementById('list-joki'); lj.innerHTML = '';
    joki.forEach((j, i) => { const d = new Date(j.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short'}); const s = j.status === "Selesai";
        lj.innerHTML += `<div class="glass-card p-5 border-l-4 ${s?"border-l-slate-300 opacity-70":"border-l-orange-400"}"><h4 class="font-extrabold text-lg text-slate-800 ${s?'line-through':''}">${j.nama}</h4><p class="text-xs text-slate-500 mb-2">WA: ${j.wa}</p><p class="font-bold text-blue-600 mb-3">${formatRupiah(j.biaya)}</p><p class="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1"><i class="fa-regular fa-clock"></i> ${d}</p>${!s ? `<button onclick="selesaikanJoki(${i})" class="btn-clean btn-primary text-sm py-2 mb-3">Tandai Selesai</button>` : `<p class="font-bold text-green-600 mb-3 text-center text-sm"><i class="fa-solid fa-check"></i> Sudah Selesai</p>`}<button onclick="hapusJokiLokal(${i})" class="w-full text-xs text-slate-400 hover:text-red-500 transition">Hapus Data</button></div>`; });

    const lt = document.getElementById('list-tugas'); lt.innerHTML = '';
    tugas.forEach((t, i) => { const d = new Date(t.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short'}); const s = t.status === "Selesai";
        lt.innerHTML += `<div class="glass-card p-5 border-l-4 ${s?"border-l-slate-300 opacity-70":"border-l-blue-400"}"><h4 class="font-extrabold text-lg text-slate-800 truncate ${s?'line-through':''}">${t.namaTugas}</h4><p class="text-sm font-semibold text-slate-600 mb-3">${t.matkul}</p><p class="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1"><i class="fa-regular fa-clock"></i> ${d}</p>${!s ? `<button onclick="selesaikanTugas(${i})" class="btn-clean btn-primary text-sm py-2 mb-3">Tandai Selesai</button>` : `<p class="font-bold text-green-600 mb-3 text-center text-sm"><i class="fa-solid fa-check"></i> Sudah Selesai</p>`}<button onclick="hapusTugasLokal(${i})" class="w-full text-xs text-slate-400 hover:text-red-500 transition">Hapus Data</button></div>`; });

    const lc = document.getElementById('list-cicilan'); lc.innerHTML = '';
    cicilan.forEach((c, i) => { const d = new Date(c.tanggalFull).toLocaleDateString('id-ID', {day:'numeric',month:'short'}); const s = c.status === "Lunas";
        lc.innerHTML += `<div class="glass-card p-5 border-l-4 ${s?"border-l-slate-300 opacity-70":"border-l-green-400"}"><h4 class="font-extrabold text-lg text-slate-800 truncate ${s?'line-through':''}">${c.nama}</h4><p class="font-bold text-blue-600 my-2">${formatRupiah(c.jumlah)}</p><p class="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1"><i class="fa-regular fa-clock"></i> ${d}</p>${!s ? `<button onclick="bayarTagihan(${i})" class="btn-clean btn-primary text-sm py-2 mb-3">Bayar Lunas</button>` : `<p class="font-bold text-green-600 mb-3 text-center text-sm"><i class="fa-solid fa-check"></i> Sudah Lunas</p>`}<button onclick="hapusCicilanLokal(${i})" class="w-full text-xs text-slate-400 hover:text-red-500 transition">Hapus Data</button></div>`; });

    const la = document.getElementById('list-akun'); la.innerHTML = akunPenting.length === 0 ? '<p class="text-sm text-slate-400">Belum ada akun.</p>' : '';
    akunPenting.forEach((a, i) => { la.innerHTML += `<div class="glass-card p-4 flex justify-between items-center"><div class="overflow-hidden mr-3"><p class="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">${a.platform}</p><p class="text-sm font-bold text-slate-700 truncate"><i class="fa-solid fa-user text-slate-400 mr-1"></i> ${a.user}</p><p class="text-sm font-mono text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded-md tracking-widest inline-block">${a.pass}</p></div><button onclick="hapusAkun(${i})" class="text-red-400 hover:text-red-600 p-2"><i class="fa-solid fa-trash"></i></button></div>`; });
}
updateUI();