const GAS_URL = "https://script.google.com/macros/s/AKfycbxXPMmLYeiro2Bq2kOLnfbUjXNQKFCwD4SK7vupGsaWqNhpxIDu-8y_VHPelrT521JHqw/exec"; 
const PIN_RAHASIA = "741963"; 

let keuangan = JSON.parse(localStorage.getItem('keuangan')) || { cash: 0, atm: 0 };
let riwayat = JSON.parse(localStorage.getItem('riwayat')) || [];
let tugas = JSON.parse(localStorage.getItem('tugasBaru')) || []; 
let cicilan = JSON.parse(localStorage.getItem('cicilan')) || [];
let akunPenting = JSON.parse(localStorage.getItem('akunPenting')) || [];

function nav(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    document.getElementById(`sec-${sectionId}`).classList.remove('hidden');
    const btnDesktop = document.getElementById(`btn-${sectionId}`);
    if(btnDesktop) btnDesktop.classList.add('active-nav');
    window.scrollTo(0, 0);
    updateUI();
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

document.getElementById('form-transaksi').addEventListener('submit', function(e) {
    e.preventDefault();
    const jenis = document.getElementById('jenis-trx').value;
    const dompet = document.getElementById('dompet-trx').value;
    const nominal = parseInt(document.getElementById('nominal-trx').value);
    const ket = document.getElementById('ket-trx').value;
    if (jenis === 'masuk') keuangan[dompet] += nominal; else keuangan[dompet] -= nominal;
    riwayat.unshift({ jenis, dompet, nominal, ket, tanggal: new Date().toLocaleDateString('id-ID') });
    if(riwayat.length > 20) riwayat.pop(); 
    simpanData(); this.reset(); nav('dashboard'); 
});

document.getElementById('form-tugas').addEventListener('submit', async function(e) {
    e.preventDefault();
    const tagihanBaru = { id: "TGS-" + Date.now(), namaTugas: document.getElementById('nama-tugas').value, matkul: document.getElementById('matkul-tugas').value, tipe: document.getElementById('tipe-tugas').value, deadline: document.getElementById('deadline-tugas').value, email: document.getElementById('email-tugas').value, status: "Belum Selesai" };
    const btnSubmit = document.getElementById('btn-submit-tugas');
    btnSubmit.innerText = "LOADING..."; btnSubmit.disabled = true;
    tugas.push(tagihanBaru); simpanData(); updateUI();
    try { await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "addTugas", ...tagihanBaru }), headers: { 'Content-Type': 'application/json' } }); alert("Tugas dicatat & Alarm diaktifkan!"); } catch(err) { console.error(err); }
    btnSubmit.innerText = "SIMPAN TUGAS & ALARM"; btnSubmit.disabled = false; this.reset();
});

async function selesaikanTugas(index) {
    if(confirm(`Selesaikan tugas ${tugas[index].namaTugas}?`)) {
        tugas[index].status = "Selesai"; simpanData(); updateUI();
        try { await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "finishTugas", id: tugas[index].id }), headers: { 'Content-Type': 'application/json' } }); } catch(err) {}
    }
}
function hapusTugasLokal(index) { if(confirm("Hapus tampilan lokal?")) { tugas.splice(index, 1); simpanData(); updateUI(); } }

document.getElementById('form-cicilan').addEventListener('submit', async function(e) {
    e.preventDefault();
    const tagihanBaru = { id: "ID-" + Date.now(), nama: document.getElementById('nama-tagihan').value, jumlah: parseInt(document.getElementById('jumlah-tagihan').value), tanggalFull: document.getElementById('tgl-jatuh-tempo').value, email: document.getElementById('email-tagihan').value, status: "Belum Bayar" };
    const btnSubmit = document.getElementById('btn-submit-tagihan');
    btnSubmit.innerText = "LOADING..."; btnSubmit.disabled = true;
    cicilan.push(tagihanBaru); simpanData(); updateUI();
    try { await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "add", ...tagihanBaru }), headers: { 'Content-Type': 'application/json' } }); alert("Tagihan dicatat & Alarm diaktifkan!"); } catch(err) { console.error(err); }
    btnSubmit.innerText = "SIMPAN TAGIHAN & ALARM"; btnSubmit.disabled = false; this.reset();
});

async function bayarTagihan(index) {
    if(confirm(`Sudah lunas membayar ${cicilan[index].nama}?`)) {
        cicilan[index].status = "Lunas"; simpanData(); updateUI();
        try { await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: "pay", id: cicilan[index].id }), headers: { 'Content-Type': 'application/json' } }); } catch(err) {}
    }
}
function hapusCicilanLokal(index) { if(confirm("Hapus tampilan lokal?")) { cicilan.splice(index, 1); simpanData(); updateUI(); } }

function checkPasswordAndNav() { document.getElementById('password-modal').classList.remove('hidden'); }
function closeModal() { document.getElementById('password-modal').classList.add('hidden'); document.getElementById('input-password').value = ''; }
function verifyPassword() { if (document.getElementById('input-password').value === PIN_RAHASIA) { closeModal(); nav('akun'); } else { alert("PIN SALAH!"); document.getElementById('input-password').value = ''; } }
function lockAccounts() { nav('dashboard'); }

document.getElementById('form-akun').addEventListener('submit', function(e) {
    e.preventDefault(); akunPenting.push({ platform: document.getElementById('platform-akun').value, user: document.getElementById('user-akun').value, pass: document.getElementById('pass-akun').value });
    simpanData(); this.reset(); updateUI();
});
function hapusAkun(index) { akunPenting.splice(index, 1); simpanData(); updateUI(); }

