const GAS_URL = "https://script.google.com/macros/s/AKfycbxXPMmLYeiro2Bq2kOLnfbUjXNQKFCwD4SK7vupGsaWqNhpxIDu-8y_VHPelrT521JHqw/exec"; 
const PIN_RAHASIA = "998877"; 

// Initial Storage System Arsitektur
let keuangan = JSON.parse(localStorage.getItem('keuangan')) || { cash: 0, atm: 0 };
let riwayat = JSON.parse(localStorage.getItem('riwayatClean')) || []; 
let tugas = JSON.parse(localStorage.getItem('tugasPro')) || []; 
let cicilan = JSON.parse(localStorage.getItem('cicilanPro')) || [];
let akunPenting = JSON.parse(localStorage.getItem('akunPenting')) || [];
let bisnis = JSON.parse(localStorage.getItem('bisnisPro')) || { cash: 0, atm: 0, profit: 0, riwayat: [] };
let joki = JSON.parse(localStorage.getItem('jokiPro')) || [];
let jokiLogOmset = JSON.parse(localStorage.getItem('jokiLogOmsetPro')) || []; 

// FIX AUDIT 3: Modul Brain Dump (Catatan Kilat)
let catatanKilat = JSON.parse(localStorage.getItem('catatanKilatPro')) || [];

let lastDate = localStorage.getItem('lastDateReset');
let chartInstance = null; // Variabel Global untuk Chart.js

// Pembersihan Profit Harian Otomatis tepat Jam 00.00 WITA
const todayStr = new Date().toDateString();
if(lastDate !== todayStr) {
    bisnis.profit = 0; 
    localStorage.setItem('lastDateReset', todayStr);
    simpanData();
}

// Jam Waktu Nyata
setInterval(() => {
    const now = new Date();
    document.getElementById('live-clock').innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " WITA";
}, 1000);

// Sistem Navigasi
function nav(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('nav-active', 'bg-slate-800');
        if(btn.closest('aside')) btn.classList.remove('text-blue-500');
    });
    document.getElementById(`sec-${sectionId}`).classList.remove('hidden');
    document.querySelectorAll(`.btn-${sectionId}`).forEach(btn => {
        btn.classList.add('nav-active');
        if(btn.closest('aside')) btn.classList.add('bg-slate-800', 'text-blue-500');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateUI();
}

function formatRupiah(angka) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka); }

async function sendToBackend(payload, btnElement, loadingText, defaultText) {
    if(btnElement) { btnElement.innerText = loadingText; btnElement.disabled = true; }
    try { await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }); } catch(err) { console.error(err); }
    if(btnElement) { btnElement.innerText = defaultText; btnElement.disabled = false; }
}

// --- ENGINE MODUL CATATAN KILAT ---
document.getElementById('form-catatan').addEventListener('submit', function(e) {
    e.preventDefault();
    catatanKilat.unshift({ isi: document.getElementById('input-catatan').value, waktu: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) });
    simpanData(); this.reset(); updateUI();
});
function hapusCatatan(index) { catatanKilat.splice(index, 1); simpanData(); updateUI(); }

// --- ENGINE PEMBUKUAN KAS PRIBADI ---
document.getElementById('form-transaksi').addEventListener('submit', function(e) {
    e.preventDefault();
    const jenis = document.getElementById('jenis-trx').value, dompet = document.getElementById('dompet-trx').value, nominal = parseInt(document.getElementById('nominal-trx').value), ket = document.getElementById('ket-trx').value;
    if (jenis === 'masuk') keuangan[dompet] += nominal; else keuangan[dompet] -= nominal;
    riwayat.unshift({ jenis, dompet, nominal, ket, tanggal: new Date().toLocaleDateString('id-ID'), waktu: new Date().toLocaleTimeString('id-ID') });
    simpanData(); this.reset(); updateUI();
});

// --- ENGINE OPERASIONAL AGEN MANDIRI LINK ---
document.getElementById('form-bisnis').addEventListener('submit', function(e) {
    e.preventDefault();
    const jenis = document.getElementById('jenis-bisnis').value, nominal = parseInt(document.getElementById('nominal-bisnis').value), admin = parseInt(document.getElementById('admin-bisnis').value), ket = document.getElementById('ket-bisnis').value, dompet = document.getElementById('dompet-bisnis').value;
    bisnis[dompet] += nominal; bisnis.profit += admin;    
    bisnis.riwayat.unshift({ jenis, nominal, admin, ket, dompet, tanggal: new Date().toLocaleDateString('id-ID'), waktu: new Date().toLocaleTimeString('id-ID') });
    simpanData(); this.reset(); updateUI();
});

