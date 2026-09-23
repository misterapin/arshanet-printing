// Konfigurasi Koneksi Supabase
const SUPABASE_URL = 'https://ubanymhsupakazmcrton.supabase.co';//[cite: 4]
const SUPABASE_KEY = 'sb_publishable_ucZL64OQIPz3FV275S7qew_gAqAfIqg'; // Salin dari menu API Keys Supabase

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let categories = [];
let products = [];
let transactions = [];
let adminUsers = [];
let storeContact = { phone: '6281234567890', address: 'Jl. Melati No. 123, Indonesia', email: 'info@arshanetprinting.com' };
let customLogo = '';
let cart = [];
let isAdminLoggedIn = false;

// 1. Memuat Data dari Supabase saat Halaman Dibuka
async function loadDataFromSupabase() {
    const { data: catData } = await db.from('categories').select('*');
    if (catData) categories = catData;

    const { data: prodData } = await db.from('products').select('*');
    if (prodData) products = prodData;

    const { data: txData } = await db.from('transactions').select('*');
    if (txData) transactions = txData;

    const { data: adminData } = await db.from('admins').select('*');
    if (adminData) adminUsers = adminData;

    // Ambil Data Kontak Toko (jika ada di database atau buat default)
    const { data: contactData } = await db.from('store_settings').select('*').single();
    if (contactData) {
        storeContact = contactData;
    }

    customLogo = localStorage.getItem('arshanet_logo') || '';

    renderLogo();
    renderStoreContact();
    renderCategories();
    renderCategoryDropdown();
    renderProducts('Semua');
}

// Render Kontak ke Footer & Tombol WhatsApp
function renderStoreContact() {
    const phoneEl = document.getElementById('footer-phone');
    const topPhoneEl = document.getElementById('topbar-phone');
    const addressEl = document.getElementById('footer-address');
    const emailEl = document.getElementById('footer-email');
    const topEmailEl = document.getElementById('topbar-email');
    
    if (phoneEl) phoneEl.innerText = storeContact.phone;
    if (topPhoneEl) topPhoneEl.innerText = storeContact.phone;
    if (addressEl) addressEl.innerText = storeContact.address;
    if (emailEl) emailEl.innerText = storeContact.email;
    if (topEmailEl) topEmailEl.innerText = storeContact.email;

    // Perbaikan Link Tombol Floating WhatsApp (Menggunakan API Resmi)
    const waButton = document.getElementById('floating-wa-btn');
    if (waButton) {
        const textMsg = encodeURIComponent("Halo ArshaNet Printing, saya ingin konsultasi cetak.");
        waButton.href = `https://api.whatsapp.com/send?phone=${storeContact.phone}&text=${textMsg}`;
    }

    // Masukkan ke input form setting jika modal dibuka
    const settingPhone = document.getElementById('setting-whatsapp');
    const settingAddress = document.getElementById('setting-address');
    if (settingPhone) settingPhone.value = storeContact.phone;
    if (settingAddress) settingAddress.value = storeContact.address;
}

