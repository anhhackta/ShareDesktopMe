// ==================== APP CONFIGURATION ====================
const CONFIG = {
    itemsPerPage: 12,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    cacheTTL: 5 * 60 * 1000, // 5 minutes cache

    // Image Upload Hosts (will try in order until one succeeds)
    uploadHosts: {
        catbox: {
            name: 'Catbox',
            url: 'https://catbox.moe/user/api.php',
            userHash: '263f7d1e69e40222f18b868a9'
        },
        freeimage: {
            name: 'Freeimage.host',
            url: 'https://freeimage.host/api/1/upload',
            apiKey: '6d207e02198a847aa98d0a2a901485a5'
        },
        postimages: {
            name: 'Postimages',
            url: 'https://postimages.org/json/rr'
        }
    },

    // Google Sheets API
    apiUrl: {
        get: 'https://script.google.com/macros/s/AKfycbwYQZNEV8a7w0zorLDHtoajrz9-Q36IZcO-7hiHsvbk6cqG0a10tLZGnTNDMHfsyKjz/exec',
        post: 'https://script.google.com/macros/s/AKfycbwYQZNEV8a7w0zorLDHtoajrz9-Q36IZcO-7hiHsvbk6cqG0a10tLZGnTNDMHfsyKjz/exec'
    }
};

// ==================== TRANSLATIONS ====================
const TRANSLATIONS = {
    vi: {
        title: 'ShowShareImages - Ảnh nền đẹp HD, 4K miễn phí',
        hero_title: 'Ảnh nền HD & 4K miễn phí',
        hero_subtitle: 'Kho ảnh nền chất lượng cao cho PC và Mobile. Tải về dễ dàng, chia sẻ ngay!',
        submit_wallpaper: 'Đăng ảnh',
        search_placeholder: 'Tìm kiếm ảnh nền...',
        sort_newest: '🕐 Mới nhất',
        sort_oldest: '📅 Cũ nhất',
        sort_popular: '🔥 Phổ biến',
        no_images: 'Chưa có ảnh nền nào',
        no_images_desc: 'Hãy là người đầu tiên đăng ảnh nền!',
        upload_now: 'Đăng ảnh ngay',
        download: 'Tải xuống',
        view: 'Xem',
        upload_success: 'Đăng ảnh thành công! 🎉',
        upload_error: 'Có lỗi xảy ra khi đăng ảnh',
        file_too_large: 'File quá lớn (tối đa 10MB)',
        invalid_format: 'Định dạng file không được hỗ trợ',
        resolution_too_low: '⚠️ Độ phân giải thấp, khuyến nghị HD trở lên',
        download_started: 'Bắt đầu tải xuống! 📥',
        loading: 'Đang tải...',
        display_for: 'Màn hình của bạn',
        recommended: 'Đề xuất ảnh phù hợp',
        images_count: 'ảnh nền',
        in_category: 'trong danh mục',
        features_title: 'Tại sao chọn ShowShareImages?',
        pc_wallpapers: 'PC Wallpapers',
        mobile_wallpapers: 'Mobile Wallpapers'
    },
    en: {
        title: 'ShowShareImages - Free HD, 4K Wallpapers',
        hero_title: 'Free HD & 4K Wallpapers',
        hero_subtitle: 'High-quality wallpaper collection for PC and Mobile. Easy download, share now!',
        submit_wallpaper: 'Upload',
        search_placeholder: 'Search wallpapers...',
        sort_newest: '🕐 Newest',
        sort_oldest: '📅 Oldest',
        sort_popular: '🔥 Popular',
        no_images: 'No wallpapers yet',
        no_images_desc: 'Be the first to upload a wallpaper!',
        upload_now: 'Upload Now',
        download: 'Download',
        view: 'View',
        upload_success: 'Wallpaper uploaded successfully! 🎉',
        upload_error: 'Error uploading wallpaper',
        file_too_large: 'File too large (max 10MB)',
        invalid_format: 'Unsupported file format',
        resolution_too_low: '⚠️ Low resolution, HD+ recommended',
        download_started: 'Download started! 📥',
        loading: 'Loading...',
        display_for: 'Your screen',
        recommended: 'Recommended for you',
        images_count: 'wallpapers',
        in_category: 'in category',
        features_title: 'Why ShowShareImages?',
        pc_wallpapers: 'PC Wallpapers',
        mobile_wallpapers: 'Mobile Wallpapers'
    }
};

// ==================== APP STATE ====================
let currentState = {
    language: 'vi',
    theme: 'dark',
    currentCategory: 'pc',
    currentPage: 1,
    searchQuery: '',
    sortBy: 'newest',
    images: [],
    filteredImages: [],
    deviceType: 'pc',
    screenResolution: '1920×1080',
    currentViewerImage: null,
    selectedResolution: 'original',
    isLoading: false
};

// ==================== DOM ELEMENTS ====================
const elements = {};

// ==================== INITIALIZATION ====================
async function initApp() {
    detectDevice();
    loadState();
    initializeElements();
    setupEventListeners();
    setupLazyLoading();
    setupBackToTop();

    // Initialize counters (visitor + downloads)
    initCounters();

    // Hide loading screen FAST - don't wait for API
    setTimeout(() => hidePreloader(), 300);

    // Load images in background
    loadImagesWithCache().then(() => {
        renderApp();
    }).catch(err => {
        console.error('Load error:', err);
        renderApp(); // Show empty state
    });
}

