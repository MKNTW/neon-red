// shop.ts - Основной класс приложения (полная версия)
import { getApiBaseUrl, checkIsMobile, setupSwipeGestures, preventDoubleTapZoom, closeAllModals, showToast } from './utils';
import { ProductsModule } from './products';
import { CartModule } from './cart';
import { AuthModule } from './auth';
import { ProfileModule } from './profile';
import { AdminModule } from './admin';
import type { User, Product, CartItem } from './types';

export class NeonShop {
    public cart: CartItem[] = [];
    public products: Product[] = [];
    public user: User | null = null;
    public token: string | null = null;
    public currentPage: number = 1;
    public totalPages: number = 1;
    public totalProducts: number = 0;
    public productsPerPage: number = 20;
    public API_BASE_URL: string;
    public isMobile: boolean;
    
    public productsModule: ProductsModule;
    public cartModule: CartModule;
    public authModule: AuthModule;
    public profileModule: ProfileModule;
    public adminModule: AdminModule;

    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart') || '[]');
        this.products = [];
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.token = localStorage.getItem('token') || null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalProducts = 0;
        this.productsPerPage = 20;
        
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

    async init(): Promise<void> {
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

    setupEventListeners(): void {
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

        document.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).classList.contains('modal')) {
                closeAllModals();
                this.closeCartModal();
            }
        });
    }

    // Методы для совместимости со старым кодом
    loadProducts(page: number = 1, useCache: boolean = true): Promise<void> {
        return this.productsModule.loadProducts(page, useCache);
    }

    renderProducts(): void {
        this.productsModule.renderProducts();
    }

    addToCart(id: string): void {
        this.cartModule.addToCart(id);
    }

    openCartModal(): void {
        const modal = document.getElementById('cart-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.cartModule.renderCart();
        }
    }

    closeCartModal(): void {
        const modal = document.getElementById('cart-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    openAuthModal(): void {
        this.authModule.openAuthModal();
    }

    closeAuthModal(): void {
        this.authModule.closeAuthModal();
    }

    openProfileModal(): void {
        this.profileModule.openProfileModal();
    }

    closeProfileModal(): void {
        this.profileModule.closeProfileModal();
    }

    openAdminPanel(): Promise<void> {
        return this.adminModule.openAdminPanel();
    }

    closeAdminPanel(): void {
        this.adminModule.closeAdminPanel();
    }

    updateAuthUI(): void {
        this.authModule.updateAuthUI();
    }

    updateCartInfo(): void {
        this.cartModule.updateCartInfo();
    }

    renderCart(): void {
        this.cartModule.renderCart();
    }

    async checkout(): Promise<void> {
        return this.cartModule.checkout();
    }

    async login(usernameOrEmail: string, password: string): Promise<boolean> {
        return this.authModule.login(usernameOrEmail, password);
    }

    logout(): void {
        this.authModule.logout();
    }

    // Делегируем функции регистрации
    async nextRegisterStep(): Promise<void> {
        return this.authModule.nextRegisterStep();
    }

    async prevRegisterStep(): void {
        this.authModule.prevRegisterStep();
    }

    async confirmEmailCode(): Promise<boolean> {
        return this.authModule.confirmEmailCode();
    }

    async resendVerificationCode(): Promise<boolean> {
        return this.authModule.resendVerificationCode();
    }

    async skipFullName(): Promise<void> {
        this.authModule.skipFullName();
    }

    async completeRegistrationWithPassword(): Promise<boolean> {
        return this.authModule.completeRegistrationWithPassword();
    }

    // Делегируем функции восстановления пароля
    openForgotPasswordModal(): void {
        this.authModule.openForgotPasswordModal();
    }

    closeForgotPasswordModal(): void {
        this.authModule.closeForgotPasswordModal();
    }

    async sendPasswordResetCode(): Promise<boolean> {
        return this.authModule.sendPasswordResetCode();
    }

    async confirmPasswordReset(): Promise<boolean> {
        return this.authModule.confirmPasswordReset();
    }

    async resendResetCode(): Promise<boolean> {
        return this.authModule.resendResetCode();
    }

    backToForgotPassword(): void {
        this.authModule.backToForgotPassword();
    }

    // Делегируем функции профиля
    async changeEmail(): Promise<boolean> {
        return this.profileModule.changeEmail();
    }

    async confirmEmailChange(): Promise<boolean> {
        return this.profileModule.confirmEmailChange();
    }

    async resendEmailChangeCode(): Promise<boolean> {
        return this.profileModule.resendEmailChangeCode();
    }

    cancelEmailChange(): void {
        this.profileModule.cancelEmailChange();
    }

    async changePassword(): Promise<void> {
        return this.profileModule.changePassword();
    }

    async deleteAccount(): Promise<void> {
        return this.profileModule.deleteAccount();
    }

    async updateProfile(field: string, value: string): Promise<void> {
        return this.profileModule.updateProfile(field, value);
    }

    // Делегируем функции админ-панели
    async loadAdminProducts(): Promise<void> {
        return this.adminModule.loadAdminProducts();
    }

    async loadAdminUsers(): Promise<void> {
        return this.adminModule.loadAdminUsers();
    }

    async loadAdminOrders(): Promise<void> {
        return this.adminModule.loadAdminOrders();
    }

    async editProduct(id: string): Promise<void> {
        return this.adminModule.editProduct(id);
    }

    async deleteProduct(id: string): Promise<void> {
        return this.adminModule.deleteProduct(id);
    }

    async addNewProduct(): Promise<void> {
        return this.adminModule.addNewProduct();
    }

    async saveNewProduct(): Promise<void> {
        return this.adminModule.saveNewProduct();
    }

    async saveProduct(): Promise<void> {
        return this.adminModule.saveProduct();
    }

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        return this.adminModule.updateOrderStatus(orderId, status);
    }

    async viewUserOrders(userId: string): Promise<void> {
        return this.adminModule.viewUserOrders(userId);
    }

    async viewOrderDetails(orderId: string): Promise<void> {
        return this.adminModule.viewOrderDetails(orderId);
    }

    closeEditProductModal(): void {
        this.adminModule.closeEditProductModal();
    }

    closeAddProductModal(): void {
        this.adminModule.closeAddProductModal();
    }

    // Проксирование общих утилит
    showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000): void {
        showToast(message, type, duration);
    }

    closeAllModals(): void {
        closeAllModals();
    }
}

