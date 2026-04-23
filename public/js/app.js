// State management
let currentUser = null;
let charts = { bar: null, pie: null, offline: null, online: null, analisa: null };
let allBarang = []; 

// Pagination state
let currentPage = 1;
const itemsPerPage = 50;

// Selected Barang IDs for modals
let selectedBarangId = null;
let selectedAnalisaId = null;

// DOM Elements
const appDiv = document.getElementById('app');
const loginPage = document.getElementById('login-page');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const navLinks = document.querySelectorAll('.nav-link');
const pageTitle = document.getElementById('page-title');
const userName = document.getElementById('user-name');
const userAvatar = document.getElementById('user-avatar');

// Initial load
document.addEventListener('DOMContentLoaded', checkAuth);

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (data.loggedIn) {
      showApp(data.user);
    } else {
      showLogin();
    }
  } catch (e) {
    showLogin();
  }
}

function showApp(user) {
  currentUser = user;
  loginPage.style.display = 'none';
  appDiv.style.display = 'block';
  userName.textContent = user.username;
  userAvatar.textContent = user.username[0].toUpperCase();
  switchView('dashboard');
}

function showLogin() {
  appDiv.style.display = 'none';
  loginPage.style.display = 'flex';
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (data.success) {
    showApp(data.user);
  } else {
    alert(data.message);
  }
});

// Logout Handler
logoutBtn.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
});

// Navigation
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.getAttribute('data-page');
    if (!page) return;
    
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    switchView(page);
  });
});

function switchView(page) {
  document.querySelectorAll('.page-view').forEach(v => v.style.display = 'none');
  const view = document.getElementById(`view-${page}`);
  if (view) {
    view.style.display = 'block';
    
    // Smooth title transition
    pageTitle.style.opacity = '0';
    setTimeout(() => {
        pageTitle.textContent = page === 'dashboard' ? 'Intelligence Center' : 
                               page === 'analisa' ? 'Analisa Performa Unit' : 
                               page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' ');
        pageTitle.style.opacity = '1';
    }, 200);
    
    if (page === 'dashboard') loadDashboard();
    if (page === 'barang') {
        currentPage = 1;
        loadBarang();
    }
    if (page === 'masuk') loadMasuk();
    if (page === 'penjualan') loadPenjualan();
    if (page === 'analisa') loadAnalyticsPage();
  }
}

// Modal Logic
function openModal(id) {
  const modal = document.getElementById(id);
  modal.style.display = 'flex';
  modal.classList.add('fade-in');
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
  });
});

// --- CUSTOM SEARCHABLE DROPDOWN (CODE-FIRST) ---
function setupSearchDropdown(inputId, resultsId, displayId, filterFn = null, onSelect = null) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    const display = document.getElementById(displayId);
    
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        
        if (query.length === 0) {
            results.classList.remove('active');
            if(display) display.value = '';
            selectedBarangId = null;
            return;
        }

        const filtered = allBarang.filter(b => {
            const matches = (b.kode && b.kode.toLowerCase().includes(query)) || 
                            b.nama.toLowerCase().includes(query);
            if (!matches) return false;
            if (filterFn) return filterFn(b);
            return true;
        }).sort((a, b) => {
            const aK = a.kode ? a.kode.toLowerCase() : '';
            const bK = b.kode ? b.kode.toLowerCase() : '';
            if (aK === query) return -1;
            if (bK === query) return 1;
            return 0;
        }).slice(0, 50);

        if (filtered.length > 0) {
            results.innerHTML = filtered.map(b => `
                <div class="search-item" onmousedown="handleSelectProxy('${inputId}', '${resultsId}', '${displayId ? displayId : ''}', ${b.id}, '${b.nama.replace(/'/g, "\\'")}', '${(b.kode || '').replace(/'/g, "\\'")}')">
                    <div class="item-name">${b.nama}</div>
                    <div class="item-meta">
                        <span class="item-code">${b.kode || 'NO CODE'}</span>
                        <span style="color: ${b.stok > 0 ? 'var(--success)' : 'var(--danger)'}">Stok: ${b.stok}</span>
                    </div>
                </div>
            `).join('');
            results.classList.add('active');
        } else {
            results.innerHTML = '<div class="search-item" style="color: var(--text-muted); cursor: default; text-align: center;">Unit tidak tersedia</div>';
            results.classList.add('active');
        }
    });

    input.addEventListener('focus', () => {
        if (input.value.length > 0) results.classList.add('active');
    });

    input.addEventListener('blur', () => {
        setTimeout(() => results.classList.remove('active'), 250);
    });

    // Storage for the specific onSelect handler
    input.dataset.onSelect = onSelect ? onSelect.name : '';
}