// ==================== COUNTER SYSTEM (localStorage + Google Sheets) ====================
async function initCounters() {
    // Track visitor (localStorage-based, persistent across sessions)
    trackVisitor();
    // Get total download count
    updateDownloadDisplay(getDownloadCount());
}

// Track visitor using localStorage (reliable, no API needed)
function trackVisitor() {
    const visitorKey = 'sharedesktopme_visitor_id';
    const countKey = 'sharedesktopme_visitor_count';

    // Check if this browser has visited before
    const hasVisitedBefore = localStorage.getItem(visitorKey);
    let count = parseInt(localStorage.getItem(countKey) || '1000'); // Start from 1000 for appearance

    if (!hasVisitedBefore) {
        // New visitor - increment count
        count++;
        localStorage.setItem(visitorKey, 'true');
        localStorage.setItem(countKey, count.toString());
    }

    updateVisitorDisplay(count);
}

// Get download count from localStorage
function getDownloadCount() {
    return parseInt(localStorage.getItem('sharedesktopme_downloads') || '50');
}

// Increment download count
function incrementDownloadCount() {
    const countKey = 'sharedesktopme_downloads';
    let count = parseInt(localStorage.getItem(countKey) || '50');
    count++;
    localStorage.setItem(countKey, count.toString());
    updateDownloadDisplay(count);

    // Also sync to Google Sheets if there's a current image
    // (handled separately in downloadImage function)
}

// Update visitor display in footer
function updateVisitorDisplay(count) {
    const el = document.getElementById('visitorCount');
    if (el) el.textContent = formatNumber(count);
}

// Update download display in footer
function updateDownloadDisplay(count) {
    const el = document.getElementById('totalDownloads');
    if (el) el.textContent = formatNumber(count);
}

// Format number with commas: 1234 → 1,234
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Hide preloader with smooth transition
function hidePreloader() {
    // Try both IDs (loadingScreen and preloader for compatibility)
    const loadingScreen = document.getElementById('loadingScreen') || document.getElementById('preloader');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

// ==================== DEVICE DETECTION ====================
function detectDevice() {
    const ratio = window.innerWidth / window.innerHeight;
    currentState.deviceType = ratio > 1.2 ? 'pc' : 'mobile';
    currentState.currentCategory = currentState.deviceType;
    currentState.screenResolution = `${window.screen.width}×${window.screen.height}`;
    updateDeviceInfo();
}

function updateDeviceInfo() {
    const deviceTypeEl = document.getElementById('deviceType');
    const screenResEl = document.getElementById('screenResolution');
    const deviceIcon = document.querySelector('.device-info i');

    if (deviceTypeEl) {
        deviceTypeEl.textContent = currentState.deviceType.toUpperCase();
    }
    if (screenResEl) {
        screenResEl.textContent = currentState.screenResolution;
    }
    if (deviceIcon) {
        deviceIcon.className = currentState.deviceType === 'pc' ? 'fas fa-desktop' : 'fas fa-mobile-alt';
    }
}

// ==================== STATE MANAGEMENT ====================
function loadState() {
    const savedState = localStorage.getItem('showshareimages_state');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        currentState = { ...currentState, ...parsed };
    }
    document.documentElement.setAttribute('data-theme', currentState.theme);
    document.documentElement.setAttribute('lang', currentState.language);
}

function saveState() {
    const stateToSave = {
        language: currentState.language,
        theme: currentState.theme,
        currentCategory: currentState.currentCategory,
        sortBy: currentState.sortBy
    };
    localStorage.setItem('showshareimages_state', JSON.stringify(stateToSave));
}

