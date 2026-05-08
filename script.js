// --- Inisialisasi Data ---
let keuangan = JSON.parse(localStorage.getItem('keuangan')) || { cash: 0, atm: 0 };
let riwayat = JSON.parse(localStorage.getItem('riwayat')) || [];
let tugas = JSON.parse(localStorage.getItem('tugas')) || [];
let cicilan = JSON.parse(localStorage.getItem('cicilan')) || [];
let akunPenting = JSON.parse(localStorage.getItem('akunPenting')) || [];

// PIN RAHASIA ADA DI SINI (Tidak terlihat di HTML)
const PIN_RAHASIA = "12345"; 

// --- Logika Hamburger Menu (Mobile) ---
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const btnHamburger = document.getElementById('btn-hamburger');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');

function toggleSidebar() {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

btnHamburger.addEventListener('click', toggleSidebar);
btnCloseSidebar.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

// --- Navigasi ---
function nav(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('block');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
    });

    document.getElementById(`sec-${sectionId}`).classList.remove('hidden');
    document.getElementById(`btn-${sectionId}`).classList.add('active-nav');

    if (window.innerWidth < 768 && !sidebar.classList.contains('-translate-x-full')) {
        toggleSidebar();
    }

    updateUI();
}

// --- Keuangan ---
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

document.getElementById('form-transaksi').addEventListener('submit', function(e) {
    e.preventDefault();
    const jenis = document.getElementById('jenis-trx').value;
    const dompet = document.getElementById('dompet-trx').value;
    const nominal = parseInt(document.getElementById('nominal-trx').value);
    const ket = document.getElementById('ket-trx').value;

    if (jenis === 'masuk') {
        keuangan[dompet] += nominal;
    } else {
        keuangan[dompet] -= nominal;
    }

    riwayat.unshift({ jenis, dompet, nominal, ket, tanggal: new Date().toLocaleDateString('id-ID') });
    if(riwayat.length > 15) riwayat.pop(); 

    simpanData();
    this.reset();
    nav('dashboard'); 
});

// --- Tugas Kuliah ---
document.getElementById('form-tugas').addEventListener('submit', function(e) {
    e.preventDefault();
    const judul = document.getElementById('input-tugas').value;
    tugas.push({ judul, selesai: false });
    simpanData();
    this.reset();
    updateUI();
});

function toggleTugas(index) {
    tugas[index].selesai = !tugas[index].selesai;
    simpanData();
    updateUI();
}

function hapusTugas(index) {
    tugas.splice(index, 1);
    simpanData();
    updateUI();
}

// --- Cicilan ---
document.getElementById('form-cicilan').addEventListener('submit', function(e) {
    e.preventDefault();
    const nama = document.getElementById('nama-cicilan').value;
    const tgl = document.getElementById('tgl-cicilan').value;
    cicilan.push({ nama, tgl });
    simpanData();
    this.reset();
    updateUI();
});

function hapusCicilan(index) {
    cicilan.splice(index, 1);
    simpanData();
    updateUI();
}

// --- Akun Penting ---
function checkPasswordAndNav() {
    document.getElementById('password-modal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('modal-content').classList.add('modal-pop');
    }, 10);

    if (window.innerWidth < 768 && !sidebar.classList.contains('-translate-x-full')) {
        toggleSidebar();
    }
}

function closeModal() {
    document.getElementById('modal-content').classList.remove('modal-pop');
    setTimeout(() => {
        document.getElementById('password-modal').classList.add('hidden');
        document.getElementById('input-password').value = '';
    }, 300);
}

function verifyPassword() {
    const input = document.getElementById('input-password').value;
    if (input === PIN_RAHASIA) {
        closeModal();
        setTimeout(() => nav('akun'), 300); 
    } else {
        alert("PIN Salah! Silakan coba lagi.");
        document.getElementById('input-password').value = '';
    }
}

function lockAccounts() {
    nav('dashboard');
}

document.getElementById('form-akun').addEventListener('submit', function(e) {
    e.preventDefault();
    const platform = document.getElementById('platform-akun').value;
    const user = document.getElementById('user-akun').value;
    const pass = document.getElementById('pass-akun').value;
    
    akunPenting.push({ platform, user, pass });
    simpanData();
    this.reset();
    updateUI();
});

function hapusAkun(index) {
    akunPenting.splice(index, 1);
    simpanData();
    updateUI();
}

// --- Render & Update UI ---
function simpanData() {
    localStorage.setItem('keuangan', JSON.stringify(keuangan));
    localStorage.setItem('riwayat', JSON.stringify(riwayat));
    localStorage.setItem('tugas', JSON.stringify(tugas));
    localStorage.setItem('cicilan', JSON.stringify(cicilan));
    localStorage.setItem('akunPenting', JSON.stringify(akunPenting));
}