window.handleSelectProxy = (inputId, resultsId, displayId, id, nama, kode) => {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    const display = displayId ? document.getElementById(displayId) : null;
    
    input.value = kode || nama; 
    if(display) display.value = nama;
    
    if (inputId === 'analisa-barang-search') {
        loadSpecificProductAnalytics(id);
    } else {
        selectedBarangId = id;
    }
    
    results.classList.remove('active');
};

// Initialize search dropdowns
setupSearchDropdown('masuk-barang-search', 'masuk-results', 'masuk-nama-display');
setupSearchDropdown('jual-barang-search', 'jual-results', 'jual-nama-display', (b) => b.stok > 0);
setupSearchDropdown('analisa-barang-search', 'analisa-results', null);

// --- DASHBOARD ---
async function loadDashboard() {
  try {
    const [summaryRes, terlarisRes, recentRes] = await Promise.all([
      fetch('/api/dashboard/summary'),
      fetch('/api/dashboard/terlaris'),
      fetch('/api/dashboard/recent')
    ]);

    const summary = await summaryRes.json();
    const terlaris = await terlarisRes.json();
    const recent = await recentRes.json();

    if (summary.success) {
      document.getElementById('stat-terjual').textContent = summary.data.totalTerjual;
      document.getElementById('stat-revenue').textContent = `Rp ${summary.data.totalRevenue.toLocaleString('id-ID')}`;
      document.getElementById('stat-stok').textContent = summary.data.totalStok;
      
      const totalDist = summary.data.totalOffline + summary.data.totalOnline;
      const offPct = totalDist > 0 ? Math.round((summary.data.totalOffline / totalDist) * 100) : 0;
      const resPct = totalDist > 0 ? Math.round((summary.data.totalOnline / totalDist) * 100) : 0;
      document.getElementById('stat-ratio').textContent = `${offPct}% : ${resPct}%`;
      
      renderCharts(terlaris.data, summary.data);
    }
    
    if (recent.success) {
      const tbody = document.querySelector('#recent-table tbody');
      tbody.innerHTML = '';
      const rows = recent.data.map(tr => {
        const date = new Date(tr.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const badgeClass = tr.tipe === 'online' ? 'badge-online' : (tr.tipe === 'offline' ? 'badge-offline' : '');
        const typeLabel = tr.jenis === 'masuk' ? 'INBOUND' : 'OUTBOUND';
        const typeStyle = tr.jenis === 'masuk' ? 'background: rgba(0, 242, 254, 0.1); color: #00f2fe' : 'background: rgba(240, 147, 251, 0.1); color: #f093fb';
        const channelLabel = tr.tipe === 'online' ? 'RESELLER' : (tr.tipe || '-').toUpperCase();
        
        return `
          <tr>
            <td><span style="color: var(--text-dim); font-size: 13px;">${date}</span></td>
            <td><span class="badge" style="${typeStyle}; border: 1px solid transparent;">${typeLabel}</span></td>
            <td>
              <div style="font-weight: 700; color: #fff; letter-spacing: 0.5px;">${tr.kode_barang || '---'}</div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">${tr.nama_barang}</div>
            </td>
            <td><span style="font-weight: 600;">${tr.qty}</span> <small>${tr.satuan}</small></td>
            <td><span class="badge ${badgeClass}">${channelLabel}</span></td>
            <td><span style="font-size: 13px; color: var(--text-muted);">${tr.keterangan || '-'}</span></td>
          </tr>
        `;
      });
      tbody.innerHTML = rows.join('');
    }
  } catch (e) { console.error(e); }
}

function renderCharts(terlarisData, summaryData) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } } },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { family: 'Outfit', size: 14, weight: 'bold' },
            bodyFont: { family: 'Outfit', size: 12 },
            padding: 12,
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            displayColors: true
        }
    },
    scales: {
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
        x: { grid: { display: false }, ticks: { display: false } }
    }
  };

  const ctxBar = document.getElementById('barChart').getContext('2d');
  if (charts.bar) charts.bar.destroy();
  charts.bar = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: terlarisData.map(d => d.kode || d.nama.substring(0, 10)),
      datasets: [{ 
          label: 'Total Terjual', 
          data: terlarisData.map(d => d.total_terjual), 
          backgroundColor: 'rgba(0, 242, 254, 0.6)', 
          borderColor: '#00f2fe',
          borderWidth: 1,
          borderRadius: 8,
          hoverBackgroundColor: '#00f2fe'
      }]
    },
    options: {
        ...chartOptions,
        plugins: {
            ...chartOptions.plugins,
            legend: { display: false }
        }
    }
  });

  const ctxPie = document.getElementById('pieChart').getContext('2d');
  if (charts.pie) charts.pie.destroy();
  charts.pie = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: ['OFFLINE', 'RESELLER'],
      datasets: [{ 
          data: [summaryData.totalOffline, summaryData.totalOnline], 
          backgroundColor: ['rgba(79, 172, 254, 0.6)', 'rgba(240, 147, 251, 0.6)'],
          borderColor: ['#4facfe', '#f093fb'],
          borderWidth: 2,
          hoverOffset: 15
      }]
    },
    options: {
        ...chartOptions,
        cutout: '75%',
        plugins: {
            ...chartOptions.plugins,
            legend: { position: 'bottom' }
        }
    }
  });
}

