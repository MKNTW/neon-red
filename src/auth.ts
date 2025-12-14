// auth.ts - Модуль для аутентификации (полная версия)
import { safeFetch, showLoadingIndicator, hideLoadingIndicator, showToast } from './utils';
import { validateEmail, validateLoginForm, isEmail, validateUsername, validatePassword, validatePasswordMatch, validateVerificationCode } from './validators';
import type { User, ApiResponse } from './types';
import type { ShopInstance } from './products';

interface RegisterData {
    username: string;
    email: string;
    fullName: string;
    password: string;
}

interface Account {
    id: string;
    username: string;
    email: string;
}

export class AuthModule {
    private shop: ShopInstance & { productsModule: any };
    public currentRegisterStep: number = 1;
    public registerData: RegisterData = {
        username: '',
        email: '',
        fullName: '',
        password: ''
    };
    public pendingVerificationEmail: string | null = null;
    public resendCodeTimer: NodeJS.Timeout | null = null;
    public pendingEmailChange: string | null = null;
    public resendEmailChangeTimer: NodeJS.Timeout | null = null;
    public pendingRegistrationToken: string | null = null;
    public pendingRegistrationUser: User | null = null;
    public isConfirmingCode: boolean = false;
    public pendingResetEmail: string | null = null;
    public pendingResetUserId: string | null = null;
    public resendResetTimer: NodeJS.Timeout | null = null;

    constructor(shop: ShopInstance & { productsModule: any }) {
        this.shop = shop;
    }

