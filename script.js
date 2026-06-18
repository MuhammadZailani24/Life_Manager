const GAS_URL = "https://script.google.com/macros/s/AKfycbxXPMmLYeiro2Bq2kOLnfbUjXNQKFCwD4SK7vupGsaWqNhpxIDu-8y_VHPelrT521JHqw/exec";
const PIN_RAHASIA = "998877"; 

let oldK = JSON.parse(localStorage.getItem('keuangan'));
let keuangan = oldK ? (oldK.total !== undefined ? oldK : { total: (oldK.cash||0) + (oldK.atm||0) }) : { total: 0 };
let riwayat = JSON.parse(localStorage.getItem('riwayatClean')) || []; 
let tugas = JSON.parse(localStorage.getItem('tugasPro')) || []; 
let cicilan = JSON.parse(localStorage.getItem('cicilanPro')) || [];
let akunPenting = JSON.parse(localStorage.getItem('akunPenting')) || [];
let oldB = JSON.parse(localStorage.getItem('bisnisPro'));
let bisnis = oldB ? oldB : { profit: 0, riwayat: [] };
if(bisnis.profit === undefined) bisnis.profit = 0; if(bisnis.riwayat === undefined) bisnis.riwayat = [];
let joki = JSON.parse(localStorage.getItem('jokiPro')) || [];
let jokiLogOmset = JSON.parse(localStorage.getItem('jokiLogOmsetPro')) || []; 
let catatanKilat = JSON.parse(localStorage.getItem('catatanKilatPro')) || [];

let lastDate = localStorage.getItem('lastDateReset');
let chartInstance = null; 

if(lastDate !== new Date().toDateString()) { bisnis.profit = 0; localStorage.setItem('lastDateReset', new Date().toDateString()); simpanData(); }

let currentTheme = localStorage.getItem('theme') || 'dark';
document.body.setAttribute('data-theme', currentTheme);

function toggleTheme() { currentTheme = currentTheme === 'dark' ? 'light' : 'dark'; document.body.setAttribute('data-theme', currentTheme); localStorage.setItem('theme', currentTheme); const icon = document.getElementById('theme-icon'); icon.className = currentTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; }
setInterval(() => { document.getElementById('live-clock').innerText = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " WITA"; }, 1000);

function toggleAccordion(id) { document.getElementById(id).classList.toggle('active'); }
function toggleAddMenu() { const menu = document.getElementById('fab-menu'); menu.classList.toggle('hidden'); }
function nav(sectionId) { document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden')); document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active')); document.getElementById(`sec-${sectionId}`).classList.remove('hidden'); event.currentTarget.classList.add('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); updateUI(); }
function formatRupiah(angka) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka); }

async function sendToBackend(payload, btnElement, loadingText, defaultText) {
    if(btnElement) { btnElement.innerText = loadingText; btnElement.disabled = true; }
    try { await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }); } catch(err) { console.error(err); }
    if(btnElement) { btnElement.innerText = defaultText; btnElement.disabled = false; }
}

