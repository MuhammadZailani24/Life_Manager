const GAS_URL = "https://script.google.com/macros/s/AKfycbwrlsqrGYDso6-6etIxiD_KkYBnhxodSsLR7fFpaCp9Zkm4Gy3dS8BZetXO-btVwgDNPA/exec";
const PIN_RAHASIA = "998877"; 

let oldK = JSON.parse(localStorage.getItem('keuangan'));
let keuangan = oldK ? (oldK.total !== undefined ? oldK : { total: (oldK.cash||0) + (oldK.atm||0) }) : { total: 0 };
let riwayat = JSON.parse(localStorage.getItem('riwayatClean')) || []; 
let tugas = JSON.parse(localStorage.getItem('tugasPro')) || []; 
let cicilan = JSON.parse(localStorage.getItem('cicilanPro')) || [];
let akunPenting = JSON.parse(localStorage.getItem('akunPenting')) || [];
let joki = JSON.parse(localStorage.getItem('jokiPro')) || [];
let jokiLogOmset = JSON.parse(localStorage.getItem('jokiLogOmsetPro')) || []; 
let catatanKilat = JSON.parse(localStorage.getItem('catatanKilatPro')) || [];

let chartInstance = null; 

let currentTheme = localStorage.getItem('theme_pastel_v1') || 'pastel';
document.body.setAttribute('data-theme', currentTheme);
updateThemeIcon();

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = currentTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }
}

function toggleTheme() { 
    currentTheme = currentTheme === 'pastel' ? 'dark' : 'pastel'; 
    document.body.setAttribute('data-theme', currentTheme); 
    localStorage.setItem('theme_pastel_v1', currentTheme); 
    updateThemeIcon();
    renderChart();
}

setInterval(() => { 
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        clockEl.innerText = new Date().toLocaleDateString('id-ID', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        }) + " WITA"; 
    }
}, 1000);

function toggleAccordion(id) { document.getElementById(id).classList.toggle('active'); }
function toggleAddMenu() { document.getElementById('fab-menu').classList.toggle('hidden'); }