// --- FIX AUDIT 1: SINKRONISASI SERVER CLEAR ALL ---
function clearAllKeuangan() {
    if(confirm("Yakin hapus SEMUA data riwayat mutasi kas pribadi?")) { riwayat = []; keuangan = { cash: 0, atm: 0 }; simpanData(); updateUI(); }
}
function clearAllBisnis() {
    if(confirm("Yakin hapus SEMUA data riwayat transaksi Mandiri Link?")) { bisnis.riwayat = []; simpanData(); updateUI(); }
}
async function clearAllJoki() {
    if(confirm("Yakin hapus SEMUA data aktif Joki Kilat? Sinyal akan dikirim ke server untuk menghentikan notifikasi secara massal.")) {
        joki = []; jokiLogOmset = []; simpanData(); updateUI();
        await sendToBackend({ action: "clearAll", tipe: "joki" }, null, "", "");
    }
}
async function clearAllTugas() {
    if(confirm("Yakin hapus SEMUA tugas Uniska dari tampilan layar ini?")) {
        tugas = []; simpanData(); updateUI();
        await sendToBackend({ action: "clearAll", tipe: "tugas" }, null, "", "");
    }
}
async function clearAllCicilan() {
    if(confirm("Yakin hapus SEMUA kartu tagihan dari tampilan layar ini?")) {
        cicilan = []; simpanData(); updateUI();
        await sendToBackend({ action: "clearAll", tipe: "tagihan" }, null, "", "");
    }
}

// --- ENGINE JOKI KILAT ---
document.getElementById('form-joki').addEventListener('submit', async function(e) {
    e.preventDefault();
    const newData = { id: "JK-" + Date.now(), nama: document.getElementById('klien-joki').value, wa: document.getElementById('wa-joki').value, biaya: parseInt(document.getElementById('biaya-joki').value), deadline: document.getElementById('deadline-joki').value, email: document.getElementById('email-joki').value, status: "Proses" };
    joki.push(newData); simpanData(); updateUI();
    await sendToBackend({ action: "addJoki", ...newData }, document.getElementById('btn-submit-joki'), "MEMPROSES DATA...", "SIMPAN ORDER JOKI");
    this.reset();
});

async function selesaikanJoki(index) {
    if(confirm(`Konfirmasi penyelesaian Project Joki ${joki[index].nama}?`)) {
        jokiLogOmset.unshift({ namaProject: joki[index].nama, biaya: joki[index].biaya, tanggal: new Date().toLocaleDateString('id-ID'), waktu: new Date().toLocaleTimeString('id-ID') });
        const targetId = joki[index].id;
        joki.splice(index, 1); simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "joki", id: targetId }, null, "", "");
    }
}

// --- ENGINE JADWAL TUGAS UNISKA ---
document.getElementById('form-tugas').addEventListener('submit', async function(e) {
    e.preventDefault();
    const dataBaru = { id: "TGS-" + Date.now(), namaTugas: document.getElementById('nama-tugas').value, matkul: document.getElementById('matkul-tugas').value, tipe: document.getElementById('tipe-tugas').value, deadline: document.getElementById('deadline-tugas').value, email: document.getElementById('email-tugas').value, status: "Belum Selesai" };
    tugas.push(dataBaru); simpanData(); updateUI();
    await sendToBackend({ action: "addTugas", ...dataBaru }, document.getElementById('btn-submit-tugas'), "MENSINKRONKAN ALARM...", "SIMPAN TUGAS");
    this.reset();
});

async function selesaikanTugas(index) {
    if(confirm(`Nyatakan Selesai Tugas ${tugas[index].namaTugas}?`)) {
        const targetId = tugas[index].id;
        tugas.splice(index, 1); simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "tugas", id: targetId }, null, "", "");
    }
}

// --- ENGINE MONITORING TAGIHAN PRIBADI ---
document.getElementById('form-cicilan').addEventListener('submit', async function(e) {
    e.preventDefault();
    const dataBaru = { id: "ID-" + Date.now(), nama: document.getElementById('nama-tagihan').value, jumlah: parseInt(document.getElementById('jumlah-tagihan').value), tanggalFull: document.getElementById('tgl-jatuh-tempo').value, email: document.getElementById('email-tagihan').value, status: "Belum Bayar" };
    cicilan.push(dataBaru); simpanData(); updateUI();
    await sendToBackend({ action: "addTagihan", ...dataBaru }, document.getElementById('btn-submit-tagihan'), "MENGAMANKAN SERVER...", "SIMPAN TAGIHAN");
    this.reset();
});