// --- ANALYTICS PAGE LOGIC ---
function loadAnalyticsPage() {
    if (allBarang.length === 0) loadBarang();
}

async function loadSpecificProductAnalytics(barangId) {
    try {
        const res = await fetch(`/api/dashboard/analytics/${barangId}`);
        const data = await res.json();
        
        if (data.success) {
            document.getElementById('analisa-placeholder').style.display = 'none';
            document.getElementById('analisa-content').style.display = 'block';
            document.getElementById('analisa-content').classList.add('fade-in');

            const { info, trend } = data.data;
            document.getElementById('ana-stok').textContent = info.stok;
            document.getElementById('ana-terjual').textContent = info.total_terjual;
            document.getElementById('ana-masuk').textContent = info.total_masuk;
            document.getElementById('ana-revenue').textContent = `Rp ${info.total_revenue.toLocaleString('id-ID')}`;

            renderAnalisaChart(trend);
        }
    } catch (e) { console.error(e); }
}

function renderAnalisaChart(trend) {
    const ctx = document.getElementById('analisaTrendChart').getContext('2d');
    if (charts.analisa) charts.analisa.destroy();

    charts.analisa = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trend.map(t => new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })),
            datasets: [
                {
                    label: 'Unit Keluar (Sales)',
                    data: trend.map(t => t.sold),
                    borderColor: '#f093fb',
                    backgroundColor: 'rgba(240, 147, 251, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#f093fb'
                },
                {
                    label: 'Unit Masuk (Inbound)',
                    data: trend.map(t => t.inbound),
                    borderColor: '#00f2fe',
                    backgroundColor: 'rgba(0, 242, 254, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#00f2fe'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Outfit' } } },
                tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { family: 'Outfit' } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            }
        }
    });
}

// --- MASTER BARANG ---
let barangList = [];
let filteredBarang = [];

async function loadBarang() {
  const res = await fetch('/api/barang');
  const data = await res.json();
  if (data.success) {
    barangList = data.data;
    allBarang = data.data; 
    filterAndRenderBarang();
  }
}

function filterAndRenderBarang() {
    const search = document.getElementById('search-barang')?.value.toLowerCase() || '';
    filteredBarang = barangList.filter(b => 
        b.nama.toLowerCase().includes(search) || 
        (b.kode && b.kode.toLowerCase().includes(search))
    );
    renderBarangTable();
}