function nav(sectionId) { 
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden')); 
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active')); 
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav')); 

    const targetSec = document.getElementById(`sec-${sectionId}`);
    if (targetSec) targetSec.classList.remove('hidden'); 

    document.querySelectorAll(`[data-nav="${sectionId}"]`).forEach(el => {
        if (el.classList.contains('nav-item')) el.classList.add('active');
        if (el.classList.contains('nav-btn')) el.classList.add('active-nav');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    updateUI(); 
}

function formatRupiah(angka) { 
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0); 
}

async function sendToBackend(payload, btnElement, loadingText, defaultText) {
    if(btnElement) { btnElement.innerText = loadingText; btnElement.disabled = true; }
    try { 
        await fetch(GAS_URL, { 
            method: 'POST', 
            mode: 'no-cors', 
            body: JSON.stringify(payload), 
            headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
        }); 
    } catch(err) { 
        console.error('Gagal kirim ke backend:', err); 
    }
    if(btnElement) { btnElement.innerText = defaultText; btnElement.disabled = false; }
}

function openModal(type) {
    toggleAddMenu(); 
    const container = document.getElementById('modal-container'); 
    const content = document.getElementById('modal-content'); 
    container.classList.remove('hidden');

    const headerHtml = (title, subtitle) => `
        <div class="flex justify-between items-start mb-5">
            <div>
                <h3 class="font-extrabold text-lg">${title}</h3>
                <p class="text-xs text-muted">${subtitle}</p>
            </div>
            <button onclick="closeModal()" class="modal-close-btn w-8 h-8 flex items-center justify-center rounded-full">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>`;

    if(type === 'modal-joki') { 
        content.innerHTML = headerHtml('Tambah Project MENTIKDEV', 'Catat proyek klien dan target selesai') + `
            <label class="block text-xs font-bold text-muted mb-1">Nama Pelanggan / Proyek</label>
            <input type="text" id="f-nama-j" class="input-clean mb-3" placeholder="Cth: Web Undangan - Budi">
            <label class="block text-xs font-bold text-muted mb-1">Deadline Pengerjaan</label>
            <input type="date" id="f-deadline-j" class="input-clean mb-3">
            <label class="block text-xs font-bold text-muted mb-1">Fee Deal (Rp)</label>
            <input type="number" id="f-biaya-j" class="input-clean mb-5" placeholder="Cth: 250000">
            <button onclick="saveJoki()" class="btn-clean btn-primary w-full">Simpan Project MENTIKDEV</button>`; 
    } 
    else if(type === 'modal-tugas') { 
        content.innerHTML = headerHtml('Tambah Tugas Uniska', 'Catat tugas mata kuliah dan batas waktu') + `
            <label class="block text-xs font-bold text-muted mb-1">Judul Tugas</label>
            <input type="text" id="f-nama-t" class="input-clean mb-3" placeholder="Cth: Laporan Praktikum Modul 3">
            <label class="block text-xs font-bold text-muted mb-1">Mata Kuliah</label>
            <input type="text" id="f-matkul-t" class="input-clean mb-3" placeholder="Cth: Pengolahan Citra">
            <label class="block text-xs font-bold text-muted mb-1">Batas Pengumpulan</label>
            <input type="date" id="f-deadline-t" class="input-clean mb-5">
            <button onclick="saveTugas()" class="btn-clean btn-primary w-full">Simpan Tugas</button>`; 
    } 
    else if(type === 'modal-tagihan') { 
        content.innerHTML = headerHtml('Tambah Tagihan Pribadi', 'Catat nominal dan tanggal jatuh tempo') + `
            <label class="block text-xs font-bold text-muted mb-1">Nama Tagihan</label>
            <input type="text" id="f-nama-c" class="input-clean mb-3" placeholder="Cth: WiFi / Kos / Listrik">
            <label class="block text-xs font-bold text-muted mb-1">Jumlah (Rp)</label>
            <input type="number" id="f-jumlah-c" class="input-clean mb-3" placeholder="Cth: 150000">
            <label class="block text-xs font-bold text-muted mb-1">Jatuh Tempo</label>
            <input type="date" id="f-deadline-c" class="input-clean mb-5">
            <button onclick="saveCicilan()" class="btn-clean btn-primary w-full">Simpan Tagihan</button>`; 
    } 
    else if(type === 'modal-pribadi') { 
        content.innerHTML = headerHtml('Catat Keuangan', 'Rekam pemasukan atau pengeluaran baru') + `
            <label class="block text-xs font-bold text-muted mb-1">Jenis Transaksi</label>
            <select id="f-jenis-p" class="input-clean mb-3">
                <option value="masuk">Pemasukan (+)</option>
                <option value="keluar">Pengeluaran (-)</option>
            </select>
            <label class="block text-xs font-bold text-muted mb-1">Nominal (Rp)</label>
            <input type="number" id="f-nominal-p" class="input-clean mb-3" placeholder="Cth: 50000">
            <label class="block text-xs font-bold text-muted mb-1">Keterangan</label>
            <input type="text" id="f-ket-p" class="input-clean mb-5" placeholder="Cth: Makan siang / Fee project">
            <button onclick="saveKas()" class="btn-clean btn-primary w-full">Simpan Keuangan</button>`; 
    }
}

function closeModal() { document.getElementById('modal-container').classList.add('hidden'); }

function saveJoki() { 
    const nama = document.getElementById('f-nama-j').value;
    const deadline = document.getElementById('f-deadline-j').value;
    const biaya = parseInt(document.getElementById('f-biaya-j').value) || 0;
    if(!nama || !deadline || !biaya) return alert("Lengkapi nama, deadline, dan fee proyek!");

    const newData = { id: "JK-"+Date.now(), nama, deadline, biaya, wa: "628", email: "lifemanager17@gmail.com", status: "Proses" }; 
    joki.push(newData); 
    simpanData(); closeModal(); updateUI(); 
    sendToBackend({ action: "addJoki", ...newData }); 
}

function saveTugas() { 
    const namaTugas = document.getElementById('f-nama-t').value;
    const matkul = document.getElementById('f-matkul-t').value;
    const deadline = document.getElementById('f-deadline-t').value;
    if(!namaTugas || !deadline) return alert("Lengkapi judul tugas dan deadline!");

    const newData = { id: "TGS-"+Date.now(), namaTugas, matkul, deadline, tipe: "Individu", email: "lifemanager17@gmail.com", status: "Belum Selesai" }; 
    tugas.push(newData); 
    simpanData(); closeModal(); updateUI(); 
    sendToBackend({ action: "addTugas", ...newData }); 
}

function saveCicilan() { 
    const nama = document.getElementById('f-nama-c').value;
    const jumlah = parseInt(document.getElementById('f-jumlah-c').value) || 0;
    const tanggalFull = document.getElementById('f-deadline-c').value;
    if(!nama || !tanggalFull || !jumlah) return alert("Lengkapi nama tagihan, nominal, dan tanggal jatuh tempo!");

    const newData = { id: "ID-"+Date.now(), nama, jumlah, tanggalFull, email: "lifemanager17@gmail.com", status: "Belum Bayar" }; 
    cicilan.push(newData); 
    simpanData(); closeModal(); updateUI(); 
    sendToBackend({ action: "addTagihan", ...newData }); 
}

function saveKas() { 
    const nominal = parseInt(document.getElementById('f-nominal-p').value) || 0; 
    const jenis = document.getElementById('f-jenis-p').value; 
    const ket = document.getElementById('f-ket-p').value || (jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran');
    if(!nominal) return alert("Masukkan nominal yang valid!");

    const now = new Date();
    const tgl = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const wkt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const id = "KAS-" + Date.now();

    keuangan.total = (jenis === 'masuk') ? keuangan.total + nominal : keuangan.total - nominal; 
    riwayat.unshift({ id, jenis, nominal, ket, tanggal: tgl, waktu: wkt }); 
    simpanData(); closeModal(); updateUI(); 
    
    sendToBackend({
        action: "addKas",
        id,
        tanggal: tgl,
        waktu: wkt,
        jenis: (jenis === 'masuk') ? "Pemasukan (+)" : "Pengeluaran (-)",
        nominal,
        keterangan: ket
    });
}

document.getElementById('form-catatan').addEventListener('submit', function(e) { 
    e.preventDefault(); 
    catatanKilat.unshift({ isi: document.getElementById('input-catatan').value, waktu: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) }); 
    simpanData(); this.reset(); updateUI(); 
});

function hapusCatatan(index) { catatanKilat.splice(index, 1); simpanData(); updateUI(); }

async function clearAllKeuangan() { 
    if(confirm("Yakin hapus semua data keuangan? (Data lama otomatis di-backup di Spreadsheet)")) { 
        riwayat = []; keuangan.total = 0; simpanData(); updateUI(); 
        await sendToBackend({ action: "clearAll", tipe: "kas" }, null, "", ""); 
    } 
}
async function clearAllJoki() { 
    if(confirm("Yakin hapus semua data MENTIKDEV?")) { 
        joki = []; jokiLogOmset = []; simpanData(); updateUI(); 
        await sendToBackend({ action: "clearAll", tipe: "joki" }, null, "", ""); 
    } 
}
async function clearAllTugas() { 
    if(confirm("Yakin hapus semua tugas Uniska?")) { 
        tugas = []; simpanData(); updateUI(); 
        await sendToBackend({ action: "clearAll", tipe: "tugas" }, null, "", ""); 
    } 
}
async function clearAllCicilan() { 
    if(confirm("Yakin hapus semua kartu tagihan?")) { 
        cicilan = []; simpanData(); updateUI(); 
        await sendToBackend({ action: "clearAll", tipe: "tagihan" }, null, "", ""); 
    } 
}

async function selesaikanJoki(i) { 
    if(!confirm("Selesaikan Project MENTIKDEV?")) return; 
    jokiLogOmset.unshift({ ...joki[i], tanggal: new Date().toLocaleDateString('id-ID'), waktu: new Date().toLocaleTimeString('id-ID') }); 
    const targetId = joki[i].id; 
    joki.splice(i, 1); 
    simpanData(); updateUI(); 
    await sendToBackend({ action: "selesai", tipe: "joki", id: targetId }); 
}

async function selesaikanTugas(i) { 
    if(!confirm("Tandai Tugas Selesai?")) return; 
    const targetId = tugas[i].id; 
    tugas.splice(i, 1); 
    simpanData(); updateUI(); 
    await sendToBackend({ action: "selesai", tipe: "tugas", id: targetId }); 
}

async function bayarTagihan(i) { 
    if(!confirm("Tandai Tagihan Lunas?")) return; 
    const targetId = cicilan[i].id; 
    cicilan.splice(i, 1); 
    simpanData(); updateUI(); 
    await sendToBackend({ action: "selesai", tipe: "tagihan", id: targetId }); 
}

function buildUnifiedFeed() {
    const feed = document.getElementById('unified-feed'); 
    feed.innerHTML = ''; 
    let all = [];
    joki.forEach((j, i) => all.push({ ...j, type: 'joki', label: 'MENTIKDEV', title: j.nama, d: j.deadline, index: i }));
    tugas.forEach((t, i) => all.push({ ...t, type: 'tugas', label: 'TUGAS', title: t.namaTugas, d: t.deadline, index: i }));
    cicilan.forEach((c, i) => all.push({ ...c, type: 'tagihan', label: 'TAGIHAN', title: c.nama, d: c.tanggalFull, index: i }));
    all.sort((a,b) => new Date(a.d) - new Date(b.d));

    if(all.length === 0) { 
        feed.innerHTML = `<div class="glass-card p-6 text-center"><p class="text-xs text-muted italic">Semua target tercapai. Tidak ada deadline terdekat.</p></div>`; 
        return; 
    }

    all.slice(0, 5).forEach(item => {
        const date = new Date(item.d).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' });
        const borderClass = item.type === 'joki' ? 'border-l-orange-300' : item.type === 'tugas' ? 'border-l-emerald-400' : 'border-l-violet-300';
        feed.innerHTML += `
            <div class="glass-card p-4 flex justify-between items-center border-l-4 ${borderClass}">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="priority-tag tag-${item.type}">${item.label}</span>
                        <span class="text-[11px] font-semibold text-muted"><i class="fa-regular fa-calendar mr-1"></i>${date}</span>
                    </div>
                    <p class="text-sm font-extrabold uppercase">${item.title}</p>
                </div>
                <button onclick="selesaikanFeed('${item.type}', ${item.index})" class="w-9 h-9 rounded-xl badge-mint hover:scale-110 flex items-center justify-center text-sm font-bold" title="Tandai Selesai">
                    <i class="fa-solid fa-check"></i>
                </button>
            </div>`;
    });
}

function selesaikanFeed(type, index) { 
    if(type === 'joki') selesaikanJoki(index); 
    else if(type === 'tugas') selesaikanTugas(index); 
    else if(type === 'tagihan') bayarTagihan(index); 
}

function simpanData() {
    localStorage.setItem('keuangan', JSON.stringify(keuangan)); 
    localStorage.setItem('riwayatClean', JSON.stringify(riwayat));
    localStorage.setItem('tugasPro', JSON.stringify(tugas)); 
    localStorage.setItem('cicilanPro', JSON.stringify(cicilan));
    localStorage.setItem('jokiPro', JSON.stringify(joki));
    localStorage.setItem('jokiLogOmsetPro', JSON.stringify(jokiLogOmset)); 
    localStorage.setItem('catatanKilatPro', JSON.stringify(catatanKilat));
    localStorage.setItem('akunPenting', JSON.stringify(akunPenting));
}

function updateUI() {
    joki.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); 
    tugas.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)); 
    cicilan.sort((a, b) => new Date(a.tanggalFull) - new Date(b.tanggalFull));
    
    const elKas = document.getElementById('total-kas-pribadi'); 
    if(elKas) elKas.innerText = formatRupiah(keuangan.total);

    const elDashSaldo = document.getElementById('dash-saldo-preview');
    if(elDashSaldo) elDashSaldo.innerText = formatRupiah(keuangan.total);
    
    const elTagihan = document.getElementById('count-tagihan'); if(elTagihan) elTagihan.innerText = cicilan.length + " Items";
    const elJoki = document.getElementById('count-joki'); if(elJoki) elJoki.innerText = joki.length + " Items";
    const elTugas = document.getElementById('count-tugas'); if(elTugas) elTugas.innerText = tugas.length + " Items";

    buildUnifiedFeed(); 
    renderListKas(); 
    renderListJoki(); 
    renderListTugasDanCicilan(); 
    renderChart(); 
    renderTableAkun();
    
    const lc = document.getElementById('list-catatan'); 
    lc.innerHTML = catatanKilat.length === 0 ? '<p class="text-xs text-muted italic mt-1">Belum ada catatan cepat.</p>' : '';
    catatanKilat.forEach((c, i) => { 
        lc.innerHTML += `
            <li class="flex justify-between items-start quick-option-btn p-3 rounded-xl">
                <div class="flex-1">
                    <p class="text-sm font-medium">${c.isi}</p>
                    <p class="text-[10px] text-muted mt-0.5">${c.waktu}</p>
                </div>
                <button onclick="hapusCatatan(${i})" class="text-muted hover:text-orange-500 ml-2 p-1">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </li>`; 
    });
}