function openModal(type) {
    toggleAddMenu(); 
    const container = document.getElementById('modal-container'); const content = document.getElementById('modal-content'); container.classList.remove('hidden');
    const headerHtml = (title) => `<div class="flex justify-between items-center mb-5"><h3 class="font-extrabold text-lg text-slate-100">${title}</h3><button onclick="closeModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/50 text-slate-400 hover:bg-red-500 hover:text-white transition-colors"><i class="fa-solid fa-xmark"></i></button></div>`;
    if(type === 'modal-bisnis') { content.innerHTML = headerHtml('Tambah Transaksi Agen') + `<select id="f-jenis-b" class="input-clean mb-3"><option>Tarik Tunai</option><option>Transfer</option><option>Top Up</option></select><input type="number" id="f-nominal-b" class="input-clean mb-3" placeholder="Nominal (Rp)"><input type="number" id="f-admin-b" class="input-clean mb-3" placeholder="Admin (Keuntungan)"><input type="text" id="f-ket-b" class="input-clean mb-4" placeholder="Nama Nasabah"><button onclick="saveBisnis()" class="btn-clean btn-primary w-full">Simpan Transaksi</button>`; } 
    else if(type === 'modal-joki') { content.innerHTML = headerHtml('Tambah Project Joki') + `<input type="text" id="f-nama-j" class="input-clean mb-3" placeholder="Nama Pelanggan"><input type="date" id="f-deadline-j" class="input-clean mb-3"><input type="number" id="f-biaya-j" class="input-clean mb-4" placeholder="Fee Deal (Rp)"><button onclick="saveJoki()" class="btn-clean btn-primary w-full">Simpan Project</button>`; } 
    else if(type === 'modal-tugas') { content.innerHTML = headerHtml('Tambah Tugas Uniska') + `<input type="text" id="f-nama-t" class="input-clean mb-3" placeholder="Judul Tugas"><input type="text" id="f-matkul-t" class="input-clean mb-3" placeholder="Mata Kuliah"><input type="date" id="f-deadline-t" class="input-clean mb-4"><button onclick="saveTugas()" class="btn-clean btn-primary w-full">Simpan Tugas</button>`; } 
    else if(type === 'modal-tagihan') { content.innerHTML = headerHtml('Tambah Tagihan Pribadi') + `<input type="text" id="f-nama-c" class="input-clean mb-3" placeholder="Nama Tagihan"><input type="number" id="f-jumlah-c" class="input-clean mb-3" placeholder="Jumlah (Rp)"><input type="date" id="f-deadline-c" class="input-clean mb-4"><button onclick="saveCicilan()" class="btn-clean btn-primary w-full">Simpan Tagihan</button>`; } 
    else if(type === 'modal-pribadi') { content.innerHTML = headerHtml('Tambah Arus Kas Pribadi') + `<select id="f-jenis-p" class="input-clean mb-3"><option value="masuk">Pemasukan (+)</option><option value="keluar">Pengeluaran (-)</option></select><input type="number" id="f-nominal-p" class="input-clean mb-3" placeholder="Nominal (Rp)"><input type="text" id="f-ket-p" class="input-clean mb-4" placeholder="Keterangan"><button onclick="saveKas()" class="btn-clean btn-primary w-full">Simpan Mutasi Kas</button>`; }
}
function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }

function saveBisnis() { const admin = parseInt(document.getElementById('f-admin-b').value); bisnis.profit += admin; bisnis.riwayat.unshift({ jenis: document.getElementById('f-jenis-b').value, nominal: parseInt(document.getElementById('f-nominal-b').value), admin, ket: document.getElementById('f-ket-b').value, tanggal: new Date().toLocaleDateString('id-ID'), waktu: new Date().toLocaleTimeString('id-ID') }); simpanData(); closeModal(); updateUI(); }
function saveJoki() { const newData = { id: "JK-"+Date.now(), nama: document.getElementById('f-nama-j').value, deadline: document.getElementById('f-deadline-j').value, biaya: parseInt(document.getElementById('f-biaya-j').value), wa: "628", email: "lifemanager17@gmail.com", status: "Proses" }; joki.push(newData); simpanData(); closeModal(); updateUI(); sendToBackend({ action: "addJoki", ...newData }); }
function saveTugas() { const newData = { id: "TGS-"+Date.now(), namaTugas: document.getElementById('f-nama-t').value, matkul: document.getElementById('f-matkul-t').value, deadline: document.getElementById('f-deadline-t').value, tipe: "Individu", email: "lifemanager17@gmail.com", status: "Belum Selesai" }; tugas.push(newData); simpanData(); closeModal(); updateUI(); sendToBackend({ action: "addTugas", ...newData }); }
function saveCicilan() { const newData = { id: "ID-"+Date.now(), nama: document.getElementById('f-nama-c').value, jumlah: parseInt(document.getElementById('f-jumlah-c').value), tanggalFull: document.getElementById('f-deadline-c').value, email: "lifemanager17@gmail.com", status: "Belum Bayar" }; cicilan.push(newData); simpanData(); closeModal(); updateUI(); sendToBackend({ action: "addTagihan", ...newData }); }
function saveKas() { const nominal = parseInt(document.getElementById('f-nominal-p').value); const jenis = document.getElementById('f-jenis-p').value; keuangan.total = (jenis === 'masuk') ? keuangan.total + nominal : keuangan.total - nominal; riwayat.unshift({ jenis, nominal, ket: document.getElementById('f-ket-p').value, tanggal: new Date().toLocaleDateString('id-ID'), waktu: new Date().toLocaleTimeString('id-ID') }); simpanData(); closeModal(); updateUI(); }

