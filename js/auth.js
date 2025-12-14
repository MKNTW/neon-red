// auth.js - Модуль для аутентификации
import { escapeHtml, safeFetch, showLoadingIndicator, hideLoadingIndicator, showToast } from './utils.js';
import { validateEmail, validateLoginForm, isEmail } from './validators.js';

export class AuthModule {
    constructor(shop) {
        this.shop = shop;
        this.currentRegisterStep = 1;
        this.registerData = {
            username: '',
            email: '',
            fullName: '',
            password: ''
        };
        this.pendingVerificationEmail = null;
        this.resendCodeTimer = null;
        this.pendingEmailChange = null;
        this.resendEmailChangeTimer = null;
        this.pendingRegistrationToken = null;
        this.pendingRegistrationUser = null;
        this.isConfirmingCode = false;
        this.pendingResetEmail = null;
        this.pendingResetUserId = null;
        this.resendResetTimer = null;
    }

    openAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                const input = document.getElementById('login-username') || 
                             document.getElementById('register-username');
                if (input) input.focus();
            }, 300);
        }
    }

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    async login(usernameOrEmail, password) {
        // Валидация формы входа
        const validation = validateLoginForm({ usernameOrEmail, password });
        if (!validation.valid) {
            const firstError = Object.values(validation.errors)[0];
            showToast(firstError, 'error');
            return false;
        }

        try {
            const emailFormat = isEmail(usernameOrEmail);
            
            const response = await safeFetch(`${this.shop.API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: usernameOrEmail,
                    email: emailFormat ? usernameOrEmail : undefined,
                    password 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка входа';
                showToast(errorMsg, 'error');
                return false;
            }

            this.shop.user = data.user;
            this.shop.token = data.token;

            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', this.shop.token);

            this.updateAuthUI();
            showToast('Вход выполнен успешно!', 'success');
            this.closeAuthModal();
            
            await this.shop.productsModule.loadProducts();

            return true;

        } catch (error) {
            let errorMessage = error.message || 'Ошибка входа';
            if (error.data) {
                errorMessage = error.data.error || error.data.message || errorMessage;
            }
            showToast(errorMessage, 'error');
            return false;
        }
    }

    logout() {
        this.shop.user = null;
        this.shop.token = null;

        localStorage.removeItem('user');
        localStorage.removeItem('token');

        this.updateAuthUI();
        showToast('Вы вышли из системы', 'info');
        if (this.shop.profileModule) {
            this.shop.profileModule.closeProfileModal();
        }
    }

    async validateToken() {
        if (!this.shop.token) return false;

        try {
            const response = await safeFetch(`${this.shop.API_BASE_URL}/validate-token`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });

            const data = await response.json();
            this.shop.user = data.user;
            
            return true;

        } catch (error) {
            console.error('Token validation error:', error);
            this.logout();
            return false;
        }
    }

    updateAuthUI() {
        const authBtn = document.getElementById('auth-btn');
        const profileBtn = document.getElementById('profile-btn');
        const adminBtn = document.getElementById('admin-btn');
        const cartBtn = document.getElementById('cart-btn');

        if (this.shop.user) {
            if (authBtn) authBtn.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'flex';
            if (adminBtn) adminBtn.style.display = this.shop.user.isAdmin ? 'flex' : 'none';
            if (cartBtn) cartBtn.style.display = 'flex';
            
            if (!this.shop.products || this.shop.products.length === 0) {
                this.shop.productsModule.loadProducts();
            }
        } else {
            if (authBtn) authBtn.style.display = 'flex';
            if (profileBtn) profileBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            if (cartBtn) cartBtn.style.display = 'none';
        }
        
        this.shop.productsModule.renderProducts();
    }

    setupAgeVerification() {
        const ageVerified = localStorage.getItem('ageVerified');
        if (ageVerified === 'true') {
            const modal = document.getElementById('age-verification-modal');
            if (modal) modal.style.display = 'none';
            return;
        }
        
        const yesBtn = document.getElementById('age-yes');
        const noBtn = document.getElementById('age-no');
        
        if (yesBtn) {
            yesBtn.addEventListener('click', () => {
                localStorage.setItem('ageVerified', 'true');
                const modal = document.getElementById('age-verification-modal');
                if (modal) modal.style.display = 'none';
            });
        }
        
        if (noBtn) {
            noBtn.addEventListener('click', () => {
                alert('Доступ к сайту ограничен для лиц младше 18 лет.');
                window.location.href = 'https://www.google.com';
            });
        }
    }

    // Регистрация - упрощенная версия
    setupRegisterSteps() {
        this.currentRegisterStep = 1;
        this.registerData = {
            username: '',
            email: '',
            fullName: '',
            password: ''
        };
        this.isConfirmingCode = false;
        this.pendingVerificationEmail = null;
        this.pendingRegistrationToken = null;
        this.pendingRegistrationUser = null;
    }

    async checkUsername(username) {
        if (!username || username.trim().length < 3) {
            return { available: false, error: 'Имя пользователя должно быть не менее 3 символов' };
        }
        
        try {
            const response = await safeFetch(`${this.shop.API_BASE_URL}/check-username/${encodeURIComponent(username.trim())}`, {
                showLoading: false
            });
            return await response.json();
        } catch (error) {
            return { available: false, error: 'Ошибка проверки имени пользователя' };
        }
    }

    showFieldError(errorId, message) {
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }
    
    hideFieldError(errorId) {
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    // Делегируем сложные функции регистрации в основной класс для совместимости
    // Полная реализация будет в shop.js
}