function renderListKas() {
    const list = document.getElementById('list-riwayat'); 
    list.innerHTML = '';
    if (riwayat.length === 0) {
        list.innerHTML = '<div class="glass-card p-6 text-center"><p class="text-xs text-muted italic">Belum ada riwayat transaksi keuangan.</p></div>';
        return;
    }
    riwayat.slice(0, 20).forEach(r => { 
        const isMasuk = r.jenis === 'masuk';
        list.innerHTML += `
            <li class="glass-card p-4 text-xs flex justify-between items-center border-l-4 ${isMasuk ? 'border-l-emerald-400' : 'border-l-orange-300'}">
                <div class="flex items-center gap-3">
                    <span class="w-9 h-9 rounded-xl ${isMasuk ? 'badge-mint' : 'badge-peach'} flex items-center justify-center text-sm">
                        <i class="fa-solid ${isMasuk ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}"></i>
                    </span>
                    <div>
                        <b class="text-sm">${r.ket}</b>
                        <p class="text-[11px] text-muted mt-0.5">${r.waktu} • ${r.tanggal}</p>
                    </div>
                </div>
                <span class="${isMasuk ? 'text-emerald-600 dark-mint-text' : 'text-orange-600'} font-extrabold text-sm">
                    ${isMasuk ? '+' : '-'}${formatRupiah(r.nominal)}
                </span>
            </li>`; 
    });
}