document.getElementById('form-catatan').addEventListener('submit', function(e) { e.preventDefault(); catatanKilat.unshift({ isi: document.getElementById('input-catatan').value, waktu: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) }); simpanData(); this.reset(); updateUI(); });
function hapusCatatan(index) { catatanKilat.splice(index, 1); simpanData(); updateUI(); }

function clearAllKeuangan() { if(confirm("Yakin hapus data kas & reset saldo?")) { riwayat = []; keuangan.total = 0; simpanData(); updateUI(); } }
function clearAllBisnis() { if(confirm("Yakin hapus riwayat transaksi Mandiri Link?")) { bisnis.riwayat = []; simpanData(); updateUI(); } }
async function clearAllJoki() { if(confirm("Yakin hapus semua data Joki?")) { joki = []; jokiLogOmset = []; simpanData(); updateUI(); await sendToBackend({ action: "clearAll", tipe: "joki" }, null, "", ""); } }
async function clearAllTugas() { if(confirm("Yakin hapus semua tugas Uniska?")) { tugas = []; simpanData(); updateUI(); await sendToBackend({ action: "clearAll", tipe: "tugas" }, null, "", ""); } }
async function clearAllCicilan() { if(confirm("Yakin hapus semua kartu tagihan?")) { cicilan = []; simpanData(); updateUI(); await sendToBackend({ action: "clearAll", tipe: "tagihan" }, null, "", ""); } }

async function selesaikanJoki(i) { if(!confirm("Selesaikan Joki?")) return; jokiLogOmset.unshift({ ...joki[i], waktu: new Date().toLocaleTimeString('id-ID') }); const targetId = joki[i].id; joki.splice(i, 1); simpanData(); updateUI(); await sendToBackend({ action: "selesai", tipe: "joki", id: targetId }); }
async function selesaikanTugas(i) { if(!confirm("Tugas Selesai?")) return; const targetId = tugas[i].id; tugas.splice(i, 1); simpanData(); updateUI(); await sendToBackend({ action: "selesai", tipe: "tugas", id: targetId }); }
async function bayarTagihan(i) { if(!confirm("Tagihan Lunas?")) return; const targetId = cicilan[i].id; cicilan.splice(i, 1); simpanData(); updateUI(); await sendToBackend({ action: "selesai", tipe: "tagihan", id: targetId }); }