// Perbaikan Checkout & Simpan Transaksi via WhatsApp
async function checkoutWhatsApp() {
    if (cart.length === 0) {
        alert('Keranjang belanja masih kosong!');
        return;
    }
    let message = "Halo ArshaNet Printing, saya ingin memesan produk berikut:\n";
    let total = 0;
    let itemsSummary = [];
    
    cart.forEach((item, i) => {
        let sub = item.price * item.qty;
        total += sub;
        itemsSummary.push(`${item.name} (${item.qty}x)`);
        message += `${i+1}. ${item.name} (${item.qty}x) - Rp ${sub.toLocaleString('id-ID')}\n`;
    });
    message += `\nTotal Pembayaran: *Rp ${total.toLocaleString('id-ID')}*\nTerima kasih.`;

    const newTx = {
        date: new Date().toLocaleString('id-ID'),
        items: itemsSummary.join(', '),
        total: total
    };

    // Simpan ke database Supabase
    await db.from('transactions').insert([newTx]);
    transactions.unshift(newTx);

    // Menggunakan API WhatsApp Resmi yang Aman dari Error 404
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${storeContact.phone}&text=${encodedMessage}`, '_blank');
}

// Render Logo Toko
function renderLogo() {
    const logoImg = document.getElementById('brand-logo-img');
    const logoText = document.getElementById('brand-logo-text');
    if (!logoImg || !logoText) return;
    if (customLogo) {
        logoImg.src = customLogo;
        logoImg.classList.remove('hidden');
        logoText.classList.add('hidden');
    } else {
        logoImg.classList.add('hidden');
        logoText.classList.remove('hidden');
    }
}

// Render Kategori Produk
function renderCategories() {
    const categoryGrid = document.getElementById('category-grid');
    if (!categoryGrid) return;
    if (categories.length === 0) {
        categoryGrid.innerHTML = `<p class="col-span-full text-xs text-gray-400 text-center py-6">Belum ada kategori. Login sebagai Admin untuk menambahkan kategori.</p>`;
        return;
    }

    categoryGrid.innerHTML = categories.map((cat, index) => `
        <div class="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition text-center cursor-pointer group flex flex-col items-center relative">
            ${isAdminLoggedIn ? `
                <button onclick="openEditCategoryModal(${index})" class="absolute top-2 right-2 bg-brand-blue text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-md hover:bg-blue-700 z-10" title="Edit Kategori">
                    <i class="fa-solid fa-pen"></i>
                </button>
            ` : ''}
            <div onclick="filterCategory('${cat.name}')" class="w-full flex flex-col items-center">
                <div class="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center p-3 mb-3 group-hover:scale-105 transition">
                    <img src="${cat.icon}" alt="${cat.name}" class="w-full h-full object-contain">
                </div>
                <span class="text-xs font-semibold text-gray-700 group-hover:text-brand-blue">${cat.name}</span>
            </div>
        </div>
    `).join('');
}

function renderCategoryDropdown() {
    const select = document.getElementById('new-category');
    if (!select) return;
    if (categories.length === 0) {
        select.innerHTML = `<option value="">-- Tambahkan kategori terlebih dahulu --</option>`;
        return;
    }
    select.innerHTML = categories.map(cat => `
        <option value="${cat.name}">${cat.name}</option>
    `).join('');
}

function renderProducts(filter = 'Semua') {
    const grid = document.getElementById('product-grid');
    const badge = document.getElementById('active-filter-badge');
    if (!grid) return;
    if (badge) badge.innerText = `Menampilkan: ${filter}`;
    
    const filtered = filter === 'Semua' ? products : products.filter(p => p.category === filter);
    
    if (filtered.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-xs text-gray-400 text-center py-12">Belum ada produk pada kategori ini.</p>`;
        return;
    }
    
    grid.innerHTML = filtered.map(p => `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition flex flex-col justify-between relative group">
            ${isAdminLoggedIn ? `
                <button onclick="openEditModal(${p.id})" class="absolute top-2 right-2 bg-brand-blue text-white w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-md hover:bg-blue-700 z-10" title="Edit Produk">
                    <i class="fa-solid fa-pen"></i>
                </button>
            ` : ''}
            <div>
                <div class="h-36 overflow-hidden bg-gray-100 relative">
                    <img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover hover:scale-105 transition duration-300">
                </div>
                <div class="p-3">
                    <span class="text-[10px] text-brand-blue font-semibold uppercase tracking-wider">${p.category}</span>
                    <h3 class="font-bold text-xs text-gray-800 mt-0.5 mb-1 line-clamp-1">${p.name}</h3>
                    <p class="text-xs font-extrabold text-brand-orange">Mulai dari<br>Rp ${p.price.toLocaleString('id-ID')} <span class="text-[10px] text-gray-400 font-normal">/ ${p.unit}</span></p>
                </div>
            </div>
            <div class="p-3 pt-0">
                <button onclick="addToCart('${p.name}', ${p.price})" class="w-full bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center space-x-1">
                    <i class="fa-solid fa-cart-plus text-[10px]"></i>
                    <span>Pesan Sekarang</span>
                </button>
            </div>
        </div>
    `).join('');
}

function filterCategory(cat) {
    renderProducts(cat);
    const prodGrid = document.getElementById('product-grid');
    if (prodGrid) prodGrid.scrollIntoView({ behavior: 'smooth' });
}

