// Data aplikasi
let produkList = JSON.parse(localStorage.getItem('produkList')) || [];
let keranjang = JSON.parse(localStorage.getItem('keranjang')) || [];
let editProductId = null;

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    renderProdukTable();
    renderKeranjang();
    renderKasirProduk();
    updateCartCount();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('productForm').addEventListener('submit', handleProductForm);
    document.getElementById('uangBayar').addEventListener('input', hitungKembalian);
}

// Show Section
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    document.getElementById(sectionId).classList.add('active');
    event.target.closest('.nav-link').classList.add('active');
}

// === MANAJEMEN PRODUK ===
function renderProdukTable(filteredList = produkList) {
    const tbody = document.getElementById('produkTableBody');
    if (filteredList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:3rem;color:#666;"><i class="fas fa-box-open" style="font-size:3rem;margin-bottom:1rem;"></i><h3>Belum ada produk</h3></td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredList.map((produk, index) => `
        <tr>
            <td><img src="${produk.image || 'https://via.placeholder.com/60x60?text=No+Img'}" alt="${produk.nama}" onerror="this.src='https://via.placeholder.com/60x60?text=No+Img'"></td>
            <td><strong>${produk.nama}</strong></td>
            <td><span class="badge">${produk.kategori}</span></td>
            <td><strong>Rp ${formatRupiah(produk.harga)}</strong></td>
            <td><span class="${produk.stok <= 5 ? 'stok-low' : ''}">${produk.stok}</span></td>
            <td class="action-buttons">
                <button class="btn btn-warning btn-sm" onclick="editProduct(${index})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="hapusProduct(${index})" title="Hapus">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openProductModal(editId = null) {
    editProductId = editId;
    const modal = document.getElementById('productModal');
    const title = document.getElementById('modalProductTitle');
    const form = document.getElementById('productForm');
    
    form.reset();
    document.getElementById('productPreview').style.display = 'none';
    
    if (editId !== null) {
        const produk = produkList[editId];
        title.textContent = 'Edit Produk';
        document.getElementById('productName').value = produk.nama;
        document.getElementById('productCategory').value = produk.kategori;
        document.getElementById('productPrice').value = produk.harga;
        document.getElementById('productStock').value = produk.stok;
        
        if (produk.image) {
            document.getElementById('productPreview').src = produk.image;
            document.getElementById('productPreview').style.display = 'block';
        }
    } else {
        title.textContent = 'Tambah Produk Baru';
    }
    
    modal.style.display = 'block';
}

function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    editProductId = null;
}