function buildUnifiedFeed() {
    const feed = document.getElementById('unified-feed'); feed.innerHTML = ''; let all = [];
    joki.forEach((j, i) => all.push({ ...j, type: 'joki', title: j.nama, d: j.deadline, index: i }));
    tugas.forEach((t, i) => all.push({ ...t, type: 'tugas', title: t.namaTugas, d: t.deadline, index: i }));
    cicilan.forEach((c, i) => all.push({ ...c, type: 'tagihan', title: c.nama, d: c.tanggalFull, index: i }));
    all.sort((a,b) => new Date(a.d) - new Date(b.d));

    if(all.length === 0) { feed.innerHTML = `<p class="text-xs text-center text-slate-500 italic py-4">Semua target tercapai. Tidak ada deadline.</p>`; return; }
    all.slice(0, 5).forEach(item => {
        const date = new Date(item.d).toLocaleDateString('id-ID', { day:'numeric', month:'short' });
        feed.innerHTML += `<div class="glass-card p-4 flex justify-between items-center border-l-4 ${item.type==='joki'?'border-orange-500':item.type==='tugas'?'border-blue-500':'border-red-500'}"><div><div class="flex items-center gap-2 mb-1"><span class="priority-tag tag-${item.type}">${item.type}</span><span class="text-[10px] font-bold opacity-50">${date}</span></div><p class="text-sm font-black uppercase">${item.title}</p></div><button onclick="selesaikanFeed('${item.type}', ${item.index})" class="text-blue-500 text-xs font-black p-2"><i class="fa-solid fa-check-double"></i></button></div>`;
    });
}
function selesaikanFeed(type, index) { if(type === 'joki') selesaikanJoki(index); else if(type === 'tugas') selesaikanTugas(index); else if(type === 'tagihan') bayarTagihan(index); }

function simpanData() {
    localStorage.setItem('keuangan', JSON.stringify(keuangan)); localStorage.setItem('riwayatClean', JSON.stringify(riwayat));
    localStorage.setItem('tugasPro', JSON.stringify(tugas)); localStorage.setItem('cicilanPro', JSON.stringify(cicilan));
    localStorage.setItem('bisnisPro', JSON.stringify(bisnis)); localStorage.setItem('jokiPro', JSON.stringify(joki));
    localStorage.setItem('jokiLogOmsetPro', JSON.stringify(jokiLogOmset)); localStorage.setItem('catatanKilatPro', JSON.stringify(catatanKilat));
    localStorage.setItem('akunPenting', JSON.stringify(akunPenting));
}

// FIX: PENGAPLIKASIAN ID BARU KE DALAM JS
function updateUI() {
    joki.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); tugas.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); cicilan.sort((a, b) => new Date(a.tanggalFull) - new Date(b.tanggalFull));
    
    // Khusus di dalam Modul Masing-masing
    const elBisnis = document.getElementById('bisnis-profit'); if(elBisnis) elBisnis.innerText = formatRupiah(bisnis.profit);
    const elKas = document.getElementById('total-kas-pribadi'); if(elKas) elKas.innerText = formatRupiah(keuangan.total);
    
    // Khusus di Layar Dashboard
    const elTagihan = document.getElementById('count-tagihan'); if(elTagihan) elTagihan.innerText = cicilan.length + " Items";
    const elJoki = document.getElementById('count-joki'); if(elJoki) elJoki.innerText = joki.length + " Items";
    const elTugas = document.getElementById('count-tugas'); if(elTugas) elTugas.innerText = tugas.length + " Items";

    buildUnifiedFeed(); renderListBisnis(); renderListKas(); renderListJoki(); renderListTugasDanCicilan(); renderChart(); renderTableAkun();
    
    const lc = document.getElementById('list-catatan'); lc.innerHTML = catatanKilat.length === 0 ? '<p class="text-xs text-slate-500 italic mt-2">Belum ada ide tercatat.</p>' : '';
    catatanKilat.forEach((c, i) => { lc.innerHTML += `<li class="flex justify-between items-start bg-slate-900/50 p-2.5 rounded-lg border border-slate-800"><div class="flex-1"><p class="text-sm text-slate-200">${c.isi}</p><p class="text-[10px] text-slate-500 mt-1">${c.waktu}</p></div><button onclick="hapusCatatan(${i})" class="text-slate-500 hover:text-red-400 ml-2"><i class="fa-solid fa-xmark"></i></button></li>`; });
}