function addToCart(name, price) {
    const existing = cart.find(item => item.name === name);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ name, price, qty: 1 });
    }
    updateCartUI();
    toggleCart();
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    const itemsContainer = document.getElementById('cart-items');
    const totalElement = document.getElementById('cart-total');
    if (!badge || !itemsContainer || !totalElement) return;

    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    badge.innerText = totalQty;

    if (cart.length === 0) {
        itemsContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-8">Keranjang belanja masih kosong.</p>`;
        totalElement.innerText = `Rp 0`;
        return;
    }

    let totalPrice = 0;
    itemsContainer.innerHTML = cart.map((item, index) => {
        const subtotal = item.price * item.qty;
        totalPrice += subtotal;
        return `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-xl text-xs">
                <div>
                    <h4 class="font-bold text-gray-800">${item.name}</h4>
                    <p class="text-gray-500">Rp ${item.price.toLocaleString('id-ID')} x ${item.qty}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="font-bold text-brand-orange">Rp ${subtotal.toLocaleString('id-ID')}</span>
                    <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700 p-1"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');

    totalElement.innerText = `Rp ${totalPrice.toLocaleString('id-ID')}`;
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function toggleCart() {
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) cartModal.classList.toggle('hidden');
}

// Checkout & Simpan Transaksi ke Supabase (Nomor WhatsApp Dinamis)
async function checkoutWhatsApp() {
    if (cart.length === 0) {
        alert('Keranjang belanja masih kosong!');
        return;
    }
    let message = "Halo ArshaNet Printing, saya ingin memesan produk berikut:%0A";
    let total = 0;
    let itemsSummary = [];
    cart.forEach((item, i) => {
        let sub = item.price * item.qty;
        total += sub;
        itemsSummary.push(`${item.name} (${item.qty}x)`);
        message += `${i+1}. ${item.name} (${item.qty}x) - Rp ${sub.toLocaleString('id-ID')}%0A`;
    });
    message += `%0ATotal Pembayaran: *Rp ${total.toLocaleString('id-ID')}*%0ATerima kasih.`;

    const newTx = {
        date: new Date().toLocaleString('id-ID'),
        items: itemsSummary.join(', '),
        total: total
    };

    await db.from('transactions').insert([newTx]);
    transactions.unshift(newTx);

    window.open(`https://wa.me/${storeContact.phone}?text=${message}`, '_blank');
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.classList.toggle('hidden');
}

// Manajemen Modal Login Admin
function openLoginModal() {
    if (isAdminLoggedIn) {
        if (confirm('Anda sudah login sebagai Admin. Ingin Logout?')) {
            isAdminLoggedIn = false;
            
            const topbarText = document.getElementById('admin-topbar-text');
            if (topbarText) topbarText.innerText = "Portal Admin Toko";

            const btnProd = document.getElementById('btn-add-product');
            const btnCat = document.getElementById('btn-add-category');
            const btnSet = document.getElementById('btn-admin-setting');
            if (btnProd) btnProd.classList.add('hidden');
            if (btnCat) btnCat.classList.add('hidden');
            if (btnSet) btnSet.classList.add('hidden');

            renderCategories();
            renderProducts('Semua');
            alert('Berhasil Logout Admin.');
        }
        return;
    }
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.classList.remove('hidden');
}

function closeLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) loginModal.classList.add('hidden');
}

async function handleLogin(e) {
    e.preventDefault();
    const userInput = document.getElementById('admin-user').value.trim();
    const passInput = document.getElementById('admin-pass').value.trim();

    const { data: validAdmin, error } = await db
        .from('admins')
        .select('*')
        .eq('user_name', userInput)
        .eq('pass', passInput)
        .single();

    if (validAdmin && !error) {
        isAdminLoggedIn = true;
        closeLoginModal();
        
        document.getElementById('admin-user').value = '';
        document.getElementById('admin-pass').value = '';

        const topbarText = document.getElementById('admin-topbar-text');
        if (topbarText) topbarText.innerText = "Admin Aktif (Klik Logout)";

        const btnProd = document.getElementById('btn-add-product');
        const btnCat = document.getElementById('btn-add-category');
        const btnSet = document.getElementById('btn-admin-setting');
        if (btnProd) btnProd.classList.remove('hidden');
        if (btnCat) btnCat.classList.remove('hidden');
        if (btnSet) btnSet.classList.remove('hidden');

        renderCategories();
        renderProducts('Semua');
        alert('Login Admin Berhasil!');
    } else {
        alert('Username atau Password salah!');
    }
}

// Halaman Setting Admin
function openSettingModal() {
    renderTransactionHistory();
    const settingModal = document.getElementById('setting-modal');
    if (settingModal) settingModal.classList.remove('hidden');
}