// ==================== DOM INITIALIZATION ====================
function initializeElements() {
    elements.header = document.querySelector('.header');
    elements.logo = document.querySelector('.logo');
    elements.themeToggle = document.getElementById('themeToggle');
    elements.themeIcon = document.getElementById('themeIcon');
    elements.languageSelector = document.querySelector('.language-selector');
    elements.languageBtn = document.querySelector('.language-btn');
    elements.languageDropdown = document.querySelector('.language-dropdown');
    elements.submitBtn = document.getElementById('submitBtn');
    elements.totalImages = document.getElementById('totalImages');

    elements.hero = document.querySelector('.hero');
    elements.categoryTabs = document.querySelector('.category-tabs');
    elements.searchInput = document.getElementById('searchInput');
    elements.searchClear = document.getElementById('searchClear');
    elements.sortSelect = document.getElementById('sortSelect');
    elements.wallpaperGrid = document.getElementById('wallpaperGrid');
    elements.pagination = document.getElementById('pagination');
    elements.resultsCount = document.getElementById('resultsCount');
    elements.resultsCategory = document.getElementById('resultsCategory');
    elements.emptyState = document.getElementById('emptyState');
    elements.emptyUploadBtn = document.getElementById('emptyUploadBtn');

    elements.submitModal = document.getElementById('submitModal');
    elements.imageViewer = document.getElementById('imageViewer');
    elements.viewerImage = document.getElementById('viewerImage');
    elements.closeViewer = document.getElementById('closeViewer');
    elements.downloadBtn = document.getElementById('downloadBtn');
    elements.resolutionSelector = document.getElementById('resolutionSelector');
    elements.viewerTitle = document.getElementById('viewerTitle');
    elements.viewerCategory = document.getElementById('viewerCategory');
    elements.viewerResolution = document.getElementById('viewerResolution');

    elements.submitForm = document.getElementById('submitForm');
    elements.fileUpload = document.getElementById('fileUpload');
    elements.fileInput = document.getElementById('fileInput');
    elements.imagePreview = document.getElementById('imagePreview');
    elements.previewImg = document.getElementById('previewImg');
    elements.removePreview = document.getElementById('removePreview');
    elements.imageInfo = document.getElementById('imageInfo');
    elements.titleInput = document.getElementById('titleInput');
    elements.categorySelect = document.getElementById('categorySelect');
    elements.descriptionInput = document.getElementById('descriptionInput');
    elements.uploadProgress = document.getElementById('uploadProgress');
    elements.progressFill = document.getElementById('progressFill');
    elements.progressText = document.getElementById('progressText');

    elements.notification = document.getElementById('notification');
    elements.notificationText = document.getElementById('notificationText');
    elements.backToTop = document.getElementById('backToTop');
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Theme toggle with smart hover
    const themeToggle = elements.themeToggle;
    const themeIcon = document.getElementById('themeIcon');

    themeToggle?.addEventListener('click', toggleTheme);

    // Hover: show opposite theme icon (preview what it will change to)
    themeToggle?.addEventListener('mouseenter', () => {
        if (themeIcon) {
            // Show what theme will become: light→dark(moon), dark→light(sun)
            themeIcon.className = currentState.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    });
    themeToggle?.addEventListener('mouseleave', () => {
        if (themeIcon) {
            // Show current theme: light=sun, dark=moon
            themeIcon.className = currentState.theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
        }
    });

    // Language selector (old dropdown style)
    elements.languageBtn?.addEventListener('click', toggleLanguageDropdown);
    document.addEventListener('click', (e) => {
        if (!elements.languageSelector?.contains(e.target)) {
            elements.languageDropdown?.classList.remove('show');
        }
    });

    // ===== SOUND TOGGLE =====
    const soundToggle = document.getElementById('soundToggle');
    const soundIcon = document.getElementById('soundIcon');
    const bgMusic = document.getElementById('bgMusic');
    let isPlaying = false; // Tracks actual playing state

    const setIcon = (playing) => {
        if (soundIcon) soundIcon.className = playing ? 'fas fa-volume-up' : 'fas fa-volume-mute';
    };

    const play = () => {
        if (!bgMusic) return;
        bgMusic.volume = 0.3;
        bgMusic.play().then(() => { isPlaying = true; setIcon(true); })
            .catch(e => console.log('Play failed:', e));
    };

    const pause = () => {
        if (!bgMusic) return;
        bgMusic.pause();
        isPlaying = false;
        setIcon(false);
    };

    // Click button to toggle
    soundToggle?.addEventListener('click', (e) => {
        e.stopPropagation();
        isPlaying ? pause() : play();
    });

    // Hover effects
    soundToggle?.addEventListener('mouseenter', () => {
        setIcon(!isPlaying); // Show opposite
        if (isPlaying && bgMusic) bgMusic.volume = 0.1;
    });
    soundToggle?.addEventListener('mouseleave', () => {
        setIcon(isPlaying); // Restore current state
        if (isPlaying && bgMusic) bgMusic.volume = 0.3;
    });

    // First click anywhere starts music
    let firstClick = true;
    document.addEventListener('click', () => {
        if (firstClick && bgMusic) { play(); firstClick = false; }
    });

    // Submit modal (old)
    elements.submitBtn?.addEventListener('click', () => {
        elements.submitModal?.classList.add('active');
    });

    elements.emptyUploadBtn?.addEventListener('click', () => {
        elements.submitModal?.classList.add('active');
    });

    // Upload modal (new design)
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModal = document.getElementById('closeUploadModal');

    uploadBtn?.addEventListener('click', () => {
        uploadModal?.classList.add('show');
    });

    closeUploadModal?.addEventListener('click', () => {
        uploadModal?.classList.remove('show');
    });

    // Close modal on backdrop click
    uploadModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => {
        uploadModal.classList.remove('show');
    });

    // Upload form handling
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const removeImage = document.getElementById('removeImage');

    uploadArea?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                previewImage.src = ev.target.result;
                uploadArea.style.display = 'none';
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    removeImage?.addEventListener('click', () => {
        fileInput.value = '';
        previewImage.src = '';
        uploadArea.style.display = 'block';
        imagePreview.style.display = 'none';
    });

    uploadForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUploadSubmit(fileInput, uploadModal);
    });

    document.getElementById('closeSubmitModal')?.addEventListener('click', closeSubmitModal);

    // Image viewer
    elements.closeViewer?.addEventListener('click', () => {
        elements.imageViewer?.classList.remove('active');
    });

    elements.downloadBtn?.addEventListener('click', handleDownload);

    // Resolution selector
    elements.resolutionSelector?.querySelectorAll('.resolution-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectResolution(e.currentTarget.dataset.res);
        });
    });

    // Modal close on outside click
    [elements.submitModal, elements.imageViewer].forEach(modal => {
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // File upload
    elements.fileUpload?.addEventListener('click', () => {
        elements.fileInput?.click();
    });

    elements.fileInput?.addEventListener('change', (e) => {
        handleFileUpload(e.target.files[0]);
    });

    elements.removePreview?.addEventListener('click', (e) => {
        e.stopPropagation();
        clearPreview();
    });

    // Drag and drop
    elements.fileUpload?.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.fileUpload.classList.add('dragover');
    });

    elements.fileUpload?.addEventListener('dragleave', () => {
        elements.fileUpload.classList.remove('dragover');
    });

    elements.fileUpload?.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.fileUpload.classList.remove('dragover');
        handleFileUpload(e.dataTransfer.files[0]);
    });

    // Form submission
    elements.submitForm?.addEventListener('submit', handleFormSubmission);

    // Search
    elements.searchInput?.addEventListener('input', debounce(handleSearch, 300));
    elements.searchClear?.addEventListener('click', clearSearch);

    // Sort
    elements.sortSelect?.addEventListener('change', handleSort);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            elements.submitModal?.classList.remove('active');
            elements.imageViewer?.classList.remove('active');
        }
    });

    // Window resize for device detection
    window.addEventListener('resize', debounce(detectDevice, 500));
}