function renderBarangTable() {
    const tbody = document.querySelector('#barang-table tbody');
    if (!tbody) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredBarang.slice(start, end);

    tbody.innerHTML = paginatedItems.map(b => `
        <tr class="fade-in">
          <td><span style="font-family: monospace; color: var(--primary); font-weight: 700;">${b.kode || '---'}</span></td>
          <td><span style="font-weight: 600;">${b.nama}</span></td>
          <td><span class="badge" style="background: rgba(255,255,255,0.05);">${b.satuan.toUpperCase()}</span></td>
          <td><span style="color: var(--gold); font-weight: 700;">Rp ${b.harga_jual.toLocaleString('id-ID')}</span></td>
          <td><span style="font-size: 16px; font-weight: 800; color: ${b.stok <= 5 ? 'var(--danger)' : '#fff'}">${b.stok}</span></td>
          <td>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="editBarang(${b.id})">EDIT</button>
                <button class="btn btn-danger" style="padding: 6px 12px; font-size: 11px;" onclick="deleteBarang(${b.id})">DEL</button>
            </div>
          </td>
        </tr>
    `).join('');
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredBarang.length / itemsPerPage);
    const container = document.getElementById('pagination-container');
    if (!container || totalPages <= 1) { container.innerHTML = ''; return; }

    container.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: center; margin-top: 30px; justify-content: center;">
            <button class="btn glass" style="padding: 8px 20px;" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">PREV</button>
            <span style="color: var(--text-muted); font-weight: 600;">PHASE ${currentPage} / ${totalPages}</span>
            <button class="btn glass" style="padding: 8px 20px;" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">NEXT</button>
        </div>
    `;
}

window.changePage = (page) => { currentPage = page; renderBarangTable(); };
document.addEventListener('input', (e) => { if (e.target.id === 'search-barang') { currentPage = 1; filterAndRenderBarang(); } });

// IMPORT & ADD
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const formData = new FormData(); formData.append('file', file);
  try {
      const res = await fetch('/api/barang/import-preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) showMappingModal(data.columns, data.tempFile); else alert(data.message);
  } catch (err) { alert("Sinkronisasi file gagal."); }
  e.target.value = ''; 
});

function showMappingModal(columns, tempFile) {
    const selects = ['map-nama', 'map-kode', 'map-satuan', 'map-harga'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = id === 'map-nama' ? '' : '<option value="">-- ABORT --</option>';
        columns.forEach(col => select.innerHTML += `<option value="${col}">${col.toUpperCase()}</option>`);
    });
    document.getElementById('temp-file-name').value = tempFile;
    openModal('modal-mapping');
}

document.getElementById('form-mapping').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mapping = { nama: document.getElementById('map-nama').value, kode: document.getElementById('map-kode').value, satuan: document.getElementById('map-satuan').value, harga_jual: document.getElementById('map-harga').value };
    const res = await fetch('/api/barang/import-execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tempFile: document.getElementById('temp-file-name').value, mapping }) });
    const data = await res.json();
    alert(data.message); if (data.success) { closeModal('modal-mapping'); loadBarang(); }
});

document.getElementById('add-barang-btn').addEventListener('click', () => {
  document.getElementById('form-barang').reset();
  document.getElementById('barang-id').value = '';
  document.getElementById('modal-barang-title').textContent = 'Registrasi Unit Baru';
  openModal('modal-barang');
});

document.getElementById('form-barang').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('barang-id').value;
  const payload = { nama: document.getElementById('barang-nama').value, kode: document.getElementById('barang-kode').value, satuan: document.getElementById('barang-satuan').value, harga_jual: document.getElementById('barang-harga').value };
  const url = id ? `/api/barang/${id}` : '/api/barang';
  const res = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.success) { closeModal('modal-barang'); loadBarang(); } else alert(data.message);
});

window.editBarang = async (id) => {
  const res = await fetch(`/api/barang/${id}`);
  const data = await res.json();
  if (data.success) {
    const b = data.data;
    document.getElementById('barang-id').value = b.id;
    document.getElementById('barang-nama').value = b.nama;
    document.getElementById('barang-kode').value = b.kode;
    document.getElementById('barang-satuan').value = b.satuan;
    document.getElementById('barang-harga').value = b.harga_jual;
    document.getElementById('modal-barang-title').textContent = 'Modifikasi Data Unit';
    openModal('modal-barang');
  }
};

window.deleteBarang = async (id) => { if (confirm('Hapus unit ini dari database?')) { const res = await fetch(`/api/barang/${id}`, { method: 'DELETE' }); if ((await res.json()).success) loadBarang(); } };

// --- BARANG MASUK ---
async function loadMasuk() {
  const res = await fetch('/api/masuk');
  const data = await res.json();
  if (data.success) {
    const tbody = document.querySelector('#masuk-table tbody');
    tbody.innerHTML = data.data.map(bm => `
        <tr class="fade-in">
          <td><span style="color: var(--text-dim);">${new Date(bm.created_at).toLocaleDateString('id-ID')}</span></td>
          <td><span style="font-family: monospace; color: var(--primary); font-weight: 700;">${bm.kode_barang || '---'}</span></td>
          <td><span style="font-weight: 600;">${bm.nama_barang}</span></td>
          <td><span style="font-weight: 800;">${bm.qty}</span> <small>${bm.satuan}</small></td>
          <td><span style="color: var(--text-muted); font-size: 13px;">${bm.keterangan || '-'}</span></td>
          <td>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 11px;" onclick="editMasuk(${bm.id})">EDIT</button>
                <button class="btn btn-danger" style="padding: 6px 12px; font-size: 11px;" onclick="deleteMasuk(${bm.id})">DEL</button>
            </div>
          </td>
        </tr>
    `).join('');
  }
}

document.getElementById('add-masuk-btn').addEventListener('click', () => {
  if (allBarang.length === 0) loadBarang(); 
  document.getElementById('form-masuk').reset();
  document.getElementById('masuk-id').value = '';
  document.getElementById('masuk-nama-display').value = '';
  selectedBarangId = null;
  openModal('modal-masuk');
  setTimeout(() => document.getElementById('masuk-barang-search').focus(), 100);
});

window.editMasuk = async (id) => {
    const res = await fetch(`/api/masuk/${id}`);
    const data = await res.json();
    if (data.success) {
        const bm = data.data;
        document.getElementById('masuk-id').value = bm.id;
        document.getElementById('masuk-barang-search').value = bm.kode_barang || bm.nama_barang;
        document.getElementById('masuk-nama-display').value = bm.nama_barang;
        document.getElementById('masuk-qty').value = bm.qty;
        document.getElementById('masuk-keterangan').value = bm.keterangan;
        selectedBarangId = bm.barang_id;
        openModal('modal-masuk');
    }
};

document.getElementById('form-masuk').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedBarangId) return alert('Identitas unit tidak valid!');
  const id = document.getElementById('masuk-id').value;
  const res = await fetch(id ? `/api/masuk/${id}` : '/api/masuk', { 
    method: id ? 'PUT' : 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ 
        barang_id: selectedBarangId, 
        qty: document.getElementById('masuk-qty').value, 
        keterangan: document.getElementById('masuk-keterangan').value 
    }) 
  });
  
  const data = await res.json();
  if (data.success) {
    closeModal('modal-masuk');
    loadMasuk();
    loadBarang(); // Refresh master data for search results
  } else {
    alert(data.message);
  }
});

window.deleteMasuk = async (id) => { if (confirm('Batalkan log pemasukan ini?')) { const res = await fetch(`/api/masuk/${id}`, { method: 'DELETE' }); if ((await res.json()).success) loadMasuk(); } };

// --- PENJUALAN ---
async function loadPenjualan() {
  const res = await fetch('/api/penjualan');
  const data = await res.json();
  if (data.success) {
    const tbody = document.querySelector('#penjualan-table tbody');
    tbody.innerHTML = data.data.map(p => {
        const channelLabel = p.tipe === 'online' ? 'RESELLER' : p.tipe.toUpperCase();
        return `
        <tr class="fade-in">
          <td><span style="color: var(--text-dim);">${new Date(p.created_at).toLocaleDateString('id-ID')}</span></td>
          <td><span style="font-family: monospace; color: var(--accent); font-weight: 700;">${p.kode_barang || '---'}</span></td>
          <td><span style="font-weight: 600;">${p.nama_barang}</span></td>
          <td><span style="font-weight: 800;">${p.qty}</span> <small>${p.satuan}</small></td>
          <td><span class="badge ${p.tipe === 'online' ? 'badge-online' : 'badge-offline'}">${channelLabel}</span></td>
          <td><span style="color: var(--gold); font-weight: 600;">Rp ${p.harga.toLocaleString('id-ID')}</span></td>
          <td><span style="color: var(--primary); font-weight: 800;">Rp ${(p.qty * p.harga).toLocaleString('id-ID')}</span></td>
          <td><button class="btn btn-danger" style="padding: 6px 12px; font-size: 11px;" onclick="deletePenjualan(${p.id})">VOID</button></td>
        </tr>
        `;
    }).join('');
  }
}

document.getElementById('add-penjualan-btn').addEventListener('click', () => {
  if (allBarang.length === 0) loadBarang(); 
  document.getElementById('form-penjualan').reset();
  document.getElementById('jual-nama-display').value = '';
  selectedBarangId = null;
  openModal('modal-penjualan');
  setTimeout(() => document.getElementById('jual-barang-search').focus(), 100);
});

document.getElementById('form-penjualan').addEventListener('submit', async (e) => {
  e.preventDefault(); if (!selectedBarangId) return alert('Identitas unit tidak valid!');
  const res = await fetch('/api/penjualan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ barang_id: selectedBarangId, qty: document.getElementById('jual-qty').value, tipe: document.getElementById('jual-tipe').value, harga: document.getElementById('jual-harga').value }) });
  const data = await res.json(); 
  if (data.success) { 
    closeModal('modal-penjualan'); 
    loadPenjualan(); 
    loadBarang(); // Refresh master data for search results
  } else {
    alert(data.message);
  }
});

window.deletePenjualan = async (id) => { if (confirm('Batalkan transaksi ini?')) { const res = await fetch(`/api/penjualan/${id}`, { method: 'DELETE' }); if ((await res.json()).success) loadPenjualan(); } };