function closeSettingModal() {
    const settingModal = document.getElementById('setting-modal');
    if (settingModal) settingModal.classList.add('hidden');
}

async function uploadToSupabaseStorage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await db.storage.from('arshanet-files').upload(fileName, file);
    if (error) {
        alert('Gagal mengupload file!');
        return null;
    }
    const { data: publicURL } = db.storage.from('arshanet-files').getPublicUrl(fileName);
    return publicURL.publicUrl;
}

async function handleUpdatePassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('setting-new-pass').value.trim();
    if (newPass) {
        await db.from('admins').update({ pass: newPass }).eq('user_name', 'admin');
        document.getElementById('setting-new-pass').value = '';
        alert('Password admin berhasil diperbarui!');
    }
}

function renderTransactionHistory() {
    const container = document.getElementById('transaction-history-list');
    if (!container) return;
    if (transactions.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-4">Belum ada transaksi tercatat.</p>`;
        return;
    }

    container.innerHTML = transactions.map((tx) => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
            <div>
                <span class="text-[10px] font-semibold text-gray-400 block">${tx.date}</span>
                <p class="font-bold text-gray-800 mt-0.5">${tx.items}</p>
            </div>
            <span class="font-extrabold text-brand-orange">Rp ${tx.total.toLocaleString('id-ID')}</span>
        </div>
    `).join('');
}

async function clearTransactionHistory() {
    if (confirm('Hapus seluruh riwayat transaksi?')) {
        await db.from('transactions').delete().neq('id', 0);
        transactions = [];
        renderTransactionHistory();
        alert('Riwayat transaksi dikosongkan.');
    }
}

// Tambah Akun Admin Baru ke Database Supabase
async function handleAddAdminUser(e) {
    e.preventDefault();
    const user = document.getElementById('new-admin-user').value.trim();
    const pass = document.getElementById('new-admin-pass').value.trim();

    const { error } = await db.from('admins').insert([{ user_name: user, pass: pass }]);
    if (!error) {
        e.target.reset();
        alert('Akun admin baru berhasil ditambahkan!');
    } else {
        alert('Gagal menambah admin. Pastikan username belum terdaftar.');
    }
}

// Ganti Password Admin
async function handleUpdatePassword(e) {
    e.preventDefault();
    const newPass = document.getElementById('setting-new-pass').value.trim();
    if (newPass) {
        const { error } = await db.from('admins').update({ pass: newPass }).eq('user_name', 'admin');
        if (!error) {
            document.getElementById('setting-new-pass').value = '';
            alert('Password admin utama berhasil diperbarui!');
        } else {
            alert('Gagal memperbarui password.');
        }
    }
}

// Tambah Kategori
function openAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    if (modal) modal.classList.remove('hidden');
}
function closeAddCategoryModal() {
    const modal = document.getElementById('add-category-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleAddCategory(e) {
    e.preventDefault();
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon-url').value.trim();

    const { data, error } = await db.from('categories').insert([{ name, icon }]).select();
    if (!error && data) {
        categories.push(data[0]);
        closeAddCategoryModal();
        e.target.reset();
        renderCategories();
        renderCategoryDropdown();
        alert('Kategori baru berhasil ditambahkan!');
    }
}
let currentEditCategoryIndex = null;

// Membuka Modal Edit Kategori
function openEditCategoryModal(index) {
    currentEditCategoryIndex = index;
    const cat = categories[index];
    if (cat) {
        document.getElementById('edit-cat-index').value = index;
        document.getElementById('edit-cat-name').value = cat.name;
        document.getElementById('edit-cat-icon').value = cat.icon;
        
        const modal = document.getElementById('edit-category-modal');
        if (modal) modal.classList.remove('hidden');
    }
}

// Menutup Modal Edit Kategori
function closeEditCategoryModal() {
    const modal = document.getElementById('edit-category-modal');
    if (modal) modal.classList.add('hidden');
}

// Menyimpan Perubahan Kategori ke Supabase
async function handleEditCategory(e) {
    e.preventDefault();
    const newName = document.getElementById('edit-cat-name').value.trim();
    const newIcon = document.getElementById('edit-cat-icon').value.trim();
    const catToUpdate = categories[currentEditCategoryIndex];

    if (catToUpdate && catToUpdate.id) {
        const { error } = await db.from('categories')
            .update({ name: newName, icon: newIcon })
            .eq('id', catToUpdate.id);

        if (!error) {
            categories[currentEditCategoryIndex].name = newName;
            categories[currentEditCategoryIndex].icon = newIcon;
            closeEditCategoryModal();
            renderCategories();
            renderCategoryDropdown();
            alert('Kategori berhasil diperbarui!');
        } else {
            alert('Gagal memperbarui kategori.');
        }
    }
}

// Menghapus Kategori
async function deleteCurrentCategory() {
    if (confirm('Hapus kategori ini?')) {
        const catToDelete = categories[currentEditCategoryIndex];
        if (catToDelete && catToDelete.id) {
            const { error } = await db.from('categories').delete().eq('id', catToDelete.id);
            if (!error) {
                categories.splice(currentEditCategoryIndex, 1);
                closeEditCategoryModal();
                renderCategories();
                renderCategoryDropdown();
                alert('Kategori berhasil dihapus.');
            } else {
                alert('Gagal menghapus kategori.');
            }
        }
    }
}
// Tambah Produk
function openAddProductModal() {
    if (categories.length === 0) {
        alert('Harap tambahkan minimal satu kategori terlebih dahulu!');
        openAddCategoryModal();
        return;
    }
    renderCategoryDropdown();
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.classList.remove('hidden');
}
function closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleAddProduct(e) {
    e.preventDefault();
    const name = document.getElementById('new-name').value;
    const category = document.getElementById('new-category').value;
    const price = parseFloat(document.getElementById('new-price').value);
    const unit = document.getElementById('new-unit').value;
    const fileInput = document.getElementById('new-image-file');

    if (fileInput.files && fileInput.files[0]) {
        const imageUrl = await uploadToSupabaseStorage(fileInput.files[0]);
        if (imageUrl) {
            const { data, error } = await db.from('products').insert([{ name, category, price, unit, image: imageUrl }]).select();
            if (!error && data) {
                products.push(data[0]);
                closeAddProductModal();
                e.target.reset();
                renderProducts('Semua');
                alert('Produk baru berhasil ditambahkan!');
            }
        }
    }
}

let currentEditId = null;
function openEditModal(id) {
    currentEditId = id;
    const prod = products.find(p => p.id === id);
    if (prod) {
        document.getElementById('edit-id').value = prod.id;
        document.getElementById('edit-name').value = prod.name;
        document.getElementById('edit-price').value = prod.price;
        document.getElementById('edit-unit').value = prod.unit;
        const modal = document.getElementById('edit-product-modal');
        if (modal) modal.classList.remove('hidden');
    }
}
function closeEditModal() {
    const modal = document.getElementById('edit-product-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleEditProduct(e) {
    e.preventDefault();
    const name = document.getElementById('edit-name').value;
    const price = parseFloat(document.getElementById('edit-price').value);
    const unit = document.getElementById('edit-unit').value;

    const { error } = await db.from('products').update({ name, price, unit }).eq('id', currentEditId);
    if (!error) {
        const idx = products.findIndex(p => p.id === currentEditId);
        if (idx !== -1) {
            products[idx].name = name;
            products[idx].price = price;
            products[idx].unit = unit;
        }
        closeEditModal();
        renderProducts('Semua');
        alert('Perubahan berhasil disimpan!');
    }
}

async function deleteCurrentProduct() {
    if (confirm('Hapus produk ini?')) {
        await db.from('products').delete().eq('id', currentEditId);
        products = products.filter(p => p.id !== currentEditId);
        closeEditModal();
        renderProducts('Semua');
        alert('Produk berhasil dihapus.');
    }
}

// Slider Otomatis
let currentSlideIndex = 0;
let slideInterval;

function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    if (!slides || slides.length === 0) return;
    
    if (index >= slides.length) currentSlideIndex = 0;
    else if (index < 0) currentSlideIndex = slides.length - 1;
    else currentSlideIndex = index;

    slides.forEach((slide, i) => {
        slide.style.opacity = i === currentSlideIndex ? '1' : '0';
    });
}

function startSlideTimer() {
    clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        showSlide(currentSlideIndex + 1);
    }, 4000); // Berganti setiap 4 detik
}

// Pastikan dipanggil saat halaman selesai dimuat di window.onload
window.onload = function() {
    loadDataFromSupabase();
    showSlide(0);
    startSlideTimer();
};