async function bayarTagihan(index) {
    if(confirm(`Nyatakan Lunas Untuk Tagihan ${cicilan[index].nama}?`)) {
        const targetId = cicilan[index].id;
        cicilan.splice(index, 1); simpanData(); updateUI();
        sendToBackend({ action: "selesai", tipe: "tagihan", id: targetId }, null, "", "");
    }
}

// --- ENGINE PDF PREMIUM ---
function unduhPDF(modul, range) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tglSekarang = new Date().toLocaleDateString('id-ID');
    let judulDokumen = "", headers = [], rows = [];
    
    if (modul === 'bisnis') {
        judulDokumen = `LAPORAN TRANSAKSI AGEN MANDIRI LINK PRO - (${range.toUpperCase()})`;
        headers = [["Waktu/Tanggal", "Jenis Layanan", "Keterangan Nasabah", "Nominal Mutasi", "Laba Admin", "Dompet"]];
        let dataSumber = (range === 'hari') ? bisnis.riwayat.filter(item => item.tanggal === tglSekarang) : bisnis.riwayat;
        dataSumber.forEach(item => { rows.push([`${item.waktu} / ${item.tanggal}`, item.jenis, item.ket, formatRupiah(item.nominal), formatRupiah(item.admin), item.dompet]); });
    } else if (modul === 'joki') {
        judulDokumen = `LAPORAN PENGHASILAN REKAPITULASI JOKI KILAT - (${range.toUpperCase()})`;
        headers = [["Waktu/Tanggal", "Nama Project/Klien", "Omset Fee Keuntungan"]];
        let dataSumber = (range === 'hari') ? jokiLogOmset.filter(item => item.tanggal === tglSekarang) : jokiLogOmset;
        dataSumber.forEach(item => { rows.push([`${item.waktu} / ${item.tanggal}`, item.namaProject, formatRupiah(item.biaya)]); });
    } else if (modul === 'pribadi') {
        judulDokumen = `LAPORAN MUTASI ARUS KAS KEUANGAN PRIBADI - (${range.toUpperCase()})`;
        headers = [["Waktu/Tanggal", "Arus Mutasi", "Keterangan Aliran", "Nominal", "Penyimpanan"]];
        let dataSumber = (range === 'hari') ? riwayat.filter(item => item.tanggal === tglSekarang) : riwayat;
        dataSumber.forEach(item => { rows.push([`${item.waktu} / ${item.tanggal}`, item.jenis === 'masuk' ? 'Pemasukan (+)' : 'Pengeluaran (-)', item.ket, formatRupiah(item.nominal), item.dompet]); });
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(judulDokumen, 14, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(`Dicetak Otomatis pada Tanggal: ${new Date().toLocaleString('id-ID')} WITA`, 14, 26);
    doc.text(`Penanggung Jawab Sistem: Muhammad Zailani`, 14, 31); doc.line(14, 35, 196, 35);
    doc.autoTable({ startY: 40, head: headers, body: rows, theme: 'striped', headStyles: { fillColor: [37, 99, 235] }, bodyStyles: { fontSize: 9 } });
    doc.save(`Laporan_${modul}_${range}_${Date.now()}.pdf`);
}

// --- FIX AUDIT 4: SISTEM ENKRIPSI KEAMANAN DATA (BASE64) ---
function checkPasswordAndNav() { document.getElementById('password-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('password-modal').classList.add('hidden'); document.getElementById('input-password').value = ''; }
function verifyPassword() { if (document.getElementById('input-password').value === PIN_RAHASIA) { closeModal(); nav('akun'); } else { alert("AKSES PIN SALAH!"); document.getElementById('input-password').value = ''; } }
function lockAccounts() { nav('dashboard'); }
document.getElementById('form-akun').addEventListener('submit', function(e) { 
    e.preventDefault(); 
    // Menyandikan (Encrypt) Password menggunakan Base64 standar web
    let encryptedPass = btoa(document.getElementById('pass-akun').value);
    akunPenting.push({ platform: document.getElementById('platform-akun').value, user: document.getElementById('user-akun').value, pass: encryptedPass }); 
    simpanData(); this.reset(); updateUI(); 
});
function hapusAkun(index) { akunPenting.splice(index, 1); simpanData(); updateUI(); }

function simpanData() { 
    localStorage.setItem('keuangan', JSON.stringify(keuangan)); localStorage.setItem('riwayatClean', JSON.stringify(riwayat)); 
    localStorage.setItem('tugasPro', JSON.stringify(tugas)); localStorage.setItem('cicilanPro', JSON.stringify(cicilan)); 
    localStorage.setItem('akunPenting', JSON.stringify(akunPenting)); localStorage.setItem('bisnisPro', JSON.stringify(bisnis)); 
    localStorage.setItem('jokiPro', JSON.stringify(joki)); localStorage.setItem('jokiLogOmsetPro', JSON.stringify(jokiLogOmset));
    localStorage.setItem('catatanKilatPro', JSON.stringify(catatanKilat)); 
}

// --- FIX AUDIT 2: FUNGSI RENDER GRAFIK (CHART.JS) ---
function renderChart() {
    const ctx = document.getElementById('grafikBisnis');
    if(!ctx) return; // Prevent error jika canvas tidak siap
    
    if (chartInstance) chartInstance.destroy(); // Hancurkan chart lama agar tidak bertumpuk
    
    let labels = []; let dataBisnis = []; let dataJoki = [];
    
    // Kalkulasi Pendapatan 7 Hari Terakhir
    for(let i=6; i>=0; i--) {
        let d = new Date(); d.setDate(d.getDate() - i);
        let dateStr = d.toLocaleDateString('id-ID');
        labels.push(d.toLocaleDateString('id-ID', {day:'numeric', month:'short'}));
        
        let sumBisnis = bisnis.riwayat.filter(r => r.tanggal === dateStr).reduce((a, b) => a + b.admin, 0);
        let sumJoki = jokiLogOmset.filter(r => r.tanggal === dateStr).reduce((a, b) => a + b.biaya, 0);
        
        dataBisnis.push(sumBisnis); dataJoki.push(sumJoki);
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Laba Mandiri Link', data: dataBisnis, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 3, fill: true, tension: 0.4 },
                { label: 'Omset Joki Kilat', data: dataJoki, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } } }
    });
}