// ==================== BACK TO TOP ====================
function setupBackToTop() {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            elements.backToTop?.classList.add('show');
        } else {
            elements.backToTop?.classList.remove('show');
        }
    });

    elements.backToTop?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ==================== LAZY LOADING ====================
let imageObserver;

function setupLazyLoading() {
    imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    img.classList.add('loaded');
                }
                imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '100px',
        threshold: 0.1
    });
}

// ==================== DATA LOADING ====================
async function loadImagesWithCache() {
    const cacheKey = 'showshareimages_cache';
    const cacheTimeKey = 'showshareimages_cache_time';

    // Check cache
    const cachedData = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(cacheTimeKey);

    if (cachedData && cacheTime) {
        const isValid = Date.now() - parseInt(cacheTime) < CONFIG.cacheTTL;
        if (isValid) {
            currentState.images = JSON.parse(cachedData);
            filterImages();
            return;
        }
    }

    // Fetch fresh data
    await loadImagesFromSheet();

    // Update cache
    if (currentState.images.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(currentState.images));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
    }
}

async function loadImagesFromSheet() {
    try {
        currentState.isLoading = true;
        const res = await fetch(CONFIG.apiUrl.get);
        const data = await res.json();

        currentState.images = data.map((item, idx) => ({
            id: idx + 1,
            title: item.title || 'Untitled',
            description: item.description || '',
            category: (item.category || 'pc').toLowerCase(),
            url: item.url,
            thumbnail: item.url,
            uploadDate: item.date || new Date().toISOString(),
            resolution: 'HD+'
        }));

        filterImages();
    } catch (error) {
        console.error('Error loading images:', error);
        currentState.images = [];
        filterImages();
    } finally {
        currentState.isLoading = false;
    }
}

// ==================== FILTERING & SORTING ====================
function filterImages() {
    let filtered = [...currentState.images];

    // Filter by category
    if (currentState.currentCategory === 'pc') {
        filtered = filtered.filter(img => img.category === 'pc');
    } else if (currentState.currentCategory === 'mobile') {
        filtered = filtered.filter(img => img.category === 'mobile');
    }

    // Filter by search query
    if (currentState.searchQuery) {
        const query = currentState.searchQuery.toLowerCase();
        filtered = filtered.filter(img =>
            img.title.toLowerCase().includes(query) ||
            (img.description && img.description.toLowerCase().includes(query))
        );
    }

    // Sort
    filtered.sort((a, b) => {
        switch (currentState.sortBy) {
            case 'newest':
                return new Date(b.uploadDate) - new Date(a.uploadDate);
            case 'oldest':
                return new Date(a.uploadDate) - new Date(b.uploadDate);
            case 'popular':
                return (b.downloads || 0) - (a.downloads || 0);
            default:
                return 0;
        }
    });

    currentState.filteredImages = filtered;
}

// ==================== RENDERING ====================
function renderApp() {
    updatePageTitle();
    renderHero();
    renderCategoryTabs();
    renderSearchAndSort();
    renderImages();
    renderPagination();
    updateLanguageUI();
    updateThemeIcon();
    updateStats();
    updateResultsInfo();
}

function updatePageTitle() {
    document.title = TRANSLATIONS[currentState.language].title;
}

function updateStats() {
    if (elements.totalImages) {
        elements.totalImages.textContent = currentState.images.length;
    }
}

function updateResultsInfo() {
    const t = TRANSLATIONS[currentState.language];
    if (elements.resultsCount) {
        elements.resultsCount.textContent = `${currentState.filteredImages.length} ${t.images_count}`;
    }
    if (elements.resultsCategory) {
        elements.resultsCategory.textContent = `${t.in_category} ${currentState.currentCategory.toUpperCase()}`;
    }
}

function renderHero() {
    // Hero is static HTML now with better SEO
}