function renderListBisnis() {
    const list = document.getElementById('list-bisnis'); list.innerHTML = '';
    bisnis.riwayat.slice(0, 10).forEach(r => { list.innerHTML += `<li class="glass-card p-3 text-xs flex justify-between items-center"><div><b>${r.jenis}</b> <span class="opacity-70">(${r.ket})</span><br><span class="text-[10px] text-green-500 font-bold">Laba: +${formatRupiah(r.admin)}</span></div><span class="font-bold">${formatRupiah(r.nominal)}</span></li>`; });
}
function renderListKas() {
    const list = document.getElementById('list-riwayat'); list.innerHTML = '';
    riwayat.slice(0, 10).forEach(r => { list.innerHTML += `<li class="glass-card p-3 text-xs flex justify-between"><div><b>${r.ket}</b><br><span class="text-[10px] opacity-60">${r.waktu} / ${r.tanggal}</span></div><span class="${r.jenis==='masuk'?'text-green-400':'text-red-400'} font-bold">${r.jenis==='masuk'?'+':'-'}${formatRupiah(r.nominal)}</span></li>`; });
}
function renderListJoki() {
    const list = document.getElementById('list-joki'); list.innerHTML = '';
    joki.forEach((j, i) => {
        const d = new Date(j.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short'});
        list.innerHTML += `<div class="glass-card p-4 flex flex-col gap-2 border-l-4 border-orange-500"><div class="flex justify-between items-center"><h4 class="font-bold uppercase">${j.nama}</h4><p class="text-blue-500 font-bold">${formatRupiah(j.biaya)}</p></div><div class="flex justify-between items-center mt-2"><p class="text-xs opacity-70"><i class="fa-regular fa-clock"></i> Target: ${d}</p><button onclick="selesaikanJoki(${i})" class="btn-clean btn-primary text-[10px] py-1 px-3">Selesai & Amankan Fee</button></div></div>`;
    });
}
function renderListTugasDanCicilan() {
    const l_tugas = document.getElementById('list-tugas'); l_tugas.innerHTML = '';
    tugas.forEach((t, i) => { const d = new Date(t.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short'});
        l_tugas.innerHTML += `<div class="glass-card p-5 border-l-4 border-l-blue-500 relative"><h4 class="font-extrabold text-base text-slate-200 truncate uppercase pr-6">${t.namaTugas}</h4><p class="text-xs font-bold text-slate-400 mt-0.5">${t.matkul}</p><p class="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mt-3 mb-4"><i class="fa-regular fa-clock text-blue-400"></i> Batas: ${d} <button onclick="openEditModal('tugasTanggal', ${i})" class="ml-2 text-blue-400 hover:text-white px-2 py-1 bg-slate-800 rounded"><i class="fa-solid fa-pen"></i></button></p><button onclick="selesaikanTugas(${i})" class="btn-clean btn-primary text-xs py-2.5">Tandai Selesai</button></div>`; });
    const l_cicil = document.getElementById('list-cicilan'); l_cicil.innerHTML = '';
    cicilan.forEach((c, i) => { const d = new Date(c.tanggalFull).toLocaleDateString('id-ID', {day:'numeric',month:'short'});
        l_cicil.innerHTML += `<div class="glass-card p-5 border-l-4 border-l-purple-500 relative"><h4 class="font-extrabold text-base text-slate-200 truncate uppercase pr-6">${c.nama}</h4><div class="flex items-center gap-2 my-2"><p class="font-bold text-red-400 text-base">${formatRupiah(c.jumlah)}</p><button onclick="openEditModal('cicilanJumlah', ${i})" class="text-blue-400 hover:text-white px-2 py-1 bg-slate-800 rounded text-xs"><i class="fa-solid fa-pen"></i></button></div><p class="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-4"><i class="fa-regular fa-clock text-purple-400"></i> Jatuh Tempo: ${d} <button onclick="openEditModal('cicilanTanggal', ${i})" class="ml-2 text-blue-400 hover:text-white px-2 py-1 bg-slate-800 rounded"><i class="fa-solid fa-pen"></i></button></p><button onclick="bayarTagihan(${i})" class="btn-clean btn-primary text-xs py-2.5">Tandai Lunas</button></div>`; });
}

let editTarget = null;
function openEditModal(type, index) {
    editTarget = { type, index }; const modal = document.getElementById('edit-modal'); const input = document.getElementById('edit-input'); const title = document.getElementById('edit-title');
    if (type === 'tugasTanggal') { title.innerText = "Ubah Deadline Tugas"; input.type = "date"; input.value = tugas[index].deadline; } 
    else if (type === 'cicilanTanggal') { title.innerText = "Ubah Jatuh Tempo"; input.type = "date"; input.value = cicilan[index].tanggalFull; } 
    else if (type === 'cicilanJumlah') { title.innerText = "Ubah Jumlah Tagihan"; input.type = "number"; input.value = cicilan[index].jumlah; }
    modal.classList.remove('hidden');
}
function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }
async function saveEdit() {
    const input = document.getElementById('edit-input').value; if(!input) return alert("Data tidak boleh kosong!");
    let payload = {};
    if (editTarget.type === 'tugasTanggal') { tugas[editTarget.index].deadline = input; payload = { action: "edit", tipe: "tugasTanggal", id: tugas[editTarget.index].id, val: input }; } 
    else if (editTarget.type === 'cicilanTanggal') { cicilan[editTarget.index].tanggalFull = input; payload = { action: "edit", tipe: "tagihanTanggal", id: cicilan[editTarget.index].id, val: input }; } 
    else if (editTarget.type === 'cicilanJumlah') { cicilan[editTarget.index].jumlah = parseInt(input); payload = { action: "edit", tipe: "tagihanJumlah", id: cicilan[editTarget.index].id, val: input }; }
    simpanData(); updateUI(); closeEditModal(); await sendToBackend(payload, null, "", "");
}

function renderChart() {
    const ctx = document.getElementById('grafikBisnis'); if(!ctx) return;
    if(chartInstance) chartInstance.destroy();
    let labels = []; let dataBisnis = []; let dataJoki = [];
    for(let i=6; i>=0; i--) {
        let d = new Date(); d.setDate(d.getDate()-i); let dateStr = d.toLocaleDateString('id-ID'); labels.push(d.toLocaleDateString('id-ID', {day:'numeric', month:'short'}));
        dataBisnis.push(bisnis.riwayat.filter(r => r.tanggal === dateStr).reduce((a,b) => a+b.admin, 0)); dataJoki.push(jokiLogOmset.filter(r => r.tanggal === dateStr).reduce((a,b) => a+b.biaya, 0));
    }
    chartInstance = new Chart(ctx, { type: 'line', data: { labels, datasets: [ { label: 'Laba Agen', data: dataBisnis, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderWidth: 3, fill: true, tension: 0.4 }, { label: 'Omset Joki', data: dataJoki, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, fill: true, tension: 0.4 } ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } }, scales: { x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } } } } });
}