// --- REAL-TIME ENGINE UPDATE UI ---
function updateUI() {
    const tglSekarang = new Date().toLocaleDateString('id-ID');
    const omsetJokiHariIni = jokiLogOmset.filter(item => item.tanggal === tglSekarang).reduce((sum, item) => sum + item.biaya, 0);

    document.getElementById('laba-bisnis').innerText = formatRupiah(bisnis.profit);
    document.getElementById('laba-joki').innerText = formatRupiah(omsetJokiHariIni);
    document.getElementById('count-tugas').innerText = tugas.length; document.getElementById('count-joki').innerText = joki.length;
    document.getElementById('bisnis-cash').innerText = formatRupiah(bisnis.cash); document.getElementById('bisnis-atm').innerText = formatRupiah(bisnis.atm); document.getElementById('bisnis-profit').innerText = formatRupiah(bisnis.profit);

    // Update List Catatan Kilat
    const lc = document.getElementById('list-catatan'); lc.innerHTML = catatanKilat.length === 0 ? '<p class="text-xs text-slate-500 italic mt-2">Belum ada ide tercatat.</p>' : '';
    catatanKilat.forEach((c, i) => { lc.innerHTML += `<li class="flex justify-between items-start bg-slate-900/50 p-2.5 rounded-lg border border-slate-800"><div class="flex-1"><p class="text-sm text-slate-200">${c.isi}</p><p class="text-[10px] text-slate-500 mt-1">${c.waktu}</p></div><button onclick="hapusCatatan(${i})" class="text-slate-500 hover:text-red-400 ml-2"><i class="fa-solid fa-xmark"></i></button></li>`; });

    const lr = document.getElementById('list-riwayat'); lr.innerHTML = riwayat.length === 0 ? '<p class="text-sm text-slate-500">Belum ada mutasi keuangan kas pribadi.</p>' : '';
    riwayat.forEach(r => { const color = r.jenis === 'masuk' ? 'text-green-400' : 'text-red-400'; lr.innerHTML += `<li class="flex justify-between border-b border-slate-800 pb-3"><div><p class="font-bold text-slate-200 capitalize text-sm">${r.ket}</p><p class="text-[11px] text-slate-500 font-medium capitalize mt-0.5">${r.waktu} / ${r.tanggal} — Via ${r.dompet}</p></div><span class="${color} font-bold text-sm">${r.jenis === 'masuk'?'+':'-'} ${formatRupiah(r.nominal)}</span></li>`; });

    const lb = document.getElementById('list-bisnis'); lb.innerHTML = bisnis.riwayat.length === 0 ? '<p class="text-sm text-slate-500">Belum ada mutasi agen terdaftar.</p>' : '';
    bisnis.riwayat.forEach(r => { lb.innerHTML += `<li class="flex justify-between items-center border-b border-slate-800 pb-3"><div><p class="font-bold text-slate-200 text-sm">${r.jenis} <span class="text-xs font-normal text-slate-400">(${r.ket})</span></p><p class="text-[11px] font-semibold text-green-400 mt-0.5">Laba Admin: +${formatRupiah(r.admin)} <span class="text-slate-500 font-normal">(${r.waktu})</span></p></div><span class="font-bold text-slate-300 text-sm">${formatRupiah(r.nominal)}</span></li>`; });

    const lj = document.getElementById('list-joki'); lj.innerHTML = '';
    joki.forEach((j, i) => { const d = new Date(j.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short'});
        lj.innerHTML += `<div class="glass-card p-5 border-l-4 border-l-orange-500"><h4 class="font-extrabold text-base text-slate-200 uppercase">${j.nama}</h4><p class="text-xs text-slate-400 font-medium mt-0.5">WA Klien: ${j.wa}</p><p class="font-bold text-blue-400 my-2 text-base">${formatRupiah(j.biaya)}</p><p class="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-4"><i class="fa-regular fa-clock text-orange-400"></i> Target Batas: ${d}</p><button onclick="selesaikanJoki(${i})" class="btn-clean btn-primary text-xs py-2.5">Nyatakan Selesai & Amankan Fee</button></div>`; });

    const l_tugas = document.getElementById('list-tugas'); l_tugas.innerHTML = '';
    tugas.forEach((t, i) => { const d = new Date(t.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short'});
        l_tugas.innerHTML += `<div class="glass-card p-5 border-l-4 border-l-blue-500"><h4 class="font-extrabold text-base text-slate-200 truncate uppercase">${t.namaTugas}</h4><p class="text-xs font-bold text-slate-400 mt-0.5">${t.matkul} (${t.tipe})</p><p class="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mt-3 mb-4"><i class="fa-regular fa-clock text-blue-400"></i> Batas Kumpul: ${d}</p><button onclick="selesaikanTugas(${i})" class="btn-clean btn-primary text-xs py-2.5">Tandai Tugas Selesai</button></div>`; });

    const l_cicil = document.getElementById('list-cicilan'); l_cicil.innerHTML = '';
    cicilan.forEach((c, i) => { const d = new Date(c.tanggalFull).toLocaleDateString('id-ID', {day:'numeric',month:'short'});
        l_cicil.innerHTML += `<div class="glass-card p-5 border-l-4 border-l-purple-500"><h4 class="font-extrabold text-base text-slate-200 truncate uppercase">${c.nama}</h4><p class="font-bold text-red-400 my-2 text-base">${formatRupiah(c.jumlah)}</p><p class="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-4"><i class="fa-regular fa-clock text-purple-400"></i> Jatuh Tempo: ${d}</p><button onclick="bayarTagihan(${i})" class="btn-clean btn-primary text-xs py-2.5">Tandai Lunas Pembayaran</button></div>`; });

    // Merender Akun & Mendekripsi Password (atob) untuk ditampilkan di layar
    const la = document.getElementById('list-akun'); la.innerHTML = akunPenting.length === 0 ? '<p class="text-xs text-slate-500">Belum ada penyimpanan kredensial akun rahasia.</p>' : '';
    akunPenting.forEach((a, i) => { 
        let decryptedPass = "Error"; try { decryptedPass = atob(a.pass); } catch(e) { decryptedPass = a.pass; } // Fallback jika bukan base64
        la.innerHTML += `<div class="glass-card p-4 flex justify-between items-center"><div class="overflow-hidden mr-3"><p class="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">${a.platform}</p><p class="text-sm font-bold text-slate-200 truncate"><i class="fa-solid fa-user text-slate-500 mr-1.5"></i>${a.user}</p><p class="text-xs font-mono text-slate-400 mt-1 bg-slate-950 px-2 py-1 rounded border border-slate-800 tracking-widest inline-block">${decryptedPass}</p></div><button onclick="hapusAkun(${i})" class="text-slate-500 hover:text-red-400 transition p-2"><i class="fa-solid fa-trash"></i></button></div>`; 
    });

    // Panggil ulang render grafik agar garis tren selalu up-to-date
    renderChart();
}

// Inisialisasi awal UI saat web dimuat
updateUI();