function renderListJoki() {
    const list = document.getElementById('list-joki'); 
    list.innerHTML = '';
    if (joki.length === 0) {
        list.innerHTML = '<div class="glass-card p-6 text-center"><p class="text-xs text-muted italic">Belum ada project MENTIKDEV aktif.</p></div>';
        return;
    }
    joki.forEach((j, i) => {
        const d = new Date(j.deadline).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
        list.innerHTML += `
            <div class="glass-card p-5 flex flex-col gap-3 border-l-4 border-l-orange-300">
                <div class="flex justify-between items-start gap-2">
                    <div>
                        <span class="priority-tag tag-joki mb-1.5 inline-block">MENTIKDEV</span>
                        <h4 class="font-extrabold text-base uppercase">${j.nama}</h4>
                    </div>
                    <p class="font-extrabold text-sm px-3 py-1.5 rounded-xl badge-mint">${formatRupiah(j.biaya)}</p>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-theme">
                    <p class="text-xs font-semibold text-muted"><i class="fa-regular fa-clock mr-1"></i> Target: ${d}</p>
                    <button onclick="selesaikanJoki(${i})" class="btn-clean btn-primary !w-auto text-xs py-2 px-4">
                        <i class="fa-solid fa-check"></i> Selesai & Amankan Fee
                    </button>
                </div>
            </div>`;
    });
}