function updateUI() {
    // 1. Update Saldo & Counter
    document.getElementById('saldo-cash').innerText = formatRupiah(keuangan.cash);
    document.getElementById('saldo-atm').innerText = formatRupiah(keuangan.atm);
    
    const tugasPending = tugas.filter(t => !t.selesai).length;
    document.getElementById('jumlah-tugas').innerHTML = `${tugasPending} <span class="text-sm font-normal text-slate-400">Pending</span>`;
    document.getElementById('jumlah-cicilan').innerHTML = `${cicilan.length} <span class="text-sm font-normal text-slate-400">Tagihan</span>`;

    // 2. Update Riwayat
    const listRiwayat = document.getElementById('list-riwayat');
    listRiwayat.innerHTML = '';
    if(riwayat.length === 0) {
        listRiwayat.innerHTML = '<p class="text-slate-400 text-sm italic text-center py-4">Belum ada aktivitas.</p>';
    } else {
        riwayat.forEach(r => {
            const color = r.jenis === 'masuk' ? 'text-emerald-600' : 'text-rose-600';
            const operator = r.jenis === 'masuk' ? '+' : '-';
            const dompetTag = r.dompet === 'cash' ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100';
            listRiwayat.innerHTML += `
                <li class="flex justify-between items-center border-b border-slate-100 last:border-0 pb-4 mb-4 last:mb-0 last:pb-0">
                    <div>
                        <p class="font-bold text-slate-700">${r.ket}</p>
                        <p class="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span><i class="fa-regular fa-clock"></i> ${r.tanggal}</span>
                            <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${dompetTag}">${r.dompet.toUpperCase()}</span>
                        </p>
                    </div>
                    <span class="${color} font-bold text-lg">${operator} ${formatRupiah(r.nominal)}</span>
                </li>
            `;
        });
    }

    // 3. Update Tugas
    const listTugas = document.getElementById('list-tugas');
    listTugas.innerHTML = '';
    if(tugas.length === 0) listTugas.innerHTML = '<p class="text-slate-400 text-sm italic text-center py-4">Belum ada tugas.</p>';
    tugas.forEach((t, i) => {
        listTugas.innerHTML += `
            <li class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-teal-200 transition">
                <label class="flex items-center gap-3 cursor-pointer flex-1">
                    <input type="checkbox" ${t.selesai ? 'checked' : ''} onchange="toggleTugas(${i})" class="w-5 h-5 accent-teal-600 rounded cursor-pointer">
                    <span class="font-medium ${t.selesai ? 'task-done' : 'text-slate-700'}">${t.judul}</span>
                </label>
                <button onclick="hapusTugas(${i})" class="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition ml-4"><i class="fa-solid fa-trash"></i></button>
            </li>
        `;
    });

    // 4. Update Cicilan
    const listCicilan = document.getElementById('list-cicilan');
    listCicilan.innerHTML = '';
    if(cicilan.length === 0) listCicilan.innerHTML = '<p class="text-slate-400 text-sm italic py-2">Belum ada cicilan.</p>';
    cicilan.forEach((c, i) => {
        listCicilan.innerHTML += `
            <div class="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm relative overflow-hidden group">
                <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400"></div>
                <div class="pl-2">
                    <h4 class="font-bold text-slate-800 text-lg">${c.nama}</h4>
                    <p class="text-sm text-slate-500 mt-1"><i class="fa-regular fa-calendar text-slate-400"></i> Jatuh Tempo: <span class="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold ml-1 border border-slate-200">Tgl ${c.tgl}</span></p>
                </div>
                <button onclick="hapusCicilan(${i})" class="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-3 rounded-xl transition opacity-100 md:opacity-0 group-hover:opacity-100"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });

    // 5. Update Akun Penting
    const listAkun = document.getElementById('list-akun');
    listAkun.innerHTML = '';
    if(akunPenting.length === 0) listAkun.innerHTML = '<p class="text-slate-400 text-sm italic py-2">Belum ada data akun disimpan.</p>';
    akunPenting.forEach((a, i) => {
        listAkun.innerHTML += `
            <div class="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div>
                    <p class="text-xs text-rose-600 font-bold mb-2 tracking-wider"><i class="fa-brands fa-${a.platform.toLowerCase()}"></i> ${a.platform.toUpperCase()}</p>
                    <p class="text-sm font-semibold text-slate-800 mb-1"><i class="fa-regular fa-user text-slate-400 w-4"></i> ${a.user}</p>
                    <p class="text-sm text-slate-600"><i class="fa-solid fa-key text-slate-400 w-4"></i> <span class="font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-800 tracking-wider font-bold">${a.pass}</span></p>
                </div>
                <button onclick="hapusAkun(${i})" class="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-3 rounded-xl transition"><i class="fa-solid fa-trash text-lg"></i></button>
            </div>
        `;
    });
}

// Initial Render
updateUI();