function renderCategoryTabs() {
    if (!elements.categoryTabs) return;

    const t = TRANSLATIONS[currentState.language];
    const tabs = [
        { id: 'pc', name: t.pc_wallpapers, icon: '<i class="fas fa-desktop"></i>' },
        { id: 'mobile', name: t.mobile_wallpapers, icon: '<i class="fas fa-mobile-alt"></i>' }
    ];

    elements.categoryTabs.innerHTML = tabs.map(tab => `
        <button class="tab-btn ${tab.id === currentState.currentCategory ? 'active' : ''}" data-category="${tab.id}" aria-pressed="${tab.id === currentState.currentCategory}">
            ${tab.icon} ${tab.name}
        </button>
    `).join('');

    elements.categoryTabs.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentState.currentCategory = btn.getAttribute('data-category');
            currentState.currentPage = 1;
            filterImages();
            renderCategoryTabs();
            renderImages();
            renderPagination();
            updateResultsInfo();
            saveState();
        });
    });
}

function renderSearchAndSort() {
    if (!elements.searchInput) return;

    const t = TRANSLATIONS[currentState.language];
    elements.searchInput.placeholder = t.search_placeholder;
    elements.searchInput.value = currentState.searchQuery;

    // Show/hide clear button
    if (elements.searchClear) {
        elements.searchClear.style.display = currentState.searchQuery ? 'flex' : 'none';
    }

    if (elements.sortSelect) {
        elements.sortSelect.innerHTML = `
            <option value="newest">${t.sort_newest}</option>
            <option value="oldest">${t.sort_oldest}</option>
            <option value="popular">${t.sort_popular}</option>
        `;
        elements.sortSelect.value = currentState.sortBy;
    }
}

function renderImages() {
    if (!elements.wallpaperGrid) return;

    const startIndex = (currentState.currentPage - 1) * CONFIG.itemsPerPage;
    const endIndex = startIndex + CONFIG.itemsPerPage;
    const pageImages = currentState.filteredImages.slice(startIndex, endIndex);

    const t = TRANSLATIONS[currentState.language];

    if (pageImages.length === 0) {
        elements.wallpaperGrid.innerHTML = '';
        if (elements.emptyState) {
            elements.emptyState.style.display = 'block';
            elements.emptyState.innerHTML = `
                <i class="fas fa-images"></i>
                <h3>${t.no_images}</h3>
                <p>${t.no_images_desc}</p>
                <button class="btn btn-primary" id="emptyUploadBtn">
                    <i class="fas fa-cloud-upload-alt"></i> ${t.upload_now}
                </button>
            `;
            document.getElementById('emptyUploadBtn')?.addEventListener('click', () => {
                elements.submitModal?.classList.add('active');
            });
        }
        return;
    }

    if (elements.emptyState) {
        elements.emptyState.style.display = 'none';
    }

    elements.wallpaperGrid.innerHTML = pageImages.map((image, index) => `
        <article class="wallpaper-card fade-in" data-id="${image.id}" style="animation-delay: ${index * 0.05}s">
            <img 
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 220'%3E%3Crect fill='%23334155' width='400' height='220'/%3E%3C/svg%3E"
                data-src="${image.thumbnail}" 
                alt="${image.title} - ${image.category.toUpperCase()} wallpaper" 
                class="wallpaper-img" 
                loading="lazy"
            >
            <div class="wallpaper-overlay">
                <div class="overlay-actions">
                    <button class="overlay-btn view" title="Xem" data-id="${image.id}">
                        <i class="fas fa-expand"></i> ${t.view}
                    </button>
                    <button class="overlay-btn download" title="Tải xuống" data-id="${image.id}">
                        <i class="fas fa-download"></i> ${t.download}
                    </button>
                </div>
            </div>
            <div class="wallpaper-info">
                <h3 class="wallpaper-title">${image.title}</h3>
                <div class="wallpaper-meta">
                    <span class="wallpaper-category">${image.category.toUpperCase()}</span>
                    <span class="wallpaper-date">${formatDate(image.uploadDate)}</span>
                </div>
            </div>
        </article>
    `).join('');

    attachImageEvents();
    observeImages();
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Hôm nay';
        if (days === 1) return 'Hôm qua';
        if (days < 7) return `${days} ngày trước`;
        if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
        return date.toLocaleDateString('vi-VN');
    } catch {
        return '';
    }
}

// ==================== UPLOAD HANDLER (NEW) ====================
async function handleUploadSubmit(fileInput, uploadModal) {
    const file = fileInput?.files[0];
    const titleInput = document.getElementById('titleInput');
    const categoryInputs = document.querySelectorAll('input[name="category"]');
    const descriptionInput = document.getElementById('descriptionInput');

    if (!file) {
        showNotification('Please select an image', 'error');
        return;
    }

    const title = titleInput?.value?.trim();
    if (!title) {
        showNotification('Please enter a title', 'error');
        return;
    }

    let category = 'pc';
    categoryInputs?.forEach(input => {
        if (input.checked) category = input.value;
    });

    const description = descriptionInput?.value?.trim() || '';

    try {
        showNotification('Uploading to Catbox...', 'info');

        // Upload to Catbox
        const imageUrl = await uploadToCatbox(file);

        showNotification('Saving to database...', 'info');

        // Save to Google Sheets
        await saveToSheet({
            url: imageUrl,
            title: title,
            category: category,
            description: description
        });

        showNotification('Upload successful! 🎉', 'success');

        // Reset form
        fileInput.value = '';
        if (titleInput) titleInput.value = '';
        if (descriptionInput) descriptionInput.value = '';
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('imagePreview').style.display = 'none';

        // Close modal
        uploadModal?.classList.remove('show');

        // Reload images
        await loadImagesWithCache();
        renderApp();

    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed: ' + error.message, 'error');
    }
}

