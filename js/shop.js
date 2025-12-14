// shop.js - Основной класс, объединяющий все модули
import { getApiBaseUrl, checkIsMobile, setupSwipeGestures, preventDoubleTapZoom, closeAllModals } from './utils.js';
import { ProductsModule } from './products.js';
import { CartModule } from './cart.js';
import { AuthModule } from './auth.js';
import { ProfileModule } from './profile.js';
import { AdminModule } from './admin.js';

export class NeonShop {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.products = [];
        this.user = JSON.parse(localStorage.getItem('user')) || null;
        this.token = localStorage.getItem('token') || null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalProducts = 0;
        this.productsEventDelegate = false;
        
        this.API_BASE_URL = getApiBaseUrl();
        console.log('API Base URL:', this.API_BASE_URL);

        this.isMobile = checkIsMobile();
        
        // Инициализируем модули
        this.productsModule = new ProductsModule(this);
        this.cartModule = new CartModule(this);
        this.authModule = new AuthModule(this);
        this.profileModule = new ProfileModule(this);
        this.adminModule = new AdminModule(this);
        
        this.init();
    }

    async init() {
        this.authModule.setupAgeVerification();
        
        this.cartModule.updateCartInfo();
        this.authModule.updateAuthUI();
        this.setupEventListeners();
        
        const promises = [this.productsModule.loadProducts()];
        if (this.token) {
            promises.push(this.authModule.validateToken());
        }
        await Promise.all(promises);
        
        this.authModule.updateAuthUI();

        preventDoubleTapZoom();

        if (this.isMobile) {
            setupSwipeGestures(() => {
                closeAllModals();
                this.closeCartModal();
                this.adminModule.closeAdminPanel();
                this.profileModule.closeProfileModal();
                this.authModule.closeAuthModal();
            });
        }
    }

    setupEventListeners() {
        // Кнопки модальных окон
        const authBtn = document.getElementById('auth-btn');
        const profileBtn = document.getElementById('profile-btn');
        const cartBtn = document.getElementById('cart-btn');
        const adminBtn = document.getElementById('admin-btn');

        if (authBtn) {
            authBtn.addEventListener('click', () => this.authModule.openAuthModal());
        }

        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.profileModule.openProfileModal());
        }

        if (cartBtn) {
            cartBtn.addEventListener('click', () => this.openCartModal());
        }

        if (adminBtn) {
            adminBtn.addEventListener('click', () => this.adminModule.openAdminPanel());
        }

        // Закрытие модальных окон по клику вне области
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeAllModals();
                this.closeCartModal();
            }
        });
    }

    // Методы для совместимости со старым кодом
    loadProducts(page = 1, useCache = true) {
        return this.productsModule.loadProducts(page, useCache);
    }

    renderProducts() {
        return this.productsModule.renderProducts();
    }

    addToCart(id) {
        return this.cartModule.addToCart(id);
    }

    openCartModal() {
        const modal = document.getElementById('cart-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.cartModule.renderCart();
        }
    }

    closeCartModal() {
        const modal = document.getElementById('cart-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    openAuthModal() {
        return this.authModule.openAuthModal();
    }

    closeAuthModal() {
        return this.authModule.closeAuthModal();
    }

    openProfileModal() {
        return this.profileModule.openProfileModal();
    }

    closeProfileModal() {
        return this.profileModule.closeProfileModal();
    }

    openAdminPanel() {
        return this.adminModule.openAdminPanel();
    }

    closeAdminPanel() {
        return this.adminModule.closeAdminPanel();
    }

    updateAuthUI() {
        return this.authModule.updateAuthUI();
    }

    updateCartInfo() {
        return this.cartModule.updateCartInfo();
    }

    renderCart() {
        return this.cartModule.renderCart();
    }

    async checkout() {
        return this.cartModule.checkout();
    }

    async login(usernameOrEmail, password) {
        return this.authModule.login(usernameOrEmail, password);
    }

    logout() {
        return this.authModule.logout();
    }

    // Делегируем сложные функции регистрации (для совместимости со старым кодом)
    // Эти функции будут вызываться из глобальных функций в index.html
    async nextRegisterStep() {
        // Реализация будет добавлена при необходимости
        console.log('nextRegisterStep called');
    }

    async prevRegisterStep() {
        // Реализация будет добавлена при необходимости
        console.log('prevRegisterStep called');
    }

    async confirmEmailCode() {
        // Реализация будет добавлена при необходимости
        console.log('confirmEmailCode called');
    }

    async resendVerificationCode() {
        // Реализация будет добавлена при необходимости
        console.log('resendVerificationCode called');
    }

    async skipFullName() {
        // Реализация будет добавлена при необходимости
        console.log('skipFullName called');
    }

    async completeRegistrationWithPassword() {
        // Реализация будет добавлена при необходимости
        console.log('completeRegistrationWithPassword called');
    }
}

// Экспортируем для использования в других модулях
export { NeonShop };
export default NeonShop;

