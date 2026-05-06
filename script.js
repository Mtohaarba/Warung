// Data Global
let barangList = JSON.parse(localStorage.getItem('barangList')) || [];
let keranjang = JSON.parse(localStorage.getItem('keranjang')) || [];
let historyTransaksi = JSON.parse(localStorage.getItem('historyTransaksi')) || [];
let editBarangId = null;
let currentHistoryId = null;

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    renderPesanGrid();
    renderBarangTable();
    renderHistoryTable();
    updateStats();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('barangForm').addEventListener('submit', handleBarangForm);
    document.getElementById('bayarForm').addEventListener('submit', handleBayar);
}

// Navigation
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    event.target.closest('.nav-link').classList.add('active');
    
    // Update stats
    if (sectionId === 'pesan') renderPesanGrid();
    if (sectionId === 'history') renderHistoryTable();
}

// === PESAN SECTION ===
function renderPesanGrid(filteredList = barangList) {
    const container = document.getElementById('pesanProdukGrid');
    document.getElementById('totalProduk').textContent = filteredList.length;
    
    if (filteredList.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: #b2bec3;">
                <i class="fas fa-box-open" style="font-size: 5rem; margin-bottom: 1rem;"></i>
                <h3>Belum ada barang</h3>
                <p>Tambahkan barang di menu <strong>Barang</strong></p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredList.map(barang => `
        <div class="produk-card" onclick="tambahKeKeranjang(${barang.id})">
            <img src="${barang.image || 'https://via.placeholder.com/300x200/e0e0e0/666?text=No+Image'}" alt="${barang.nama}">
            <h3>${barang.nama}</h3>
            <div class="harga">Rp ${formatRupiah(barang.harga)}</div>
            <div class="stok-display ${barang.stok <= 5 ? 'stok-low' : ''}">
                <i class="fas fa-warehouse"></i>
                Stok: ${barang.stok}
            </div>
            <button class="btn btn-cart">
                <i class="fas fa-shopping-cart"></i>
                Masukkan Keranjang
            </button>
        </div>
    `).join('');
}

function searchPesan() {
    const query = document.getElementById('pesanSearch').value.toLowerCase();
    const filtered = barangList.filter(barang => 
        barang.nama.toLowerCase().includes(query)
    );
    renderPesanGrid(filtered);
}

function tambahKeKeranjang(barangId) {
    const barang = barangList.find(b => b.id === barangId);
    if (!barang || barang.stok <= 0) {
        showToast('Stok habis!', 'error');
        return;
    }
    
    const existing = keranjang.find(item => item.barangId === barangId);
    if (existing) {
        if (existing.quantity >= barang.stok) {
            showToast('Stok tidak mencukupi!', 'error');
            return;
        }
        existing.quantity++;
    } else {
        keranjang.push({
            barangId: barang.id,
            nama: barang.nama,
            harga: barang.harga,
            image: barang.image,
            quantity: 1
        });
    }
    
    saveKeranjang();
    updateKeranjangModal();
    showToast(`${barang.nama} ditambahkan!`, 'success');
}

// === KERANJANG MODAL ===
function openKeranjangModal() {
    updateKeranjangModal();
    document.getElementById('keranjangModal').style.display = 'block';
}

function closeKeranjangModal() {
    document.getElementById('keranjangModal').style.display = 'none';
}

function updateKeranjangModal() {
    const container = document.getElementById('keranjangContent');
    const total = keranjang.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    
    if (keranjang.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h4>Keranjang Kosong</h4>
                <p>Pilih barang dari daftar untuk memulai pesanan</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="keranjang-items">
            ${keranjang.map((item, index) => `
                <div class="keranjang-item">
                    <img src="${item.image || 'https://via.placeholder.com/80x80'}" alt="${item.nama}">
                    <div class="keranjang-info">
                        <h4>${item.nama}</h4>
                        <div class="keranjang-price">Rp ${formatRupiah(item.harga)}</div>
                    </div>
                    <div class="quantity-controls">
                        <button class="btn btn-sm" onclick="ubahQuantity(${index}, -1)" ${item.quantity <= 1 ? 'disabled' : ''}>
                            <i class="fas fa-minus"></i>
                        </button>
                        <span style="font-weight: bold; font-size: 1.5rem; min-width: 2rem;">${item.quantity}</span>
                        <button class="btn btn-sm" onclick="ubahQuantity(${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="hapusKeranjang(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('')}
        </div>
        <div class="bayar-summary">
            <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1.5rem;">
                Total: Rp ${formatRupiah(total)}
            </div>
        </div>
    `;
}

function ubahQuantity(index, delta) {
    if (keranjang[index].quantity + delta <= 0) {
        hapusKeranjang(index);
        return;
    }
    keranjang[index].quantity += delta;
    saveKeranjang();
    updateKeranjangModal();
}

function hapusKeranjang(index) {
    keranjang.splice(index, 1);
    saveKeranjang();
    updateKeranjangModal();
}

function openBayarModal() {
    if (keranjang.length === 0) {
        showToast('Keranjang kosong!', 'error');
        return;
    }
    renderBayarModal();
    document.getElementById('bayarModal').style.display = 'block';
    closeKeranjangModal();
}

function closeBayarModal() {
    document.getElementById('bayarModal').style.display = 'none';
}

// === BAYAR MODAL ===
function renderBayarModal() {
    const total = keranjang.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    const container = document.getElementById('bayarContent');
    
    container.innerHTML = `
        <form id="bayarForm">
            <div class="bayar-summary">
                ${keranjang.map(item => `
                    <div class="bayar-item">
                        <span>${item.nama} × ${item.quantity}</span>
                        <span>Rp ${formatRupiah(item.harga * item.quantity)}</span>
                    </div>
                `).join('')}
                <div class="bayar-total">
                    Total Belanja: <strong>Rp ${formatRupiah(total)}</strong>
                </div>
            </div>
            <div style="text-align: center; margin-bottom: 2rem;">
                <label style="font-size: 1.3rem; font-weight: bold;">Uang Pembayaran:</label>
                <input type="number" id="uangBayar" class="input-bayar" min="0" placeholder="0" required>
            </div>
            <div id="kembalianDisplay" class="kembalian negative">
                Masukkan uang pembayaran
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeBayarModal()">Kembali</button>
                <button type="submit" class="btn btn-success">Selesaikan Pembayaran</button>
            </div>
        </form>
    `;
    
    document.getElementById('uangBayar').addEventListener('input', hitungKembalian);
}

function hitungKembalian() {
    const total = keranjang.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    const bayar = parseInt(document.getElementById('uangBayar').value) || 0;
    const kembalian = bayar - total;
    
    const display = document.getElementById('kembalianDisplay');
    display.textContent = `Kembalian: Rp ${formatRupiah(Math.max(0, kembalian))}`;
    display.className = kembalian >= 0 ? 'kembalian positive' : 'kembalian negative';
}

function handleBayar(e) {
    e.preventDefault();
    const total = keranjang.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    const bayar = parseInt(document.getElementById('uangBayar').value);
    const kembalian = bayar - total;
    
    if (kembalian < 0) {
        showToast('Uang tidak mencukupi!', 'error');
        return;
    }
    
    // Kurangi stok
    keranjang.forEach(item => {
        const barang = barangList.find(b => b.id === item.barangId);
        if (barang) {
            barang.stok -= item.quantity;
        }
    });
    
    // Simpan transaksi
    const transaksi = {
        id: Date.now(),
        tanggal: new Date().toLocaleString('id-ID'),
        items: [...keranjang],
        total: total,
        bayar: bayar,
        kembalian: kembalian
    };
    
    historyTransaksi.unshift(transaksi);
    saveHistory();
    saveBarang();
    saveKeranjang();
    
    // Reset keranjang
    keranjang = [];
    saveKeranjang();
    
    closeBayarModal();
    renderPesanGrid();
    renderBarangTable();
    renderHistoryTable();
    
    showToast(`Transaksi berhasil! Kembalian: Rp ${formatRupiah(kembalian)}`, 'success');
}

// === BARANG CRUD ===
function renderBarangTable() {
    const tbody = document.getElementById('barangTableBody');
    if (barangList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:4rem;"><i class="fas fa-plus-circle" style="font-size:4rem;color:#b2bec3;"></i><h3>Tambahkan barang pertama</h3></td></tr>';
        return;
    }
    
    tbody.innerHTML = barangList.map((barang, index) => `
        <tr>
            <td><img src="${barang.image || 'https://via.placeholder.com/60x60'}" alt="${barang.nama}"></td>
            <td><strong>${barang.nama}</strong></td>
            <td><strong style="color:#00b894;">Rp ${formatRupiah(barang.harga)}</strong></td>
            <td><span class="${barang.stok <= 5 ? 'stok-low' : ''}">${barang.stok}</span></td>
            <td class="action-buttons">
                <button class="btn btn-warning btn-sm" onclick="editBarang(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="hapusBarang(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openBarangModal(editId = null) {
    editBarangId = editId;
    const modal = document.getElementById('barangModal');
    const title = document.getElementById('barangModalTitle');
    const form = document.getElementById('barangForm');
    
    form.reset();
    document.getElementById('barangPreview').style.display = 'none';
    
    if (editId !== null) {
        const barang = barangList[editId];
        title.textContent = 'Edit Barang';
        document.getElementById('barangName').value = barang.nama;
        document.getElementById('barangPrice').value = barang.harga;
        document.getElementById('barangStock').value = barang.stok;
        
        if (barang.image) {
            document.getElementById('barangPreview').src = barang.image;
            document.getElementById('barangPreview').style.display = 'block';
        }
    } else {
        title.textContent = 'Tambah Barang Baru';
    }
    
    modal.style.display = 'block';
}

function closeBarangModal() {
    document.getElementById('barangModal').style.display = 'none';
}

function previewBarangImage() {
    const file = document.getElementById('barangImage').files[0];
    const preview = document.getElementById('barangPreview');
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function handleBarangForm(e) {
    e.preventDefault();
    const nama = document.getElementById('barangName').value;
    const harga = parseInt(document.getElementById('barangPrice').value);
    const stok = parseInt(document.getElementById('barangStock').value);
    const file = document.getElementById('barangImage').files[0];
    
    const imageUrl = file ? URL.createObjectURL(file) : null;
    
    if (editBarangId !== null) {
        barangList[editBarangId] = {
            ...barangList[editBarangId],
            nama, harga, stok, image: imageUrl
        };
    } else {
        barangList.push({
            id: Date.now(),
            nama, harga, stok, image: imageUrl
        });
    }
    
    saveBarang();
    renderBarangTable();
    renderPesanGrid();
    closeBarangModal();
    showToast('Barang disimpan!', 'success');
}

function editBarang(index) {
    openBarangModal(index);
}

function hapusBarang(index) {
    if (confirm('Hapus barang ini?')) {
        barangList.splice(index, 1);
        saveBarang();
        renderBarangTable();
        renderPesanGrid();
        showToast('Barang dihapus!', 'success');
    }
}

// === HISTORY ===
function renderHistoryTable(filteredList = historyTransaksi) {
    const tbody = document.getElementById('historyTableBody');
    document.getElementById('historyCount').textContent = filteredList.length;
    
    if (filteredList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:4rem;"><i class="fas fa-history" style="font-size:4rem;color:#b2bec3;"></i><h3>Belum ada transaksi</h3></td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredList.map((transaksi, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${transaksi.tanggal}</td>
            <td>${transaksi.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
            <td><strong>Rp ${formatRupiah(transaksi.total)}</strong></td>
            <td><strong>Rp ${formatRupiah(transaksi.kembalian)}</strong></td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="lihatDetail(${transaksi.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="hapusHistory(${transaksi.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterHistory() {
    const date = document.getElementById('historyDateFilter').value;
    const filtered = date ? 
        historyTransaksi.filter(t => t.tanggal.startsWith(date)) : 
        historyTransaksi;
    renderHistoryTable(filtered);
}

function lihatDetail(transaksiId) {
    currentHistoryId = transaksiId;
    const transaksi = historyTransaksi.find(t => t.id === transaksiId);
    const container = document.getElementById('historyDetailContent');
    const title = document.getElementById('historyDetailTitle');
    
    title.textContent = `Transaksi #${transaksi.id}`;
    
    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 2rem; border-radius: 20px; margin-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <strong>Tanggal:</strong> <span>${transaksi.tanggal}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <strong>ID Transaksi:</strong> <span>#${transaksi.id}</span>
            </div>
        </div>
        <div style="margin-bottom: 2rem;">
            ${transaksi.items.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 1rem; background: white; margin-bottom: 0.5rem; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <span>${item.nama} × ${item.quantity}</span>
                    <span>Rp ${formatRupiah(item.harga * item.quantity)}</span>
                </div>
            `).join('')}
        </div>
        <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 1.3rem; margin-bottom: 1rem;">
                <span>Total Belanja:</span>
                <strong>Rp ${formatRupiah(transaksi.total)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.5rem; font-weight: bold; color: #00b894;">
                <span>Kembalian:</span>
                <strong>Rp ${formatRupiah(transaksi.kembalian)}</strong>
            </div>
        </div>
    `;
    
    document.getElementById('historyDetailModal').style.display = 'block';
}

function closeHistoryDetail() {
    document.getElementById('historyDetailModal').style.display = 'none';
}

function hapusHistory(transaksiId) {
    if (confirm('Hapus transaksi ini?')) {
        historyTransaksi = historyTransaksi.filter(t => t.id !== transaksiId);
        saveHistory();
        renderHistoryTable();
        showToast('Transaksi dihapus!', 'success');
    }
}

function hapusSemuaHistory() {
    if (confirm('Hapus SEMUA riwayat transaksi?')) {
        historyTransaksi = [];
        saveHistory();
        renderHistoryTable();
        showToast('Semua history dihapus!', 'success');
    }
}

function backupPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const filtered = document.getElementById('historyDateFilter').value ? 
        historyTransaksi.filter(t => t.tanggal.startsWith(document.getElementById('historyDateFilter').value)) : 
        historyTransaksi;
    
    let y = 20;
    doc.setFontSize(20);
    doc.text('RIWAYAT TRANSAKSI', 20, y);
    y += 15;
    
    doc.setFontSize(12);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 20, y);
    y += 10;
    
    filtered.forEach((transaksi, index) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        
        doc.text(`${index + 1}. ${transaksi.tanggal}`, 20, y);
        y += 7;
        doc.text(`Total: Rp ${formatRupiah(transaksi.total)} | Kembali: Rp ${formatRupiah(transaksi.kembalian)}`, 20, y);
        y += 10;
    });
    
    doc.save(`history-transaksi-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('PDF berhasil diunduh!', 'success');
}

function printStruk() {
    const transaksi = historyTransaksi.find(t => t.id === currentHistoryId);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head><title>Struk #${transaksi.id}</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
        </style>
        </head>
        <body>
            <div class="header">
                <h2>TOKO DIGITAL</h2>
                <div>Struk #${transaksi.id}</div>
                <div>${transaksi.tanggal}</div>
            </div>
            ${transaksi.items.map(item => `
                <div class="item">
                    <span>${item.nama}</span>
                    <span>${item.quantity}x Rp ${formatRupiah(item.harga)}</span>
                </div>
            `).join('')}
            <div class="total">
                Total: Rp ${formatRupiah(transaksi.total)}<br>
                Bayar: Rp ${formatRupiah(transaksi.bayar)}<br>
                Kembali: Rp ${formatRupiah(transaksi.kembalian)}
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 0.8em;">
                Terima kasih telah berbelanja!
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// === STORAGE & UTILS ===
function saveBarang() {
    localStorage.setItem('barangList', JSON.stringify(barangList));
}

function saveKeranjang() {
    localStorage.setItem('keranjang', JSON.stringify(keranjang));
}

function saveHistory() {
    localStorage.setItem('historyTransaksi', JSON.stringify(historyTransaksi));
}

function updateStats() {
    document.getElementById('totalProduk').textContent = barangList.length;
    document.getElementById('historyCount').textContent = historyTransaksi.length;
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: ${type === 'success' ? '#00b894' : type === 'error' ? '#e17055' : '#6c5ce7'};
        color: white;
        padding: 1.25rem 2rem;
        border-radius: 20px;
        z-index: 3000;
        transform: translateX(400px);
        transition: transform 0.4s ease;
        font-weight: 600;
        box-shadow: 0 15px 35px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => toast.remove(), 4000);
}

// Close modals on outside click
window.onclick = function(event) {
    const modals = ['keranjangModal', 'bayarModal', 'barangModal', 'historyDetailModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};