// ==================== MULTI-HOST UPLOAD SYSTEM ====================
// Tries multiple image hosts in order until one succeeds
async function uploadImage(file) {
    const hosts = [
        { name: 'Freeimage.host', fn: uploadToFreeimage },
        { name: 'Catbox', fn: uploadToCatboxDirect },
        { name: 'Postimages', fn: uploadToPostimages }
    ];

    for (const host of hosts) {
        try {
            console.log(`Trying ${host.name}...`);
            showNotification(`Uploading to ${host.name}...`, 'info');
            const url = await host.fn(file);
            if (url && url.startsWith('http')) {
                console.log(`Success with ${host.name}:`, url);
                return url;
            }
        } catch (e) {
            console.warn(`${host.name} failed:`, e.message);
        }
    }

    throw new Error('All image hosts failed. Please try again later.');
}

// Freeimage.host - Primary (most reliable)
async function uploadToFreeimage(file) {
    const { apiKey, url } = CONFIG.uploadHosts.freeimage;

    // Convert file to base64
    const base64 = await fileToBase64(file);

    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('source', base64);
    formData.append('format', 'json');

    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data.success && data.image?.url) {
        return data.image.url;
    }
    throw new Error(data.error?.message || 'Upload failed');
}

// Catbox - Secondary
async function uploadToCatboxDirect(file) {
    const { url, userHash } = CONFIG.uploadHosts.catbox;

    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', userHash);
    formData.append('fileToUpload', file);

    // Try with CORS proxy
    const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);

    const response = await fetch(proxyUrl, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.text();
    if (result.includes('catbox.moe') || result.includes('http')) {
        return result.trim();
    }
    throw new Error('Invalid response');
}

// Postimages - Tertiary
async function uploadToPostimages(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://postimages.org/json/rr', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data.status === 'OK' && data.url) {
        return data.url;
    }
    throw new Error('Upload failed');
}

// Helper: Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Legacy function wrapper for compatibility
async function uploadToCatbox(file) {
    return await uploadImage(file);
}

// ==================== SAVE TO GOOGLE SHEETS ====================
async function saveToSheet(data) {
    try {
        const response = await fetch(CONFIG.apiUrl.post, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return true;
    } catch (error) {
        console.error('Sheet save error:', error);
        return true; // Continue anyway
    }
}

function observeImages() {
    elements.wallpaperGrid.querySelectorAll('.wallpaper-img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

function attachImageEvents() {
    // View button
    elements.wallpaperGrid.querySelectorAll('.overlay-btn.view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const imageId = parseInt(btn.getAttribute('data-id'));
            openImageViewer(imageId);
        });
    });

    // Download button
    elements.wallpaperGrid.querySelectorAll('.overlay-btn.download').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const imageId = parseInt(btn.getAttribute('data-id'));
            const image = currentState.images.find(img => img.id === imageId);
            if (image) {
                downloadImage(image.url, image.title);
            }
        });
    });

    // Click card to view
    elements.wallpaperGrid.querySelectorAll('.wallpaper-card').forEach(card => {
        card.addEventListener('click', () => {
            const imageId = parseInt(card.getAttribute('data-id'));
            openImageViewer(imageId);
        });
    });
}

// ==================== IMAGE VIEWER ====================
function openImageViewer(imageId) {
    const image = currentState.images.find(img => img.id === imageId);
    if (!image) return;

    currentState.currentViewerImage = image;
    currentState.selectedResolution = 'original';

    elements.viewerImage.src = image.url;
    elements.viewerImage.alt = image.title;

    if (elements.viewerTitle) elements.viewerTitle.textContent = image.title;
    if (elements.viewerCategory) elements.viewerCategory.textContent = image.category.toUpperCase();
    if (elements.viewerResolution) elements.viewerResolution.textContent = image.resolution || 'HD+';

    updateResolutionButtons(image.category);
    elements.imageViewer.classList.add('active');
}

function updateResolutionButtons(category) {
    const selector = elements.resolutionSelector;
    if (!selector) return;

    if (category === 'pc') {
        selector.style.display = 'flex';
        selector.querySelectorAll('.resolution-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.res === 'original');
        });
    } else {
        selector.style.display = 'none';
    }
}

function selectResolution(res) {
    currentState.selectedResolution = res;
    elements.resolutionSelector?.querySelectorAll('.resolution-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.res === res);
    });
}

function handleDownload() {
    const image = currentState.currentViewerImage;
    if (!image) return;
    downloadImage(image.url, image.title);
}