function simpanData() { localStorage.setItem('keuangan', JSON.stringify(keuangan)); localStorage.setItem('riwayat', JSON.stringify(riwayat)); localStorage.setItem('tugasBaru', JSON.stringify(tugas)); localStorage.setItem('cicilan', JSON.stringify(cicilan)); localStorage.setItem('akunPenting', JSON.stringify(akunPenting)); }

function updateUI() {
    document.getElementById('saldo-cash').innerText = formatRupiah(keuangan.cash); document.getElementById('saldo-atm').innerText = formatRupiah(keuangan.atm);
    document.getElementById('jumlah-tugas').innerText = tugas.filter(t => t.status !== "Selesai").length; document.getElementById('jumlah-cicilan').innerText = cicilan.filter(c => c.status !== "Lunas").length;

    const lr = document.getElementById('list-riwayat'); lr.innerHTML = riwayat.length === 0 ? '<p class="font-bold p-2">BELUM ADA TRANSAKSI</p>' : '';
    riwayat.forEach(r => { const color = r.jenis === 'masuk' ? 'bg-[#a3e635]' : 'bg-red-400'; lr.innerHTML += `<li class="flex flex-col md:flex-row justify-between md:items-center p-3 border-b-4 border-black gap-3"><div><p class="font-black text-lg uppercase">${r.ket}</p><p class="text-xs font-bold mt-2">${r.tanggal} <span class="px-2 border-2 border-black bg-[#f0f0f0] ml-2">${r.dompet.toUpperCase()}</span></p></div><span class="${color} font-black text-lg px-3 py-1 border-4 border-black">${r.jenis === 'masuk'?'+':'-'} ${formatRupiah(r.nominal)}</span></li>`; });

    const lt = document.getElementById('list-tugas'); lt.innerHTML = tugas.length === 0 ? '<p class="font-bold">Data Kosong</p>' : '';
    tugas.forEach((t, i) => { const d = new Date(t.deadline).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}); const l = t.status === "Selesai";
        lt.innerHTML += `<div class="neubrutalism-card ${l?"bg-gray-300":"bg-white"} p-4 border-4 border-black"><div class="border-b-4 border-black pb-3 mb-3"><span class="bg-black text-white text-xs px-2 py-1 font-bold uppercase mb-2 inline-block">${t.tipe}</span><h4 class="font-black text-xl uppercase truncate ${l?'line-through':''}">${t.namaTugas}</h4><p class="font-bold text-sm mt-1">${t.matkul}</p></div><p class="font-bold mb-5 text-sm">DUE: <span class="bg-[#ffc900] px-2 border-2 border-black ml-1">${d}</span></p>${!l ? `<button onclick="selesaikanTugas(${i})" class="neubrutalism-btn w-full bg-[#ff90e8] mb-3 text-black py-3">SUDAH SELESAI</button>` : `<p class="font-black text-green-800 mb-3 uppercase text-center border-4 border-green-800 py-2">✓ BERHENTI</p>`}<button onclick="hapusTugasLokal(${i})" class="w-full font-bold underline text-xs hover:text-red-600 mt-2">Hapus Data Lokal</button></div>`; });

    const lc = document.getElementById('list-cicilan'); lc.innerHTML = cicilan.length === 0 ? '<p class="font-bold">Data Kosong</p>' : '';
    cicilan.forEach((c, i) => { const d = new Date(c.tanggalFull).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'}); const l = c.status === "Lunas";
        lc.innerHTML += `<div class="neubrutalism-card ${l?"bg-gray-300":"bg-white"} p-4"><div class="flex flex-col border-b-4 border-black pb-3 mb-3 gap-2"><h4 class="font-black text-xl uppercase truncate ${l?'line-through':''}">${c.nama}</h4><span class="font-black text-lg">${formatRupiah(c.jumlah)}</span></div><p class="font-bold mb-5 text-sm">DUE: <span class="bg-[#ffc900] px-2 border-2 border-black ml-1">${d}</span></p>${!l ? `<button onclick="bayarTagihan(${i})" class="neubrutalism-btn w-full bg-[#38bdf8] mb-3 text-black py-3">SUDAH BAYAR</button>` : `<p class="font-black text-green-800 mb-3 uppercase text-center border-4 border-green-800 py-2">✓ BERHENTI</p>`}<button onclick="hapusCicilanLokal(${i})" class="w-full font-bold underline text-xs hover:text-red-600 mt-2">Hapus Data Lokal</button></div>`; });

    const la = document.getElementById('list-akun'); la.innerHTML = akunPenting.length === 0 ? '<p class="font-bold">Aman, Belum ada akun disimpan.</p>' : '';
    akunPenting.forEach((a, i) => { la.innerHTML += `<div class="flex justify-between items-center bg-[#ffc900] p-4 border-4 border-black"><div class="overflow-hidden mr-3"><p class="font-black uppercase bg-black text-white px-2 inline-block mb-2 text-xs">${a.platform}</p><p class="font-bold text-sm truncate"><i class="fa-solid fa-user"></i> ${a.user}</p><p class="font-bold mt-2 text-sm truncate flex items-center gap-2"><i class="fa-solid fa-key"></i> <span class="bg-white px-2 py-1 border-2 border-black tracking-widest block truncate">${a.pass}</span></p></div><button onclick="hapusAkun(${i})" class="bg-red-400 p-3 border-4 border-black hover:bg-white flex-shrink-0"><i class="fa-solid fa-trash text-lg"></i></button></div>`; });
}
updateUI();