function renderListTugasDanCicilan() {
    const l_tugas = document.getElementById('list-tugas'); 
    l_tugas.innerHTML = '';
    if (tugas.length === 0) {
        l_tugas.innerHTML = '<div class="glass-card p-6 text-center col-span-full"><p class="text-xs text-muted italic">Tidak ada tugas kuliah aktif.</p></div>';
    } else {
        tugas.forEach((t, i) => { 
            const d = new Date(t.deadline).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
            l_tugas.innerHTML += `
                <div class="glass-card p-5 border-l-4 border-l-emerald-400 flex flex-col justify-between">
                    <div>
                        <span class="priority-tag tag-tugas mb-2 inline-block">${t.matkul || 'Kuliah'}</span>
                        <h4 class="font-extrabold text-base uppercase">${t.namaTugas}</h4>
                        <p class="text-xs font-semibold text-muted flex items-center gap-2 mt-3 mb-4">
                            <i class="fa-regular fa-clock text-emerald-500"></i> Batas: ${d} 
                            <button onclick="openEditModal('tugasTanggal', ${i})" class="ml-1 badge-mint hover:scale-110 px-2 py-1 rounded-lg text-[11px]" title="Ubah Tanggal">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </p>
                    </div>
                    <button onclick="selesaikanTugas(${i})" class="btn-clean btn-primary text-xs py-2.5">
                        <i class="fa-solid fa-check-circle"></i> Tandai Selesai
                    </button>
                </div>`; 
        });
    }

    const l_cicil = document.getElementById('list-cicilan'); 
    l_cicil.innerHTML = '';
    if (cicilan.length === 0) {
        l_cicil.innerHTML = '<div class="glass-card p-6 text-center col-span-full"><p class="text-xs text-muted italic">Tidak ada tagihan aktif.</p></div>';
    } else {
        cicilan.forEach((c, i) => { 
            const d = new Date(c.tanggalFull).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
            l_cicil.innerHTML += `
                <div class="glass-card p-5 border-l-4 border-l-violet-300 flex flex-col justify-between">
                    <div>
                        <span class="priority-tag tag-tagihan mb-2 inline-block">TAGIHAN</span>
                        <h4 class="font-extrabold text-base uppercase">${c.nama}</h4>
                        <div class="flex items-center gap-2 my-2">
                            <p class="font-extrabold text-lg text-violet-600">${formatRupiah(c.jumlah)}</p>
                            <button onclick="openEditModal('cicilanJumlah', ${i})" class="badge-lavender hover:scale-110 px-2 py-1 rounded-lg text-[11px]" title="Ubah Nominal">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                        <p class="text-xs font-semibold text-muted flex items-center gap-2 mb-4">
                            <i class="fa-regular fa-clock text-violet-500"></i> Jatuh Tempo: ${d} 
                            <button onclick="openEditModal('cicilanTanggal', ${i})" class="ml-1 badge-lavender hover:scale-110 px-2 py-1 rounded-lg text-[11px]" title="Ubah Tanggal">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </p>
                    </div>
                    <button onclick="bayarTagihan(${i})" class="btn-clean btn-primary text-xs py-2.5">
                        <i class="fa-solid fa-check-double"></i> Tandai Lunas
                    </button>
                </div>`; 
        });
    }
}