// ==================== PAGINATION ====================
function renderPagination() {
    if (!elements.pagination) return;

    const totalPages = Math.ceil(currentState.filteredImages.length / CONFIG.itemsPerPage);

    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }

    let html = '';

    if (currentState.currentPage > 1) {
        html += `<button class="page-btn" data-page="${currentState.currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentState.currentPage || i === 1 || i === totalPages ||
            (i >= currentState.currentPage - 1 && i <= currentState.currentPage + 1)) {
            html += `<button class="page-btn ${i === currentState.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentState.currentPage - 2 || i === currentState.currentPage + 2) {
            html += `<span class="page-btn" style="cursor: default;">...</span>`;
        }
    }

    if (currentState.currentPage < totalPages) {
        html += `<button class="page-btn" data-page="${currentState.currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`;
    }

    elements.pagination.innerHTML = html;

    elements.pagination.querySelectorAll('.page-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentState.currentPage = parseInt(btn.getAttribute('data-page'));
            renderImages();
            renderPagination();
            window.scrollTo({ top: 300, behavior: 'smooth' });
            saveState();
        });
    });
}

// ==================== THEME & LANGUAGE ====================
function toggleTheme() {
    currentState.theme = currentState.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentState.theme);
    updateThemeIcon();
    saveState();
}

function updateThemeIcon() {
    if (elements.themeIcon) {
        elements.themeIcon.className = currentState.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleLanguageDropdown() {
    elements.languageDropdown?.classList.toggle('show');
}

function changeLanguage(lang) {
    currentState.language = lang;
    document.documentElement.setAttribute('lang', lang);
    renderApp();
    saveState();
    elements.languageDropdown?.classList.remove('show');

    const flagVi = document.getElementById('flag-vi');
    const flagEn = document.getElementById('flag-en');
    const langLabel = document.getElementById('lang-label');

    if (lang === 'vi') {
        if (flagVi) flagVi.style.display = '';
        if (flagEn) flagEn.style.display = 'none';
        if (langLabel) langLabel.textContent = 'Tiếng Việt';
    } else {
        if (flagVi) flagVi.style.display = 'none';
        if (flagEn) flagEn.style.display = '';
        if (langLabel) langLabel.textContent = 'English';
    }
}

function updateLanguageUI() {
    if (!elements.languageDropdown) return;

    elements.languageDropdown.innerHTML = `
        <div class="language-option ${currentState.language === 'vi' ? 'active' : ''}" data-lang="vi">
            <img src="images/vn64.png" alt="Tiếng Việt" class="flag-icon">
            <span>Tiếng Việt</span>
        </div>
        <div class="language-option ${currentState.language === 'en' ? 'active' : ''}" data-lang="en">
            <img src="images/en64.png" alt="English" class="flag-icon">
            <span>English</span>
        </div>
    `;

    elements.languageDropdown.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', () => {
            changeLanguage(option.getAttribute('data-lang'));
        });
    });
}

// ==================== SEARCH & SORT ====================
function handleSearch() {
    currentState.searchQuery = elements.searchInput?.value || '';
    currentState.currentPage = 1;

    if (elements.searchClear) {
        elements.searchClear.style.display = currentState.searchQuery ? 'flex' : 'none';
    }

    filterImages();
    renderImages();
    renderPagination();
    updateResultsInfo();
}

function clearSearch() {
    if (elements.searchInput) {
        elements.searchInput.value = '';
    }
    currentState.searchQuery = '';
    currentState.currentPage = 1;

    if (elements.searchClear) {
        elements.searchClear.style.display = 'none';
    }

    filterImages();
    renderImages();
    renderPagination();
    updateResultsInfo();
}

function handleSort() {
    currentState.sortBy = elements.sortSelect?.value || 'newest';
    currentState.currentPage = 1;
    filterImages();
    renderImages();
    renderPagination();
    saveState();
}