    openAuthModal(): void {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                const input = document.getElementById('login-username') || 
                             document.getElementById('register-username');
                if (input) (input as HTMLInputElement).focus();
            }, 300);
        }
    }

    closeAuthModal(): void {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    async login(usernameOrEmail: string, password: string): Promise<boolean> {
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

            const data: ApiResponse<{ user: User; token: string }> = await response.json();

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

        } catch (error: any) {
            let errorMessage = error.message || 'Ошибка входа';
            if (error.data) {
                errorMessage = error.data.error || error.data.message || errorMessage;
            }
            showToast(errorMessage, 'error');
            return false;
        }
    }

    logout(): void {
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

    async validateToken(): Promise<boolean> {
        if (!this.shop.token) return false;

        try {
            const response = await safeFetch(`${this.shop.API_BASE_URL}/validate-token`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });

            const data: ApiResponse<{ user: User }> = await response.json();
            this.shop.user = data.user;
            
            return true;

        } catch (error) {
            console.error('Token validation error:', error);
            this.logout();
            return false;
        }
    }

    updateAuthUI(): void {
        const authBtn = document.getElementById('auth-btn');
        const profileBtn = document.getElementById('profile-btn');
        const adminBtn = document.getElementById('admin-btn');
        const cartBtn = document.getElementById('cart-btn');

        if (this.shop.user) {
            if (authBtn) authBtn.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'flex';
            if (adminBtn) adminBtn.style.display = (this.shop.user as User).isAdmin ? 'flex' : 'none';
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

    setupAgeVerification(): void {
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

    setupRegisterSteps(): void {
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

    async checkUsername(username: string): Promise<{ available: boolean; error?: string }> {
        const validation = validateUsername(username);
        if (!validation.valid) {
            return { available: false, error: validation.error };
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

    showFieldError(errorId: string, message: string): void {
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }
    
    hideFieldError(errorId: string): void {
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
    }

    async nextRegisterStep(): Promise<void> {
        const currentStep = this.currentRegisterStep || 1;
        
        if (currentStep === 1) {
            const usernameInput = document.getElementById('register-username') as HTMLInputElement;
            const username = usernameInput?.value.trim();
            if (!username) {
                this.showFieldError('username-error', 'Введите имя пользователя');
                return;
            }
            
            const usernameResult = validateUsername(username);
            if (!usernameResult.valid) {
                this.showFieldError('username-error', usernameResult.error || 'Ошибка валидации');
                return;
            }
            
            showLoadingIndicator();
            const checkResult = await this.checkUsername(username);
            hideLoadingIndicator();
            
            if (!checkResult.available) {
                this.showFieldError('username-error', checkResult.error || 'Это имя пользователя уже занято');
                return;
            }
            
            this.registerData.username = username;
            this.hideFieldError('username-error');
        } else if (currentStep === 2) {
            const emailInput = document.getElementById('register-email') as HTMLInputElement;
            const email = emailInput?.value.trim();
            if (!email) {
                this.showFieldError('email-error', 'Введите email');
                return;
            }
            
            if (!validateEmail(email)) {
                this.showFieldError('email-error', 'Неверный формат email');
                return;
            }
            
            this.registerData.email = email;
            this.hideFieldError('email-error');
            
            await this.registerUserWithoutPassword();
            return;
        } else if (currentStep === 4) {
            const fullNameInput = document.getElementById('register-fullname') as HTMLInputElement;
            const fullName = fullNameInput?.value.trim();
            this.registerData.fullName = fullName || '';
        } else if (currentStep === 5) {
            const passwordInput = document.getElementById('register-password') as HTMLInputElement;
            const password2Input = document.getElementById('register-password2') as HTMLInputElement;
            const password = passwordInput?.value;
            const password2 = password2Input?.value;
            
            if (!password) {
                this.showFieldError('password-error', 'Введите пароль');
                return;
            }
            
            const passwordResult = validatePassword(password);
            if (!passwordResult.valid) {
                this.showFieldError('password-error', passwordResult.error || 'Ошибка валидации');
                return;
            }
            
            const matchResult = validatePasswordMatch(password, password2 || '');
            if (!matchResult.valid) {
                this.showFieldError('password-error', matchResult.error || 'Пароли не совпадают');
                return;
            }
            
            this.registerData.password = password;
            this.hideFieldError('password-error');
            return;
        }
        
        if (currentStep < 5) {
            this.currentRegisterStep = currentStep + 1;
            this.updateRegisterStepDisplay();
        }
    }
    
    prevRegisterStep(): void {
        if (this.currentRegisterStep > 1) {
            this.currentRegisterStep--;
            this.updateRegisterStepDisplay();
        }
    }
    
    skipFullName(): void {
        this.registerData.fullName = '';
        this.currentRegisterStep = 5;
        this.updateRegisterStepDisplay();
    }

    async completeRegistrationWithPassword(): Promise<boolean> {
        const passwordInput = document.getElementById('register-password') as HTMLInputElement;
        const password2Input = document.getElementById('register-password2') as HTMLInputElement;
        const passwordError = document.getElementById('password-error');
        const fullNameInput = document.getElementById('register-fullname') as HTMLInputElement;
        const fullName = fullNameInput?.value.trim() || '';
        
        const password = passwordInput?.value;
        const password2 = password2Input?.value;
        
        if (!password) {
            if (passwordError) {
                passwordError.textContent = 'Введите пароль';
                passwordError.style.display = 'block';
            }
            showToast('Введите пароль', 'error');
            return false;
        }
        
        const passwordResult = validatePassword(password);
        if (!passwordResult.valid) {
            if (passwordError) {
                passwordError.textContent = passwordResult.error || 'Ошибка валидации';
                passwordError.style.display = 'block';
            }
            showToast(passwordResult.error || 'Ошибка валидации', 'error');
            return false;
        }
        
        const matchResult = validatePasswordMatch(password, password2 || '');
        if (!matchResult.valid) {
            if (passwordError) {
                passwordError.textContent = matchResult.error || 'Пароли не совпадают';
                passwordError.style.display = 'block';
            }
            showToast(matchResult.error || 'Пароли не совпадают', 'error');
            return false;
        }

        if (passwordError) {
            passwordError.textContent = '';
            passwordError.style.display = 'none';
        }

        if (!this.pendingRegistrationToken || !this.pendingRegistrationUser) {
            showToast('Ошибка: данные регистрации не найдены. Начните регистрацию заново', 'error');
            this.setupRegisterSteps();
            this.updateRegisterStepDisplay();
            return false;
        }

        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.pendingRegistrationToken}`
                },
                body: JSON.stringify({ 
                    password: password,
                    fullName: fullName || null
                })
            });

            const data: ApiResponse<{ user: User }> = await response.json();
            hideLoadingIndicator();

            if (data.user) {
                this.shop.user = data.user;
                this.shop.token = this.pendingRegistrationToken;
                localStorage.setItem('user', JSON.stringify(data.user));
                localStorage.setItem('token', this.shop.token);
                this.updateAuthUI();
                showToast('Регистрация завершена! Вы автоматически вошли в аккаунт', 'success');
                this.closeAuthModal();
                await this.shop.productsModule.loadProducts();
                
                this.setupRegisterSteps();
                this.updateRegisterStepDisplay();
                this.pendingRegistrationToken = null;
                this.pendingRegistrationUser = null;
                this.registerData = {
                    username: '',
                    email: '',
                    fullName: '',
                    password: ''
                };
                return true;
            } else {
                showToast((data as any).error || 'Ошибка завершения регистрации', 'error');
                return false;
            }
        } catch (error: any) {
            hideLoadingIndicator();
            let errorMessage = error.message || 'Ошибка завершения регистрации';
            
            if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('токен')) {
                errorMessage = 'Сессия истекла. Пользователь может быть уже зарегистрирован. Попробуйте войти.';
                this.setupRegisterSteps();
                this.updateRegisterStepDisplay();
                (window as any).showLoginForm();
            }
            
            showToast(errorMessage, 'error');
            return false;
        }
    }
    
    updateRegisterStepDisplay(): void {
        const steps = document.querySelectorAll('.register-step');
        const currentStep = this.currentRegisterStep || 1;
        
        steps.forEach((step, index) => {
            const stepNum = index + 1;
            if (stepNum === currentStep) {
                step.classList.add('active');
                (step as HTMLElement).style.display = 'flex';
            } else {
                step.classList.remove('active');
                (step as HTMLElement).style.display = 'none';
            }
        });
        
        this.updateStepIndicator();
    }
    
    updateStepIndicator(): void {
        const currentStep = this.currentRegisterStep || 1;
        const indicators = document.querySelectorAll('.step-indicator');
        
        indicators.forEach((indicator) => {
            indicator.setAttribute('data-current-step', currentStep.toString());
            
            const numbers = indicator.querySelectorAll('.step-number');
            const lines = indicator.querySelectorAll('.step-line');
            
            numbers.forEach((num, i) => {
                const stepNum = i + 1;
                num.classList.remove('active', 'completed');
                
                if (stepNum < currentStep) {
                    num.textContent = '✓';
                    num.classList.add('completed');
                } else if (stepNum === currentStep) {
                    num.textContent = stepNum.toString();
                    num.classList.add('active');
                } else {
                    num.textContent = stepNum.toString();
                }
            });
            
            lines.forEach((line, i) => {
                const stepNum = i + 1;
                line.classList.remove('completed');
                if (stepNum < currentStep) {
                    line.classList.add('completed');
                }
            });
        });
    }

    async registerUserWithoutPassword(): Promise<boolean> {
        try {
            const username = this.registerData.username;
            const email = this.registerData.email;
            
            if (!username || !email) {
                showToast('Заполните все поля', 'error');
                return false;
            }

            showLoadingIndicator();
            let response: Response;
            let data: any;
            
            try {
                response = await safeFetch(`${this.shop.API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password: 'temp_password_will_be_changed', fullName: null })
                });

                data = await response.json();
            } catch (fetchError: any) {
                hideLoadingIndicator();
                if (fetchError.message?.includes('400') || fetchError.message?.includes('уже существует')) {
                    this.showFieldError('username-error', 'Пользователь с таким именем уже существует');
                    showToast('Пользователь с таким именем уже существует. Попробуйте войти или используйте другое имя', 'error');
                    this.currentRegisterStep = 1;
                    this.updateRegisterStepDisplay();
                    return false;
                }
                throw fetchError;
            }
            
            hideLoadingIndicator();

            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка регистрации';
                
                if (response.status === 400 || response.status === 409) {
                    if (errorMsg.includes('уже существует') || errorMsg.includes('занято') || errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
                        this.showFieldError('username-error', errorMsg);
                        showToast(errorMsg + '. Попробуйте войти или используйте другое имя', 'error');
                        this.currentRegisterStep = 1;
                        this.updateRegisterStepDisplay();
                        return false;
                    }
                }
                
                showToast(errorMsg, 'error');
                return false;
            }

            if (data.needsCodeConfirmation) {
                this.pendingVerificationEmail = data.email;
                this.pendingRegistrationToken = data.token;
                this.pendingRegistrationUser = data.user;
                this.currentRegisterStep = 3;
                this.updateRegisterStepDisplay();
                const emailEl = document.getElementById('verification-email');
                if (emailEl) {
                    emailEl.textContent = data.email;
                }
                this.startResendCodeTimer();
                showToast('Код подтверждения отправлен на почту', 'success');
                return true;
            }

            showToast((data as any).error || 'Ошибка регистрации', 'error');
            return false;

        } catch (error: any) {
            hideLoadingIndicator();
            
            let errorMessage = error.message || 'Ошибка регистрации';
            const errorStatus = error.status;
            const errorData = error.data;
            
            if (errorStatus === 400 || errorStatus === 409 || 
                errorMessage.includes('уже существует') || 
                errorMessage.includes('занято') || 
                errorMessage.includes('duplicate') || 
                errorMessage.includes('unique') ||
                (errorData && (errorData.error?.includes('уже существует') || errorData.error?.includes('занято')))) {
                
                const finalErrorMsg = errorData?.error || errorData?.message || errorMessage || 'Пользователь с таким именем уже существует';
                this.showFieldError('username-error', finalErrorMsg);
                showToast(finalErrorMsg + '. Попробуйте войти или используйте другое имя', 'error');
                this.currentRegisterStep = 1;
                this.updateRegisterStepDisplay();
                return false;
            }
            
            if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('сети')) {
                showToast('Ошибка сети. Если регистрация не завершилась, попробуйте войти с вашими данными', 'error');
            } else {
                showToast(errorMessage, 'error');
            }
            return false;
        }
    }

    async confirmEmailCode(): Promise<boolean> {
        if (this.isConfirmingCode) {
            return false;
        }
        
        const codeInput = document.getElementById('register-code') as HTMLInputElement;
        const codeError = document.getElementById('code-error');
        
        if (!codeInput) {
            showToast('Ошибка: поле ввода кода не найдено', 'error');
            return false;
        }
        
        if (!this.pendingVerificationEmail) {
            showToast('Ошибка: email не найден. Начните регистрацию заново', 'error');
            this.currentRegisterStep = 2;
            this.updateRegisterStepDisplay();
            return false;
        }

        const code = codeInput.value.trim();
        
        const codeResult = validateVerificationCode(code);
        if (!codeResult.valid) {
            if (codeError) {
                codeError.textContent = codeResult.error || 'Введите 6-значный код';
                codeError.style.display = 'block';
            }
            showToast(codeResult.error || 'Введите 6-значный код', 'error');
            return false;
        }

        if (codeError) {
            codeError.textContent = '';
            codeError.style.display = 'none';
        }

        this.isConfirmingCode = true;
        
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/confirm-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.pendingVerificationEmail,
                    code: code
                })
            });

            const data: ApiResponse<{ token?: string; user?: User }> = await response.json();
            hideLoadingIndicator();

            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка подтверждения';
                showToast(errorMsg, 'error');
                if (codeError) {
                    codeError.textContent = errorMsg;
                    codeError.style.display = 'block';
                }
                this.isConfirmingCode = false;
                return false;
            }

            if ((data as any).success) {
                if ((data as any).token && (data as any).user) {
                    this.pendingRegistrationToken = (data as any).token;
                    this.pendingRegistrationUser = (data as any).user;
                    
                    this.currentRegisterStep = 4;
                    this.updateRegisterStepDisplay();
                    
                    showToast('Email подтверждён! Завершите регистрацию', 'success');
                    
                    if (codeInput) {
                        codeInput.value = '';
                    }
                } else {
                    showToast('Email успешно подтверждён! Теперь можно войти', 'success');
                    (window as any).showLoginForm();
                }
                
                if (this.resendCodeTimer) {
                    clearInterval(this.resendCodeTimer);
                    this.resendCodeTimer = null;
                }
                
                this.pendingVerificationEmail = null;
                this.isConfirmingCode = false;
                
                return true;
            } else {
                const errorMsg = (data as any).error || (data as any).message || 'Ошибка подтверждения';
                showToast(errorMsg, 'error');
                if (codeError) {
                    codeError.textContent = errorMsg;
                    codeError.style.display = 'block';
                }
                
                this.isConfirmingCode = false;
                
                return false;
            }

        } catch (error: any) {
            hideLoadingIndicator();
            
            let errorMessage = error.message || 'Ошибка подтверждения';
            
            if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('сети')) {
                errorMessage = 'Ошибка сети. Проверьте подключение и попробуйте снова';
            }
            
            if (error.data) {
                errorMessage = error.data.error || error.data.message || errorMessage;
            }
            
            showToast(errorMessage, 'error');
            if (codeError) {
                codeError.textContent = errorMessage;
                codeError.style.display = 'block';
            }
            
            this.isConfirmingCode = false;
            
            return false;
        }
    }

    async resendVerificationCode(): Promise<boolean> {
        if (!this.pendingVerificationEmail) {
            showToast('Ошибка: email не найден. Начните регистрацию заново', 'error');
            this.currentRegisterStep = 2;
            this.updateRegisterStepDisplay();
            return false;
        }

        const resendBtn = document.getElementById('resend-code-btn') as HTMLButtonElement;
        if (resendBtn && resendBtn.disabled) {
            return false;
        }

        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/resend-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.pendingVerificationEmail
                })
            });

            const data: ApiResponse = await response.json();
            hideLoadingIndicator();
            
            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка отправки кода';
                showToast(errorMsg, 'error');
                return false;
            }

            if ((data as any).success) {
                showToast('Новый код отправлен на почту', 'success');
                this.startResendCodeTimer();
                return true;
            } else {
                const errorMsg = (data as any).error || (data as any).message || 'Ошибка отправки кода';
                showToast(errorMsg, 'error');
                return false;
            }

        } catch (error: any) {
            hideLoadingIndicator();
            
            let errorMessage = error.message || 'Ошибка отправки кода';
            
            if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('сети')) {
                errorMessage = 'Ошибка сети. Проверьте подключение и попробуйте снова';
            }
            
            if (error.data) {
                errorMessage = error.data.error || error.data.message || errorMessage;
            }
            
            showToast(errorMessage, 'error');
            return false;
        }
    }

    startResendCodeTimer(): void {
        const resendBtn = document.getElementById('resend-code-btn') as HTMLButtonElement;
        if (!resendBtn) return;

        let timer = 60;
        resendBtn.disabled = true;
        resendBtn.textContent = `Отправить код заново (${timer})`;

        if (this.resendCodeTimer) {
            clearInterval(this.resendCodeTimer);
        }

        this.resendCodeTimer = setInterval(() => {
            timer--;
            resendBtn.textContent = `Отправить код заново (${timer})`;

            if (timer <= 0) {
                if (this.resendCodeTimer) {
                    clearInterval(this.resendCodeTimer);
                    this.resendCodeTimer = null;
                }
                resendBtn.textContent = 'Отправить код заново';
                resendBtn.disabled = false;
            }
        }, 1000);
    }

    // === ВОССТАНОВЛЕНИЕ ПАРОЛЯ ===
    openForgotPasswordModal(): void {
        const modal = document.getElementById('forgot-password-modal');
        if (!modal) return;
        
        this.closeAuthModal();
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        this.resetForgotPasswordForms();
    }
    
    closeForgotPasswordModal(): void {
        const modal = document.getElementById('forgot-password-modal');
        if (!modal) return;
        
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        this.resetForgotPasswordData();
    }
    
    resetForgotPasswordForms(): void {
        const forgotForm = document.getElementById('forgot-password-form');
        const selectForm = document.getElementById('select-account-form');
        const resetForm = document.getElementById('reset-password-form');
        
        if (forgotForm) forgotForm.style.display = 'block';
        if (selectForm) selectForm.style.display = 'none';
        if (resetForm) resetForm.style.display = 'none';
        
        const title = document.getElementById('forgot-password-title');
        const subtitle = document.getElementById('forgot-password-subtitle');
        if (title) title.textContent = 'Восстановление пароля';
        if (subtitle) subtitle.textContent = 'Введите email для восстановления';
        
        this.resetForgotPasswordData();
    }
    
    resetForgotPasswordData(): void {
        const emailInput = document.getElementById('forgot-email') as HTMLInputElement;
        const codeInput = document.getElementById('reset-code') as HTMLInputElement;
        const passwordInput = document.getElementById('reset-password') as HTMLInputElement;
        const password2Input = document.getElementById('reset-password2') as HTMLInputElement;
        
        if (emailInput) emailInput.value = '';
        if (codeInput) codeInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (password2Input) password2Input.value = '';
        
        const errorEls = ['forgot-email-error', 'reset-code-error', 'reset-password-error'];
        errorEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = '';
                el.style.display = 'none';
            }
        });
        
        this.pendingResetEmail = null;
        this.pendingResetUserId = null;
        
        if (this.resendResetTimer) {
            clearInterval(this.resendResetTimer);
            this.resendResetTimer = null;
        }
        
        const resendBtn = document.getElementById('resend-reset-code-btn') as HTMLButtonElement;
        if (resendBtn) {
            resendBtn.textContent = 'Отправить код заново';
            resendBtn.disabled = false;
        }
    }
    
    showForgotPassword(): void {
        this.openForgotPasswordModal();
    }
    
    async sendPasswordResetCode(): Promise<boolean> {
        const emailInput = document.getElementById('forgot-email') as HTMLInputElement;
        const errorEl = document.getElementById('forgot-email-error');
        
        if (!emailInput) {
            showToast('Ошибка: поле ввода email не найдено', 'error');
            return false;
        }
        
        const email = emailInput.value.trim();
        
        if (!email) {
            if (errorEl) {
                errorEl.textContent = 'Введите email';
                errorEl.style.display = 'block';
            }
            showToast('Введите email', 'error');
            return false;
        }
        
        if (!validateEmail(email)) {
            if (errorEl) {
                errorEl.textContent = 'Неверный формат email';
                errorEl.style.display = 'block';
            }
            showToast('Неверный формат email', 'error');
            return false;
        }
        
        if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
        }
        
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase() })
            });
            
            const data: ApiResponse<{ accounts?: Account[]; userId?: string }> = await response.json();
            hideLoadingIndicator();
            
            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка отправки кода';
                showToast(errorMsg, 'error');
                if (errorEl) {
                    errorEl.textContent = errorMsg;
                    errorEl.style.display = 'block';
                }
                return false;
            }
            
            if (data.accounts && data.accounts.length > 1) {
                this.pendingResetEmail = email.toLowerCase();
                this.showAccountSelection(data.accounts);
                return true;
            }
            
            if ((data as any).success || data.accounts?.length === 1) {
                this.pendingResetEmail = email.toLowerCase();
                this.pendingResetUserId = data.accounts?.[0]?.id || (data as any).userId;
                this.showResetPasswordForm();
                return true;
            }
            
            if ((data as any).success && (data as any).userId) {
                this.pendingResetEmail = email.toLowerCase();
                this.pendingResetUserId = (data as any).userId;
                this.showResetPasswordForm();
                return true;
            }
            
            showToast('Ошибка: неожиданный ответ сервера', 'error');
            return false;
        } catch (error: any) {
            hideLoadingIndicator();
            let errorMessage = error.message || 'Ошибка отправки кода';
            if (error.data) {
                errorMessage = error.data.error || error.data.message || errorMessage;
            }
            showToast(errorMessage, 'error');
            return false;
        }
    }
    
    showAccountSelection(accounts: Account[]): void {
        const forgotForm = document.getElementById('forgot-password-form');
        const selectForm = document.getElementById('select-account-form');
        const resetForm = document.getElementById('reset-password-form');
        const title = document.getElementById('forgot-password-title');
        const subtitle = document.getElementById('forgot-password-subtitle');
        
        if (forgotForm) forgotForm.style.display = 'none';
        if (selectForm) selectForm.style.display = 'block';
        if (resetForm) resetForm.style.display = 'none';
        if (title) title.textContent = 'Выберите аккаунт';
        if (subtitle) subtitle.textContent = 'Найдено несколько аккаунтов';
        
        const accountsList = document.getElementById('accounts-list');
        if (!accountsList) return;
        
        accountsList.innerHTML = '';
        accounts.forEach((account) => {
            const accountDiv = document.createElement('div');
            accountDiv.className = 'account-item';
            accountDiv.style.cssText = 'padding: 15px; margin-bottom: 10px; background: rgba(255,255,255,0.05); border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; transition: all 0.3s;';
            accountDiv.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 5px;">${account.username}</div>
                <div style="font-size: 0.9rem; color: var(--text-secondary);">${account.email}</div>
            `;
            accountDiv.addEventListener('click', () => {
                this.pendingResetUserId = account.id;
                this.showResetPasswordForm();
            });
            accountDiv.addEventListener('mouseenter', () => {
                accountDiv.style.borderColor = 'var(--neon-red)';
                accountDiv.style.background = 'rgba(255,0,51,0.1)';
            });
            accountDiv.addEventListener('mouseleave', () => {
                accountDiv.style.borderColor = 'var(--border-color)';
                accountDiv.style.background = 'rgba(255,255,255,0.05)';
            });
            accountsList.appendChild(accountDiv);
        });
    }
    
    backToForgotPassword(): void {
        this.resetForgotPasswordForms();
    }
    
    showResetPasswordForm(): void {
        const forgotForm = document.getElementById('forgot-password-form');
        const selectForm = document.getElementById('select-account-form');
        const resetForm = document.getElementById('reset-password-form');
        const title = document.getElementById('forgot-password-title');
        const subtitle = document.getElementById('forgot-password-subtitle');
        
        if (forgotForm) forgotForm.style.display = 'none';
        if (selectForm) selectForm.style.display = 'none';
        if (resetForm) resetForm.style.display = 'block';
        if (title) title.textContent = 'Смена пароля';
        if (subtitle) subtitle.textContent = 'Введите код и новый пароль';
        
        const emailDisplay = document.getElementById('reset-email-display');
        if (emailDisplay && this.pendingResetEmail) {
            emailDisplay.textContent = this.pendingResetEmail;
        }
        
        const codeInput = document.getElementById('reset-code') as HTMLInputElement;
        const passwordInput = document.getElementById('reset-password') as HTMLInputElement;
        const password2Input = document.getElementById('reset-password2') as HTMLInputElement;
        if (codeInput) codeInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (password2Input) password2Input.value = '';
        
        const codeError = document.getElementById('reset-code-error');
        const passwordError = document.getElementById('reset-password-error');
        if (codeError) {
            codeError.textContent = '';
            codeError.style.display = 'none';
        }
        if (passwordError) {
            passwordError.textContent = '';
            passwordError.style.display = 'none';
        }
        
        this.startResendResetTimer();
    }
    
    async confirmPasswordReset(): Promise<boolean> {
        const codeInput = document.getElementById('reset-code') as HTMLInputElement;
        const passwordInput = document.getElementById('reset-password') as HTMLInputElement;
        const password2Input = document.getElementById('reset-password2') as HTMLInputElement;
        const codeError = document.getElementById('reset-code-error');
        const passwordError = document.getElementById('reset-password-error');
        
        if (!codeInput || !passwordInput || !password2Input) {
            showToast('Ошибка: поля не найдены', 'error');
            return false;
        }
        
        if (!this.pendingResetEmail || !this.pendingResetUserId) {
            showToast('Ошибка: данные не найдены. Начните заново', 'error');
            this.showForgotPassword();
            return false;
        }
        
        const code = codeInput.value.trim();
        const password = passwordInput.value;
        const password2 = password2Input.value;
        
        const codeResult = validateVerificationCode(code);
        if (!codeResult.valid) {
            if (codeError) {
                codeError.textContent = codeResult.error || 'Введите 6-значный код';
                codeError.style.display = 'block';
            }
            showToast(codeResult.error || 'Введите 6-значный код', 'error');
            return false;
        }
        
        const passwordResult = validatePassword(password);
        if (!passwordResult.valid) {
            if (passwordError) {
                passwordError.textContent = passwordResult.error || 'Ошибка валидации';
                passwordError.style.display = 'block';
            }
            showToast(passwordResult.error || 'Ошибка валидации', 'error');
            return false;
        }
        
        const matchResult = validatePasswordMatch(password, password2);
        if (!matchResult.valid) {
            if (passwordError) {
                passwordError.textContent = matchResult.error || 'Пароли не совпадают';
                passwordError.style.display = 'block';
            }
            showToast(matchResult.error || 'Пароли не совпадают', 'error');
            return false;
        }
        
        const confirmed = await this.showConfirmDialog(
            'Подтвердите изменение пароля',
            'Вы уверены, что хотите изменить пароль?'
        );
        
        if (!confirmed) {
            return false;
        }
        
        if (codeError) {
            codeError.textContent = '';
            codeError.style.display = 'none';
        }
        if (passwordError) {
            passwordError.textContent = '';
            passwordError.style.display = 'none';
        }
        
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.pendingResetEmail,
                    userId: this.pendingResetUserId,
                    code: code,
                    password: password
                })
            });
            
            const data: ApiResponse<{ token?: string; user?: User }> = await response.json();
            hideLoadingIndicator();
            
            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка смены пароля';
                showToast(errorMsg, 'error');
                if (codeError && errorMsg.includes('код')) {
                    codeError.textContent = errorMsg;
                    codeError.style.display = 'block';
                }
                return false;
            }
            
            if ((data as any).success) {
                showToast('Пароль успешно изменён! Выполняется вход...', 'success');
                
                this.closeForgotPasswordModal();
                
                if ((data as any).token && (data as any).user) {
                    this.shop.user = (data as any).user;
                    this.shop.token = (data as any).token;
                    localStorage.setItem('user', JSON.stringify((data as any).user));
                    localStorage.setItem('token', (data as any).token);
                    this.updateAuthUI();
                    await this.shop.productsModule.loadProducts();
                } else {
                    setTimeout(() => {
                        this.openAuthModal();
                        (window as any).showLoginForm();
                    }, 2000);
                }
                
                return true;
            }
            
            return false;
        } catch (error: any) {
            hideLoadingIndicator();
            let errorMessage = error.message || 'Ошибка смены пароля';
            if (error.data) {
                errorMessage = error.data.error || error.data.message || errorMessage;
            }
            showToast(errorMessage, 'error');
            return false;
        }
    }
    
    async resendResetCode(): Promise<boolean> {
        if (!this.pendingResetEmail || !this.pendingResetUserId) {
            showToast('Ошибка: данные не найдены', 'error');
            return false;
        }
        
        const resendBtn = document.getElementById('resend-reset-code-btn') as HTMLButtonElement;
        if (resendBtn && resendBtn.disabled) {
            return false;
        }
        
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: this.pendingResetEmail,
                    userId: this.pendingResetUserId
                })
            });
            
            const data: ApiResponse = await response.json();
            hideLoadingIndicator();
            
            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка отправки кода';
                showToast(errorMsg, 'error');
                return false;
            }
            
            if ((data as any).success) {
                showToast('Новый код отправлен на email', 'success');
                this.startResendResetTimer();
                return true;
            }
            
            showToast('Ошибка отправки кода', 'error');
            return false;
        } catch (error: any) {
            hideLoadingIndicator();
            let errorMessage = error.message || 'Ошибка отправки кода';
            if (error.data) {
                errorMessage = error.data.error || error.data.message || errorMessage;
            }
            showToast(errorMessage, 'error');
            return false;
        }
    }
    
    startResendResetTimer(): void {
        const resendBtn = document.getElementById('resend-reset-code-btn') as HTMLButtonElement;
        if (!resendBtn) return;
        
        let timer = 60;
        resendBtn.disabled = true;
        resendBtn.textContent = `Отправить код заново (${timer})`;
        
        if (this.resendResetTimer) {
            clearInterval(this.resendResetTimer);
        }
        
        this.resendResetTimer = setInterval(() => {
            timer--;
            resendBtn.textContent = `Отправить код заново (${timer})`;
            
            if (timer <= 0) {
                if (this.resendResetTimer) {
                    clearInterval(this.resendResetTimer);
                    this.resendResetTimer = null;
                }
                resendBtn.textContent = 'Отправить код заново';
                resendBtn.disabled = false;
            }
        }, 1000);
    }

    showConfirmDialog(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-hidden', 'false');
            
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.maxWidth = '350px';
            content.style.textAlign = 'center';
            
            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.marginBottom = '15px';
            titleEl.style.color = '#ff0033';
            
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.marginBottom = '25px';
            messageEl.style.color = '#ccc';
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.display = 'flex';
            buttonsDiv.style.gap = '12px';
            
            const noBtn = document.createElement('button');
            noBtn.textContent = 'Нет';
            noBtn.style.cssText = 'flex:1; padding:14px; background:#333; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;';
            noBtn.addEventListener('click', () => {
                modal.remove();
                resolve(false);
            });
            
            const yesBtn = document.createElement('button');
            yesBtn.textContent = 'Да';
            yesBtn.style.cssText = 'flex:1; padding:14px; background:#ff0033; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer;';
            yesBtn.addEventListener('click', () => {
                modal.remove();
                resolve(true);
            });
            
            buttonsDiv.appendChild(noBtn);
            buttonsDiv.appendChild(yesBtn);
            
            content.appendChild(titleEl);
            content.appendChild(messageEl);
            content.appendChild(buttonsDiv);
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            });
        });
    }
}