let editTarget = null;
function openEditModal(type, index) {
    editTarget = { type, index }; 
    const modal = document.getElementById('edit-modal'); 
    const input = document.getElementById('edit-input'); 
    const title = document.getElementById('edit-title');
    if (type === 'tugasTanggal') { title.innerText = "Ubah Deadline Tugas"; input.type = "date"; input.value = tugas[index].deadline; } 
    else if (type === 'cicilanTanggal') { title.innerText = "Ubah Jatuh Tempo"; input.type = "date"; input.value = cicilan[index].tanggalFull; } 
    else if (type === 'cicilanJumlah') { title.innerText = "Ubah Jumlah Tagihan"; input.type = "number"; input.value = cicilan[index].jumlah; }
    modal.classList.remove('hidden');
}

function closeEditModal() { document.getElementById('edit-modal').classList.add('hidden'); }

async function saveEdit() {
    const input = document.getElementById('edit-input').value; 
    if(!input) return alert("Data tidak boleh kosong!");
    let payload = {};
    if (editTarget.type === 'tugasTanggal') { 
        tugas[editTarget.index].deadline = input; 
        payload = { action: "edit", tipe: "tugasTanggal", id: tugas[editTarget.index].id, val: input }; 
    } 
    else if (editTarget.type === 'cicilanTanggal') { 
        cicilan[editTarget.index].tanggalFull = input; 
        payload = { action: "edit", tipe: "tagihanTanggal", id: cicilan[editTarget.index].id, val: input }; 
    } 
    else if (editTarget.type === 'cicilanJumlah') { 
        cicilan[editTarget.index].jumlah = parseInt(input); 
        payload = { action: "edit", tipe: "tagihanJumlah", id: cicilan[editTarget.index].id, val: input }; 
    }
    simpanData(); updateUI(); closeEditModal(); 
    await sendToBackend(payload, null, "", "");
}