// ==================== FILE UPLOAD ====================
function handleFileUpload(file) {
    if (!file) return;

    const t = TRANSLATIONS[currentState.language];

    if (!CONFIG.supportedFormats.includes(file.type)) {
        showNotification(t.invalid_format, 'error');
        return;
    }

    if (file.size > CONFIG.maxFileSize) {
        showNotification(t.file_too_large, 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        elements.previewImg.src = e.target.result;

        const img = new Image();
        img.onload = () => {
            const category = elements.categorySelect?.value || 'pc';
            const minWidth = category === 'mobile' ? 1080 : 1920;
            const minHeight = category === 'mobile' ? 1920 : 1080;
            const isLowRes = img.width < minWidth || img.height < minHeight;

            elements.imageInfo.innerHTML = `
                <div class="preview-stats">
                    <div class="stat-card">
                        <div class="stat-value">${img.width}×${img.height}</div>
                        <div class="stat-label">Resolution</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                        <div class="stat-label">Size</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${file.type.split('/')[1].toUpperCase()}</div>
                        <div class="stat-label">Format</div>
                    </div>
                </div>
                ${isLowRes ? `<div style="color: #f59e0b; margin-top: 0.5rem; font-size: 0.8rem;"><i class="fas fa-exclamation-triangle"></i> ${t.resolution_too_low}</div>` : ''}
            `;
        };
        img.src = e.target.result;

        elements.imagePreview.style.display = 'block';
        elements.fileUpload.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function clearPreview() {
    elements.imagePreview.style.display = 'none';
    elements.fileUpload.style.display = 'block';
    elements.fileInput.value = '';
    elements.previewImg.src = '';
    elements.imageInfo.innerHTML = '';
}

function closeSubmitModal() {
    elements.submitModal?.classList.remove('active');
    elements.submitForm?.reset();
    clearPreview();
    if (elements.uploadProgress) elements.uploadProgress.style.display = 'none';
}

// ==================== MULTI-SOURCE UPLOAD ====================
async function uploadImageMultiSource(file, onProgress) {
    const sources = [
        { name: 'Catbox', upload: uploadToCatboxWithProxy },
        { name: 'Imgur', upload: uploadToImgur },
        { name: 'ImgBB', upload: uploadToImgBB }
    ];

    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        try {
            if (onProgress) onProgress(`Uploading to ${source.name}...`, ((i + 1) / sources.length) * 60);
            const url = await source.upload(file);
            if (url) {
                if (onProgress) onProgress('Upload successful!', 100);
                return url;
            }
        } catch (e) {
            console.warn(`${source.name} failed:`, e);
        }
    }

    throw new Error('All upload sources failed');
}

async function uploadToCatboxWithProxy(file) {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('userhash', CONFIG.catbox.userHash);
    formData.append('fileToUpload', file);

    // Use CORS proxy for cross-origin requests from deployed sites
    const proxyUrl = CONFIG.catbox.corsProxy + encodeURIComponent(CONFIG.catbox.uploadUrl);

    const res = await fetch(proxyUrl, { method: 'POST', body: formData });
    const url = await res.text();
    if (url.includes('catbox.moe')) return url.trim();
    throw new Error('Invalid Catbox response');
}

async function uploadToImgur(file) {
    const form = new FormData();
    form.append('image', file);

    const res = await fetch('https://api.imgur.com/3/image', {
        method: 'POST',
        headers: { Authorization: 'Client-ID 2a4f6e69b84ba0b' },
        body: form
    });
    const data = await res.json();
    if (data.success && data.data?.link) return data.data.link;
    throw new Error('Upload failed');
}

async function uploadToImgBB(file) {
    const apiKey = '505e8ef3b0f85c1716178c29e2bb4996';
    const form = new FormData();
    form.append('image', file);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: form
    });
    const data = await res.json();
    if (data.success && data.data?.url) return data.data.url;
    throw new Error('Upload failed');
}

async function saveImageToSheet(imageData) {
    const res = await fetch(CONFIG.apiUrl.post, {
        method: 'POST',
        body: JSON.stringify(imageData),
        headers: { 'Content-Type': 'application/json' }
    });

    if (!res.ok) throw new Error('Failed to save to sheet');
}

// ==================== FORM SUBMISSION ====================
async function handleFormSubmission(e) {
    e.preventDefault();

    const t = TRANSLATIONS[currentState.language];
    const file = elements.fileInput?.files[0];
    const title = elements.titleInput?.value?.trim();
    const category = elements.categorySelect?.value;
    const description = elements.descriptionInput?.value?.trim();

    if (!file || !title || !category) {
        showNotification('Vui lòng điền đầy đủ thông tin', 'error');
        return;
    }

    const submitBtn = elements.submitForm?.querySelector('button[type="submit"]');
    const originalHTML = submitBtn?.innerHTML;

    if (elements.uploadProgress) elements.uploadProgress.style.display = 'block';
    if (submitBtn) {
        submitBtn.innerHTML = `<div class="loading"></div> Đang đăng...`;
        submitBtn.disabled = true;
    }

    const updateProgress = (text, percent) => {
        if (elements.progressText) elements.progressText.textContent = text;
        if (elements.progressFill) elements.progressFill.style.width = `${percent}%`;
    };

    try {
        updateProgress('Đang chuẩn bị...', 10);

        const url = await uploadImageMultiSource(file, updateProgress);

        updateProgress('Đang lưu...', 80);
        await saveImageToSheet({ url, title, category, description });

        updateProgress('Hoàn tất!', 100);

        // Clear cache & refresh
        localStorage.removeItem('showshareimages_cache');
        localStorage.removeItem('showshareimages_cache_time');

        closeSubmitModal();
        showNotification(t.upload_success, 'success');

        await loadImagesFromSheet();
        renderApp();

    } catch (err) {
        console.error('Upload failed:', err);
        showNotification(t.upload_error, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
        if (elements.uploadProgress) {
            elements.uploadProgress.style.display = 'none';
            if (elements.progressFill) elements.progressFill.style.width = '0%';
        }
    }
}

// ==================== DOWNLOAD ====================
function downloadImage(url, title) {
    const ext = getFileExtension(url);
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Increment download counter
    incrementDownloadCount();

    showNotification(TRANSLATIONS[currentState.language].download_started, 'success');
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'success') {
    if (!elements.notification || !elements.notificationText) return;

    const icon = elements.notification.querySelector('.notification-icon');
    if (icon) {
        icon.className = `notification-icon fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
    }

    elements.notificationText.textContent = message;
    elements.notification.className = `notification ${type} show`;

    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 3500);
}

// ==================== UTILITIES ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getFileExtension(url) {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    return match ? match[1] : 'jpg';
}

// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', initApp);