function unduhPDF(modul, range) {
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); const tglSekarang = new Date().toLocaleDateString('id-ID'); let judulDokumen = "", headers = [], rows = [];
    if (modul === 'bisnis') {
        judulDokumen = `LAPORAN TRANSAKSI MANDIRI LINK PRO - (${range.toUpperCase()})`; headers = [["Waktu/Tanggal", "Jenis Layanan", "Keterangan Nasabah", "Mutasi", "Laba Admin"]];
        let dataSumber = (range === 'hari') ? bisnis.riwayat.filter(item => item.tanggal === tglSekarang) : bisnis.riwayat;
        dataSumber.forEach(item => { rows.push([`${item.waktu} / ${item.tanggal}`, item.jenis, item.ket, formatRupiah(item.nominal), formatRupiah(item.admin)]); });
    } else if (modul === 'joki') {
        judulDokumen = `LAPORAN PENGHASILAN JOKI KILAT - (${range.toUpperCase()})`; headers = [["Waktu/Tanggal", "Nama Project/Klien", "Omset Fee Keuntungan"]];
        let dataSumber = (range === 'hari') ? jokiLogOmset.filter(item => item.tanggal === tglSekarang) : jokiLogOmset;
        dataSumber.forEach(item => { rows.push([`${item.waktu} / ${item.tanggal}`, item.namaProject, formatRupiah(item.biaya)]); });
    } else if (modul === 'pribadi') {
        judulDokumen = `LAPORAN ARUS KAS PRIBADI - (${range.toUpperCase()})`; headers = [["Waktu/Tanggal", "Arus Mutasi", "Keterangan", "Nominal"]];
        let dataSumber = (range === 'hari') ? riwayat.filter(item => item.tanggal === tglSekarang) : riwayat;
        dataSumber.forEach(item => { rows.push([`${item.waktu} / ${item.tanggal}`, item.jenis === 'masuk' ? 'Pemasukan (+)' : 'Pengeluaran (-)', item.ket, formatRupiah(item.nominal)]); });
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(judulDokumen, 14, 20); doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')} WITA`, 14, 26); doc.text(`Admin: Muhammad Zailani`, 14, 31); doc.line(14, 35, 196, 35);
    doc.autoTable({ startY: 40, head: headers, body: rows, theme: 'striped', headStyles: { fillColor: [37, 99, 235] } }); doc.save(`Laporan_${modul}_${range}_${Date.now()}.pdf`);
}