function renderChart() {
    const ctx = document.getElementById('grafikBisnis'); 
    if(!ctx) return;
    if(chartInstance) chartInstance.destroy();

    let labels = []; 
    let dataKeuangan = []; 
    let dataMentikdev = [];

    for(let i=6; i>=0; i--) {
        let d = new Date(); 
        d.setDate(d.getDate()-i); 
        let dateStr = d.toLocaleDateString('id-ID'); 
        let dateStrPad = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        labels.push(d.toLocaleDateString('id-ID', {day:'numeric', month:'short'}));
        dataKeuangan.push(riwayat.filter(r => (r.tanggal === dateStr || r.tanggal === dateStrPad) && r.jenis === 'masuk').reduce((a,b) => a + b.nominal, 0)); 
        dataMentikdev.push(jokiLogOmset.filter(r => r.tanggal === dateStr || r.tanggal === dateStrPad).reduce((a,b) => a + (b.biaya || 0), 0));
    }

    const tickColor = currentTheme === 'dark' ? '#94B8A8' : '#5F7A6E';
    const gridColor = currentTheme === 'dark' ? 'rgba(110, 231, 183, 0.08)' : 'rgba(16, 185, 129, 0.08)';

    chartInstance = new Chart(ctx, { 
        type: 'line', 
        data: { 
            labels, 
            datasets: [ 
                { label: 'Pemasukan Keuangan', data: dataKeuangan, borderColor: '#34D399', backgroundColor: 'rgba(110, 231, 183, 0.25)', borderWidth: 3, fill: true, tension: 0.4 }, 
                { label: 'Omset MENTIKDEV', data: dataMentikdev, borderColor: '#FDBA74', backgroundColor: 'rgba(253, 186, 116, 0.25)', borderWidth: 3, fill: true, tension: 0.4 } 
            ] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { labels: { color: tickColor, font: { family: 'Plus Jakarta Sans', weight: 'bold' } } } }, 
            scales: { 
                x: { ticks: { color: tickColor }, grid: { color: gridColor } }, 
                y: { ticks: { color: tickColor }, grid: { color: gridColor } } 
            } 
        } 
    });
}

function unduhPDF(modul, range) {
    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF(); 
    const now = new Date();
    const tglSekarang = now.toLocaleDateString('id-ID'); 
    const tglPad = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    let judulDokumen = "", headers = [], rows = [];

    if (modul === 'joki') {
        judulDokumen = `LAPORAN PENGHASILAN MENTIKDEV - (${range.toUpperCase()})`; 
        headers = [["Waktu/Tanggal", "Nama Project/Klien", "Omset Fee Keuntungan"]];
        let dataSumber = (range === 'hari') ? jokiLogOmset.filter(item => item.tanggal === tglSekarang || item.tanggal === tglPad) : jokiLogOmset;
        dataSumber.forEach(item => { 
            rows.push([`${item.waktu || '-'} / ${item.tanggal || '-'}`, item.nama || item.namaProject || '-', formatRupiah(item.biaya)]); 
        });
    } else if (modul === 'pribadi') {
        judulDokumen = `LAPORAN ARUS KEUANGAN PRIBADI - (${range.toUpperCase()})`; 
        headers = [["Waktu/Tanggal", "Arus Mutasi", "Keterangan", "Nominal"]];
        let dataSumber = (range === 'hari') ? riwayat.filter(item => item.tanggal === tglSekarang || item.tanggal === tglPad) : riwayat;
        dataSumber.forEach(item => { 
            rows.push([`${item.waktu} / ${item.tanggal}`, item.jenis === 'masuk' ? 'Pemasukan (+)' : 'Pengeluaran (-)', item.ket, formatRupiah(item.nominal)]); 
        });
    }

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(judulDokumen, 14, 20); 
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); 
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')} WITA`, 14, 26); 
    doc.text(`Admin: Muhammad Zailani`, 14, 31); 
    doc.line(14, 35, 196, 35);
    doc.autoTable({ startY: 40, head: headers, body: rows, theme: 'striped', headStyles: { fillColor: [16, 185, 129] } }); 
    doc.save(`Laporan_${modul === 'joki' ? 'MENTIKDEV' : 'Keuangan'}_${range}_${Date.now()}.pdf`);
}