function previewProductImage() {
    const file = document.getElementById('productImage').files[0];
    const preview = document.getElementById('productPreview');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function handleProductForm(e) {
    e.preventDefault();
    
    const nama = document.getElementById('productName').value;
    const kategori = document.getElementById('productCategory').value;
    const harga = parseInt(document.getElementById('productPrice').value);
    const stok = parseInt(document.getElementById('productStock').value);
    const file = document.getElementById('productImage').files[0];
    
    const imageUrl = file ? URL.createObjectURL(file) : null;
    
    if (editProductId !== null) {
        produkList[editProductId] = { ...produkList[editProductId], nama, kategori, harga, stok, image: imageUrl };
    } else {
        produkList.push({ id: Date.now(), nama, kategori, harga, stok, image: imageUrl });
    }
    
    saveProduk();
    renderProdukTable();
    closeProductModal();
    showToast('Produk berhasil disimpan!', 'success');
}

function editProduct(index) {
    openProductModal(index);
}

function hapusProduct(index) {
    if (confirm('Yakin hapus produk ini?')) {
        produkList.splice(index, 1);
        saveProduk();
        renderProdukTable();
        showToast('Produk dihapus!', 'success');
    }
}

function searchProduk() {
    const query = document.getElementById('produkSearch').value.toLowerCase();
    const filtered = produkList.filter(p => 
        p.nama.toLowerCase().includes(query) || 
        p.kategori.toLowerCase().includes(query)
    );
    renderProdukTable(filtered);
}

function filterProduk() {
    const kategori = document.getElementById('kategoriFilter').value;
    const filtered = kategori ? produkList.filter(p => p.kategori === kategori) : produkList;
    renderProdukTable(filtered);
}

function saveProduk() {
    localStorage.setItem('produkList', JSON.stringify(produkList));
}

// === KERANJANG ===
function tambahKeKeranjang(produkId, nama, harga, image, stok) {
    const existing = keranjang.find(item => item.id === produkId);
    
    if (existing) {
        if (existing.quantity >= stok) {
            showToast('Stok tidak mencukupi!', 'error');
            return;
        }
        existing.quantity++;
    } else {
        keranjang.push({ id: produkId, nama, harga, image, quantity: 1 });
    }
    
    saveKeranjang();
    renderKeranjang();
    renderKasirPesanan();
    updateCartCount();
    showToast('Ditambahkan ke keranjang!', 'success');
}

function renderKeranjang() {
    const container = document.getElementById('keranjangContent');
    
    if (keranjang.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <h3>Keranjang Kosong</h3>
                <p>Tambahkan produk dari halaman Produk atau Kasir</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = keranjang.map(item => `
        <div class="keranjang-item">
            <img src="${item.image || 'https://via.placeholder.com/80x80'}" alt="${item.nama}">
            <div class="keranjang-info">
                <h4>${item.nama}</h4>
                <div class="harga">Rp ${formatRupiah(item.harga)}</div>
                <div class="stok-info">
                    <i class="fas fa-layer-group"></i>
                    <span>${item.quantity} item</span>
                </div>
            </div>
            <div class="keranjang-actions">
                <button class="btn btn-warning btn-sm" onclick="ubahQuantity(${keranjang.indexOf(item)}, -1)">
                    <i class="fas fa-minus"></i>
                </button>
                <span style="font-weight:bold; font-size:1.2rem;">${item.quantity}</span>
                <button class="btn btn-success btn-sm" onclick="ubahQuantity(${keranjang.indexOf(item)}, 1)">
                    <i class="fas fa-plus"></i>
                </button>
                <br>
                <button class="btn btn-danger btn-sm" onclick="hapusDariKeranjang(${keranjang.indexOf(item)})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function ubahQuantity(index, delta) {
    if (keranjang[index].quantity + delta <= 0) {
        hapusDariKeranjang(index);
        return;
    }
    keranjang[index].quantity += delta;
    saveKeranjang();
    renderKeranjang();
    renderKasirPesanan();
    updateCartCount();
}

function hapusDariKeranjang(index) {
    keranjang.splice(index, 1);
    saveKeranjang();
    renderKeranjang();
    renderKasirPesanan();
    updateCartCount();
}

function kosongkanKeranjang() {
    if (confirm('Kosongkan semua keranjang?')) {
        keranjang = [];
        saveKeranjang();
        renderKeranjang();
        renderKasirPesanan();
        updateCartCount();
        showToast('Keranjang dikosongkan!', 'success');
    }
}

function saveKeranjang() {
    localStorage.setItem('keranjang', JSON.stringify(keranjang));
}

function updateCartCount() {
    const count = keranjang.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}

// === KASIR ===
function renderKasirProduk() {
    const container = document.getElementById('kasirProdukGrid');
    container.innerHTML = produkList.map(produk => `
        <div class="produk-card" onclick="tambahKeKeranjang(${produk.id}, '${produk.nama}', ${produk.harga}, '${produk.image || ''}', ${produk.stok})">
            <img src="${produk.image || 'https://via.placeholder.com/250x150?text=No+Image'}" alt="${produk.nama}">
            <h4>${produk.nama}</h4>
            <div class="harga">Rp ${formatRupiah(produk.harga)}</div>
            <div class="stok-info">
                <i class="fas fa-warehouse"></i>
                <span>Stok: ${produk.stok} ${produk.stok <= 5 ? '<span class="stok-low">(Low Stock)</span>' : ''}</span>
            </div>
        </div>
    `).join('');
}

function searchKasir() {
    const query = document.getElementById('kasirSearch').value.toLowerCase();
    const filtered = produkList.filter(p => 
        p.nama.toLowerCase().includes(query) || 
        p.kategori.toLowerCase().includes(query)
    );
    
    const container = document.getElementById('kasirProdukGrid');
    container.innerHTML = filtered.map(produk => `
        <div class="produk-card" onclick="tambahKeKeranjang(${produk.id}, '${produk.nama}', ${produk.harga}, '${produk.image || ''}', ${produk.stok})">
            <img src="${produk.image || 'https://via.placeholder.com/250x150?text=No+Image'}" alt="${produk.nama}">
            <h4>${produk.nama}</h4>
            <div class="harga">Rp ${formatRupiah(produk.harga)}</div>
            <div class="stok-info">
                <i class="fas fa-warehouse"></i>
                <span>Stok: ${produk.stok}</span>
            </div>
        </div>
    `).join('');
}

function renderKasirPesanan() {
    const container = document.getElementById('pesananList');
    const total = keranjang.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    
    document.getElementById('kasirItemCount').textContent = keranjang.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('kasirTotal').textContent = formatRupiah(total);
    document.getElementById('totalBelanja').textContent = formatRupiah(total);
    
    if (keranjang.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#666;">Belum ada pesanan</div>';
        return;
    }
    
    container.innerHTML = keranjang.map(item => `
        <div class="pesanan-item">
            <span>${item.nama} x${item.quantity}</span>
            <strong>Rp ${formatRupiah(item.harga * item.quantity)}</strong>
        </div>
    `).join('');
    
    hitungKembalian();
}

function hitungKembalian() {
    const total = keranjang.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    const bayar = parseInt(document.getElementById('uangBayar').value) || 0;
    const kembalian = bayar - total;
    
    document.getElementById('kembalian').textContent = formatRupiah(Math.max(0, kembalian));
    
    const kembalianEl = document.getElementById('kembalian');
    kembalianEl.style.color = kembalian >= 0 ? '#28a745' : '#dc3545';
}

function selesaiTransaksi() {
    const total = keranjang.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    const bayar = parseInt(document.getElementById('uangBayar').value) || 0;
    const kembalian = bayar - total;
    
    if (kembalian < 0) {
        showToast('Uang bayar kurang!', 'error');
        return;
    }
    
    if (keranjang.length === 0) {
        showToast('Keranjang kosong!', 'error');
        return;
    }
    
    // Update stok
    keranjang.forEach(item => {
        const produk = produkList.find(p => p.id === item.id);
        if (produk) {
            produk.stok -= item.quantity;
        }
    });
    
    // Simpan transaksi selesai
    saveProduk();
    kosongkanKeranjang();
    
    showToast(`Transaksi selesai! Kembalian: Rp ${formatRupiah(kembalian)}`, 'success');
    renderKasirPesanan();
    renderProdukTable();
}

// === UTILITY ===
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID').format(angka);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 2rem;
        border-radius: 12px;
        z-index: 3000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => toast.remove(), 3000);
}

// Close modal klik luar
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) closeProductModal();
};

// Tambahan CSS untuk badge dan toast
const extraCSS = `
    .badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 500;
    }
    
    .stok-low {
        color: #dc3545 !important;
        font-weight: bold !important;
    }
`;

const style = document.createElement('style');
style.textContent = extraCSS;
document.head.appendChild(style);