function checkPasswordAndNav() { document.getElementById('password-modal').classList.remove('hidden'); }
function closePassword() { document.getElementById('password-modal').classList.add('hidden'); document.getElementById('input-password').value = ''; }
function verifyPassword() { if(document.getElementById('input-password').value === PIN_RAHASIA) { closePassword(); nav('akun'); } else { alert("PIN SALAH!"); } }
function lockAccounts() { nav('dashboard'); }

document.getElementById('form-akun').addEventListener('submit', function(e) { 
    e.preventDefault(); 
    let encryptedPass = btoa(document.getElementById('pass-akun').value);
    akunPenting.push({ platform: document.getElementById('platform-akun').value.trim(), user: document.getElementById('user-akun').value, pass: encryptedPass }); 
    simpanData(); this.reset(); updateUI(); 
});
function hapusAkun(index) { akunPenting.splice(index, 1); simpanData(); updateUI(); }

function renderTableAkun() {
    const listAkun = document.getElementById('list-akun');
    if (!listAkun) return;
    if (akunPenting.length === 0) { listAkun.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">Brankas masih kosong. Silakan input akun di atas.</p>'; return; }

    const grouped = {};
    akunPenting.forEach((akun, index) => {
        let cat = akun.platform.toUpperCase();
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ ...akun, originalIndex: index });
    });

    let html = `<table class="w-full text-left text-sm whitespace-nowrap"><thead class="bg-slate-800/80 text-slate-400 text-[10px] uppercase tracking-wider"><tr><th class="p-4 rounded-tl-lg">Kategori / Platform</th><th class="p-4">Username / Email</th><th class="p-4">Password</th><th class="p-4 text-right rounded-tr-lg">Aksi</th></tr></thead><tbody class="divide-y divide-slate-800/50">`;

    for (let cat in grouped) {
        html += `<tr class="bg-slate-900/60 border-t-2 border-slate-700"><td colspan="4" class="p-3 pl-4 font-black text-blue-400 tracking-widest text-xs"><i class="fa-solid fa-folder-open mr-2 text-blue-500"></i> ${cat}</td></tr>`;
        grouped[cat].forEach(a => {
            let dec = "Error"; try { dec = atob(a.pass); } catch(e) { dec = a.pass; } 
            html += `<tr class="hover:bg-slate-800/40 transition-colors"><td class="p-4 pl-8 font-semibold text-slate-200"><i class="fa-solid fa-caret-right text-[10px] text-slate-600 mr-2"></i> ${a.platform}</td><td class="p-4 font-mono text-slate-300">${a.user}</td><td class="p-4 font-mono text-slate-400 tracking-widest">${dec}</td><td class="p-4 text-right"><button onclick="hapusAkun(${a.originalIndex})" class="text-slate-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded transition-all"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    }
    html += '</tbody></table>'; listAkun.innerHTML = html;
}

updateUI();