function checkPasswordAndNav() { document.getElementById('password-modal').classList.remove('hidden'); }
function closePassword() { document.getElementById('password-modal').classList.add('hidden'); document.getElementById('input-password').value = ''; }
function verifyPassword() { 
    if(document.getElementById('input-password').value === PIN_RAHASIA) { closePassword(); nav('akun'); } 
    else { alert("PIN SALAH!"); } 
}
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
    if (akunPenting.length === 0) { 
        listAkun.innerHTML = '<p class="text-xs text-muted text-center py-6 italic">Brankas masih kosong. Silakan input akun di atas.</p>'; 
        return; 
    }

    const grouped = {};
    akunPenting.forEach((akun, index) => {
        let cat = akun.platform.toUpperCase();
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ ...akun, originalIndex: index });
    });

    let html = `<table class="w-full text-left text-sm whitespace-nowrap"><thead class="table-head-pastel text-[10px] uppercase tracking-wider"><tr><th class="p-4 rounded-tl-xl">Kategori / Platform</th><th class="p-4">Username / Email</th><th class="p-4">Password</th><th class="p-4 text-right rounded-tr-xl">Aksi</th></tr></thead><tbody class="divide-y divide-theme">`;

    for (let cat in grouped) {
        html += `<tr class="badge-mint"><td colspan="4" class="p-3 pl-4 font-extrabold tracking-widest text-xs"><i class="fa-solid fa-folder-open mr-2"></i> ${cat}</td></tr>`;
        grouped[cat].forEach(a => {
            let dec = "Error"; try { dec = atob(a.pass); } catch(e) { dec = a.pass; } 
            html += `<tr class="table-row-hover"><td class="p-4 pl-8 font-semibold"><i class="fa-solid fa-caret-right text-[10px] opacity-50 mr-2"></i> ${a.platform}</td><td class="p-4 font-mono">${a.user}</td><td class="p-4 font-mono text-muted tracking-widest">${dec}</td><td class="p-4 text-right"><button onclick="hapusAkun(${a.originalIndex})" class="text-muted hover:text-orange-500 p-2 rounded-lg"><i class="fa-solid fa-trash"></i></button></td></tr>`;
        });
    }
    html += '</tbody></table>'; 
    listAkun.innerHTML = html;
}

// SINKRONISASI PENUH 2 ARAH (KEUANGAN, MENTIKDEV, TUGAS, TAGIHAN)
async function syncAllFromCloud() {
    const btn = document.getElementById('btn-sync-kas');
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing...'; btn.disabled = true; }
    
    try {
        const response = await fetch(GAS_URL + "?action=getAll");
        const res = await response.json();
        
        if (res && res.ok) {
            if (Array.isArray(res.kas)) {
                let totalCloud = 0;
                let riwayatBaru = [];
                res.kas.forEach(item => {
                    let localJenis = (String(item.jenis).toLowerCase().includes('masuk') || String(item.jenis).includes('+')) ? 'masuk' : 'keluar';
                    if (localJenis === 'masuk') totalCloud += Number(item.nominal) || 0;
                    else totalCloud -= Number(item.nominal) || 0;
                    
                    riwayatBaru.push({
                        id: item.id || '',
                        jenis: localJenis,
                        nominal: Number(item.nominal) || 0,
                        ket: item.keterangan || '',
                        tanggal: item.tanggal || '',
                        waktu: item.waktu || ''
                    });
                });
                riwayat = riwayatBaru;
                keuangan.total = totalCloud;
            }

            if (Array.isArray(res.joki)) {
                joki = res.joki.filter(item => String(item.status).toLowerCase() !== 'selesai');
                jokiLogOmset = res.joki.filter(item => String(item.status).toLowerCase() === 'selesai').map(item => ({
                    ...item,
                    tanggal: item.deadline || '',
                    waktu: 'Selesai'
                }));
            }

            if (Array.isArray(res.tugas)) {
                tugas = res.tugas.filter(item => String(item.status).toLowerCase() !== 'selesai');
            }

            if (Array.isArray(res.tagihan)) {
                cicilan = res.tagihan.filter(item => String(item.status).toLowerCase() !== 'lunas');
            }

            simpanData();
            updateUI();
        }
    } catch (err) {
        console.error("Gagal menarik data dari server:", err);
        alert("Gagal sinkronisasi cloud: " + err.message);
    }
    
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sync Cloud'; btn.disabled = false; }
}

function fetchKasFromCloud() {
    return syncAllFromCloud();
}

updateUI();
syncAllFromCloud();