// profile.ts - Модуль для профиля пользователя (полная версия)
import { escapeHtml, escapeAttr, safeFetch, showLoadingIndicator, hideLoadingIndicator, showToast } from './utils';
import { validateEmail, validatePassword, validatePasswordMatch } from './validators';
import type { User, Order, ApiResponse } from './types';
import type { ShopInstance } from './products';

export class ProfileModule {
    private shop: ShopInstance & { authModule: any; productsModule: any };
    public pendingEmailChange: string | null = null;
    public resendEmailChangeTimer: NodeJS.Timeout | null = null;

    constructor(shop: ShopInstance & { authModule: any; productsModule: any }) {
        this.shop = shop;
    }

    openProfileModal(): void {
        if (!this.shop.user) return;

        const modal = document.getElementById('profile-modal');
        if (!modal) return;
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        const usernameHeader = document.getElementById('profile-username-header');
        const emailHeader = document.getElementById('profile-email-header');
        const avatarText = document.getElementById('profile-avatar-text');
        const avatarImg = document.getElementById('profile-avatar-img') as HTMLImageElement;
        const adminBadge = document.getElementById('profile-isadmin-badge');
        
        if (usernameHeader) usernameHeader.textContent = (this.shop.user as User).username;
        if (emailHeader) emailHeader.textContent = (this.shop.user as User).email;
        
        if ((this.shop.user as User).avatar_url) {
            if (avatarImg) {
                avatarImg.src = (this.shop.user as User).avatar_url || '';
                avatarImg.style.display = 'block';
            }
            if (avatarText) avatarText.style.display = 'none';
        } else {
            if (avatarImg) avatarImg.style.display = 'none';
            if (avatarText) {
                avatarText.textContent = ((this.shop.user as User).username || 'U').charAt(0).toUpperCase();
                avatarText.style.display = 'flex';
            }
        }
        
        if (adminBadge) adminBadge.style.display = (this.shop.user as User).isAdmin ? 'flex' : 'none';

        const username = document.getElementById('profile-username');
        const email = document.getElementById('profile-email');
        const fullname = document.getElementById('profile-fullname');
        
        if (username) username.textContent = (this.shop.user as User).username;
        if (email) email.textContent = (this.shop.user as User).email;
        if (fullname) fullname.textContent = (this.shop.user as User).fullName || 'Не указано';

        this.loadOrders();
        this.setupProfileEditListeners();
    }
    
    setupProfileEditListeners(): void {
        document.querySelectorAll('.profile-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const field = (e.currentTarget as HTMLElement).dataset.field;
                if (field) this.showEditForm(field);
            });
        });
        
        const avatarUpload = document.getElementById('profile-avatar-upload') as HTMLInputElement;
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) this.handleAvatarUpload(file);
            });
        }
    }
    
    showEditForm(field: string): void {
        document.querySelectorAll('.profile-edit-form').forEach(form => {
            (form as HTMLElement).style.display = 'none';
        });
        
        const form = document.getElementById(`edit-${field}-form`);
        if (form) {
            form.style.display = 'flex';
            const input = form.querySelector('input') as HTMLInputElement;
            if (input) {
                input.focus();
                if (field === 'username') input.value = (this.shop.user as User).username || '';
                else if (field === 'email') input.value = (this.shop.user as User).email || '';
                else if (field === 'fullname') input.value = (this.shop.user as User).fullName || '';
            }
        }
    }
    
    cancelEdit(field: string): void {
        if (field === 'email') {
            this.cancelEmailChange();
            const emailForm = document.getElementById('edit-email-form');
            if (emailForm) emailForm.style.display = 'none';
        } else {
            const form = document.getElementById(`edit-${field}-form`);
            if (form) {
                form.style.display = 'none';
                const inputs = form.querySelectorAll('input');
                inputs.forEach(input => input.value = '');
            }
        }
    }
    
    async handleAvatarUpload(file: File): Promise<void> {
        if (!file) return;
        
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Недопустимый тип файла. Разрешены только изображения.', 'error');
            return;
        }
        
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast('Файл слишком большой. Максимальный размер: 5MB.', 'error');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            
            const response = await safeFetch(`${this.shop.API_BASE_URL}/profile/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.shop.token}`
                },
                body: formData
            });
            
            const data: ApiResponse<{ avatar_url: string }> = await response.json();
            
            if ((data as any).avatar_url) {
                (this.shop.user as User).avatar_url = (data as any).avatar_url;
                localStorage.setItem('user', JSON.stringify(this.shop.user));
                
                const avatarImg = document.getElementById('profile-avatar-img') as HTMLImageElement;
                const avatarText = document.getElementById('profile-avatar-text');
                
                if (avatarImg) {
                    avatarImg.src = (data as any).avatar_url;
                    avatarImg.style.display = 'block';
                }
                if (avatarText) avatarText.style.display = 'none';
                
                showToast('Фото профиля обновлено', 'success');
            } else {
                throw new Error('Сервер не вернул URL аватара');
            }
        } catch (error: any) {
            let errorMessage = error.message || 'Ошибка загрузки фото';
            
            if (errorMessage.includes('404') || errorMessage.includes('не найден')) {
                errorMessage = 'Сервер не отвечает. Проверьте, что API сервер запущен на ' + this.shop.API_BASE_URL;
            } else if (errorMessage.includes('401') || errorMessage.includes('авторизация')) {
                errorMessage = 'Требуется авторизация. Пожалуйста, войдите снова.';
            } else if (errorMessage.includes('сети') || errorMessage.includes('fetch')) {
                errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
            }
            
            showToast(errorMessage, 'error');
        }
    }
    
    async updateProfile(field: string, value: string): Promise<void> {
        try {
            const fieldMap: Record<string, string> = {
                'username': 'username',
                'email': 'email',
                'fullname': 'fullName',
                'password': 'password'
            };
            
            const serverField = fieldMap[field];
            if (!serverField) {
                throw new Error('Неизвестное поле для обновления');
            }
            
            const currentValue = (this.shop.user as User)[field === 'fullname' ? 'fullName' : field as keyof User];
            if (value === currentValue || (value === '' && field === 'fullname' && !currentValue)) {
                showToast('Значение не изменилось', 'info');
                return;
            }
            
            const requestBody: Record<string, any> = { [serverField]: value };
            
            const response = await safeFetch(`${this.shop.API_BASE_URL}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.shop.token}`
                },
                body: JSON.stringify(requestBody)
            });
            
            const data: ApiResponse<{ user: User }> = await response.json();
            
            if (data.user) {
                this.shop.user = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                this.shop.authModule.updateAuthUI();
                this.openProfileModal();
                showToast('Профиль обновлен', 'success');
            }
        } catch (error: any) {
            showToast(error.message || 'Ошибка обновления профиля', 'error');
            console.error('Update profile error:', error);
        }
    }
    
    async changeEmail(): Promise<boolean> {
        const emailInput = document.getElementById('edit-email-input') as HTMLInputElement;
        const emailForm = document.getElementById('edit-email-form');
        const codeForm = document.getElementById('edit-email-code-form');
        const emailError = document.getElementById('email-code-error');
        
        if (!emailInput) {
            showToast('Ошибка: поле ввода email не найдено', 'error');
            return false;
        }
        
        const newEmail = emailInput.value.trim();
        
        if (!newEmail) {
            showToast('Введите новый email', 'error');
            return false;
        }
        
        if (!validateEmail(newEmail)) {
            showToast('Неверный формат email', 'error');
            return false;
        }
        
        if (this.shop.user && (this.shop.user as User).email && newEmail.toLowerCase() === (this.shop.user as User).email.toLowerCase()) {
            showToast('Это ваш текущий email', 'info');
            return false;
        }
        
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/profile/change-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.shop.token}`
                },
                body: JSON.stringify({ email: newEmail })
            });
            
            const data: ApiResponse = await response.json();
            hideLoadingIndicator();
            
            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка отправки кода';
                showToast(errorMsg, 'error');
                return false;
            }
            
            if ((data as any).success) {
                this.pendingEmailChange = newEmail.toLowerCase();
                
                if (emailForm) emailForm.style.display = 'none';
                if (codeForm) {
                    codeForm.style.display = 'block';
                    const emailDisplay = document.getElementById('new-email-display');
                    if (emailDisplay) {
                        emailDisplay.textContent = newEmail;
                    }
                    const codeInput = document.getElementById('edit-email-code-input') as HTMLInputElement;
                    if (codeInput) {
                        codeInput.value = '';
                    }
                }
                
                this.startResendEmailChangeTimer();
                
                showToast('Код подтверждения отправлен на новый email', 'success');
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
    
    async confirmEmailChange(): Promise<boolean> {
        const codeInput = document.getElementById('edit-email-code-input') as HTMLInputElement;
        const codeError = document.getElementById('email-code-error');
        const emailForm = document.getElementById('edit-email-form');
        const codeForm = document.getElementById('edit-email-code-form');
        
        if (!codeInput) {
            showToast('Ошибка: поле ввода кода не найдено', 'error');
            return false;
        }
        
        if (!this.pendingEmailChange) {
            showToast('Ошибка: email не найден. Начните смену email заново', 'error');
            if (emailForm) emailForm.style.display = 'block';
            if (codeForm) codeForm.style.display = 'none';
            return false;
        }
        
        const code = codeInput.value.trim();
        
        if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
            if (codeError) {
                codeError.textContent = 'Введите 6-значный код';
                codeError.style.display = 'block';
            }
            showToast('Введите 6-значный код', 'error');
            return false;
        }
        
        if (codeError) {
            codeError.textContent = '';
            codeError.style.display = 'none';
        }
        
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/profile/confirm-email-change`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.shop.token}`
                },
                body: JSON.stringify({
                    email: this.pendingEmailChange,
                    code: code
                })
            });
            
            const data: ApiResponse<{ user: User }> = await response.json();
            hideLoadingIndicator();
            
            if (!response.ok) {
                const errorMsg = data?.error || data?.message || 'Ошибка подтверждения';
                showToast(errorMsg, 'error');
                if (codeError) {
                    codeError.textContent = errorMsg;
                    codeError.style.display = 'block';
                }
                return false;
            }
            
            if ((data as any).success && data.user) {
                this.shop.user = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                this.shop.authModule.updateAuthUI();
                
                const profileEmail = document.getElementById('profile-email');
                if (profileEmail) {
                    profileEmail.textContent = data.user.email;
                }
                const profileEmailHeader = document.getElementById('profile-email-header');
                if (profileEmailHeader) {
                    profileEmailHeader.textContent = data.user.email;
                }
                
                if (emailForm) emailForm.style.display = 'none';
                if (codeForm) codeForm.style.display = 'none';
                
                const emailInput = document.getElementById('edit-email-input') as HTMLInputElement;
                if (emailInput) emailInput.value = '';
                if (codeInput) codeInput.value = '';
                
                if (this.resendEmailChangeTimer) {
                    clearInterval(this.resendEmailChangeTimer);
                    this.resendEmailChangeTimer = null;
                }
                
                this.pendingEmailChange = null;
                
                showToast('Email успешно изменён!', 'success');
                return true;
            } else {
                const errorMsg = (data as any).error || (data as any).message || 'Ошибка подтверждения';
                showToast(errorMsg, 'error');
                if (codeError) {
                    codeError.textContent = errorMsg;
                    codeError.style.display = 'block';
                }
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
            return false;
        }
    }
    
    async resendEmailChangeCode(): Promise<boolean> {
        if (!this.pendingEmailChange) {
            showToast('Ошибка: email не найден. Начните смену email заново', 'error');
            return false;
        }
        
        const resendBtn = document.getElementById('resend-email-change-btn') as HTMLButtonElement;
        if (resendBtn && resendBtn.disabled) {
            return false;
        }
        
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/profile/change-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.shop.token}`
                },
                body: JSON.stringify({ email: this.pendingEmailChange })
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
                this.startResendEmailChangeTimer();
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
    
    startResendEmailChangeTimer(): void {
        const resendBtn = document.getElementById('resend-email-change-btn') as HTMLButtonElement;
        if (!resendBtn) return;
        
        let timer = 60;
        resendBtn.disabled = true;
        resendBtn.textContent = `Отправить код заново (${timer})`;
        
        if (this.resendEmailChangeTimer) {
            clearInterval(this.resendEmailChangeTimer);
        }
        
        this.resendEmailChangeTimer = setInterval(() => {
            timer--;
            resendBtn.textContent = `Отправить код заново (${timer})`;
            
            if (timer <= 0) {
                if (this.resendEmailChangeTimer) {
                    clearInterval(this.resendEmailChangeTimer);
                    this.resendEmailChangeTimer = null;
                }
                resendBtn.textContent = 'Отправить код заново';
                resendBtn.disabled = false;
            }
        }, 1000);
    }
    
    cancelEmailChange(): void {
        const emailForm = document.getElementById('edit-email-form');
        const codeForm = document.getElementById('edit-email-code-form');
        const emailInput = document.getElementById('edit-email-input') as HTMLInputElement;
        const codeInput = document.getElementById('edit-email-code-input') as HTMLInputElement;
        const codeError = document.getElementById('email-code-error');
        
        if (codeForm) codeForm.style.display = 'none';
        if (emailForm) emailForm.style.display = 'block';
        
        if (emailInput) emailInput.value = '';
        if (codeInput) codeInput.value = '';
        if (codeError) {
            codeError.textContent = '';
            codeError.style.display = 'none';
        }
        
        if (this.resendEmailChangeTimer) {
            clearInterval(this.resendEmailChangeTimer);
            this.resendEmailChangeTimer = null;
        }
        
        this.pendingEmailChange = null;
        
        const resendBtn = document.getElementById('resend-email-change-btn') as HTMLButtonElement;
        if (resendBtn) {
            resendBtn.textContent = 'Отправить код заново';
            resendBtn.disabled = false;
        }
        
        const emailDisplay = document.getElementById('new-email-display');
        if (emailDisplay) {
            emailDisplay.textContent = '';
        }
    }
    
    async changePassword(): Promise<void> {
        const passwordInput = document.getElementById('edit-password-input') as HTMLInputElement;
        const passwordConfirmInput = document.getElementById('edit-password-confirm') as HTMLInputElement;
        
        if (!passwordInput || !passwordConfirmInput) {
            showToast('Ошибка: поля не найдены', 'error');
            return;
        }
        
        const password = passwordInput.value;
        const confirm = passwordConfirmInput.value;
        
        const passwordResult = validatePassword(password);
        if (!passwordResult.valid) {
            showToast(passwordResult.error || 'Ошибка валидации', 'error');
            return;
        }
        
        const matchResult = validatePasswordMatch(password, confirm);
        if (!matchResult.valid) {
            showToast(matchResult.error || 'Пароли не совпадают', 'error');
            return;
        }
        
        await this.updateProfile('password', password);
        
        passwordInput.value = '';
        passwordConfirmInput.value = '';
        const form = document.getElementById('edit-password-form');
        if (form) form.style.display = 'none';
    }
    
    async deleteAccount(): Promise<void> {
        const firstConfirm = await this.showConfirmDialog(
            'Удалить аккаунт?',
            'Вы уверены? Это действие нельзя отменить. Все ваши данные будут удалены.'
        );
        
        if (!firstConfirm) return;
        
        const secondConfirm = await this.showConfirmDialog(
            'Подтвердите удаление',
            'Это последнее предупреждение. Вы действительно хотите удалить аккаунт?'
        );
        
        if (!secondConfirm) return;
        
        const password = await this.showInputDialog(
            'Подтвердите паролем',
            'Введите ваш пароль для подтверждения удаления аккаунта:',
            'password'
        );
        
        if (!password) return;
        
        try {
            showLoadingIndicator();
            await safeFetch(`${this.shop.API_BASE_URL}/profile`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.shop.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            hideLoadingIndicator();
            showToast('Аккаунт удален', 'success');
            this.shop.authModule.logout();
        } catch (error: any) {
            hideLoadingIndicator();
            showToast(error.message || 'Ошибка удаления аккаунта', 'error');
            console.error('Delete account error:', error);
        }
    }

    closeProfileModal(): void {
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    loadProfileData(): void {
        if (!this.shop.user) return;

        const usernameEl = document.getElementById('profile-username');
        const emailEl = document.getElementById('profile-email');
        const fullNameEl = document.getElementById('profile-fullname');

        if (usernameEl) usernameEl.textContent = (this.shop.user as User).username || 'Не указано';
        if (emailEl) emailEl.textContent = (this.shop.user as User).email || 'Не указано';
        if (fullNameEl) fullNameEl.textContent = (this.shop.user as User).fullName || 'Не указано';
    }

    async loadOrders(): Promise<void> {
        if (!this.shop.user) return;

        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` },
                showLoading: false
            });

            const orders: Order[] = await response.json();
            this.renderOrders(orders);
            hideLoadingIndicator();
        } catch (error: any) {
            hideLoadingIndicator();
            console.error('Load orders error:', error);
            const ordersList = document.getElementById('orders-list');
            if (ordersList) {
                ordersList.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">Ошибка загрузки заказов</p>';
            }
        }
    }

    renderOrders(orders: Order[]): void {
        const ordersList = document.getElementById('orders-list');
        if (!ordersList) return;
        
        ordersList.innerHTML = '';
        
        if (!orders || orders.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-state empty-orders';
            emptyDiv.innerHTML = `
                <div class="empty-state-icon">📋</div>
                <h3 class="empty-state-title">Заказов пока нет</h3>
                <p class="empty-state-description">
                    Когда вы оформите заказ, он появится здесь
                </p>
            `;
            ordersList.appendChild(emptyDiv);
            return;
        }

        orders.forEach(order => {
            const orderDiv = document.createElement('div');
            orderDiv.className = 'order-item';
            orderDiv.style.cssText = 'padding: 15px; margin-bottom: 15px; background: rgba(255,255,255,0.05); border: 2px solid var(--border-color); border-radius: 10px; cursor: pointer; transition: all 0.3s;';
            
            orderDiv.addEventListener('click', () => {
                this.showOrderDetails(order);
            });
            
            orderDiv.addEventListener('mouseenter', () => {
                orderDiv.style.borderColor = 'var(--neon-red)';
                orderDiv.style.background = 'rgba(255,0,51,0.1)';
            });
            
            orderDiv.addEventListener('mouseleave', () => {
                orderDiv.style.borderColor = 'var(--border-color)';
                orderDiv.style.background = 'rgba(255,255,255,0.05)';
            });
            
            const orderId = document.createElement('p');
            const strong = document.createElement('strong');
            strong.textContent = `Заказ #${escapeHtml(order.id.substring(0, 8))}`;
            strong.style.color = 'var(--neon-red)';
            orderId.appendChild(strong);
            
            const date = document.createElement('p');
            date.innerHTML = `Дата: ${escapeHtml(new Date(order.created_at).toLocaleDateString('ru-RU'))}`;
            date.style.marginTop = '8px';
            
            const amount = document.createElement('p');
            amount.innerHTML = `Сумма: <strong>${escapeHtml(order.total_amount.toString())} ₽</strong>`;
            amount.style.marginTop = '8px';
            
            const status = document.createElement('p');
            const statusSpan = document.createElement('span');
            statusSpan.textContent = escapeHtml(order.status);
            statusSpan.style.color = '#00ff88';
            status.innerHTML = 'Статус: ';
            status.appendChild(statusSpan);
            status.style.marginTop = '8px';
            
            orderDiv.appendChild(orderId);
            orderDiv.appendChild(date);
            orderDiv.appendChild(amount);
            orderDiv.appendChild(status);
            
            ordersList.appendChild(orderDiv);
        });
    }

    async showOrderDetails(order: Order): Promise<void> {
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/orders/${order.id}`, {
                headers: {
                    'Authorization': `Bearer ${this.shop.token}`
                }
            });
            
            const fullOrder: Order = await response.json();
            hideLoadingIndicator();
            
            if (!response.ok) {
                showToast((fullOrder as any).error || 'Ошибка загрузки заказа', 'error');
                return;
            }
            
            this.renderOrderDetailsModal(fullOrder);
        } catch (error: any) {
            hideLoadingIndicator();
            showToast(error.message || 'Ошибка загрузки заказа', 'error');
        }
    }
    
    renderOrderDetailsModal(order: Order): void {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.id = 'order-details-modal';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.maxWidth = '600px';
        content.style.maxHeight = '90vh';
        content.style.overflowY = 'auto';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        const title = document.createElement('h2');
        title.textContent = `Заказ #${order.id.substring(0, 8)}`;
        title.style.marginBottom = '20px';
        title.style.color = 'var(--neon-red)';
        
        const infoDiv = document.createElement('div');
        infoDiv.style.marginBottom = '20px';
        
        const statusP = document.createElement('p');
        statusP.innerHTML = `<strong>Статус:</strong> <span style="color: #00ff88;">${escapeHtml(order.status)}</span>`;
        statusP.style.marginBottom = '10px';
        
        const dateP = document.createElement('p');
        dateP.innerHTML = `<strong>Дата:</strong> ${escapeHtml(new Date(order.created_at).toLocaleString('ru-RU'))}`;
        dateP.style.marginBottom = '10px';
        
        const amountP = document.createElement('p');
        amountP.innerHTML = `<strong>Сумма:</strong> ${escapeHtml(order.total_amount.toString())} ₽`;
        amountP.style.marginBottom = '10px';
        
        const addressP = document.createElement('p');
        addressP.innerHTML = `<strong>Адрес доставки:</strong> ${escapeHtml(order.shipping_address)}`;
        addressP.style.marginBottom = '10px';
        
        infoDiv.appendChild(statusP);
        infoDiv.appendChild(dateP);
        infoDiv.appendChild(amountP);
        infoDiv.appendChild(addressP);
        
        if (order.items && order.items.length > 0) {
            const itemsTitle = document.createElement('h3');
            itemsTitle.textContent = 'Товары:';
            itemsTitle.style.marginTop = '20px';
            itemsTitle.style.marginBottom = '10px';
            infoDiv.appendChild(itemsTitle);
            
            order.items.forEach(item => {
                const itemP = document.createElement('p');
                itemP.innerHTML = `${escapeHtml(item.productName || 'Товар')} × ${item.quantity} = ${escapeHtml((item.price * item.quantity).toString())} ₽`;
                itemP.style.marginBottom = '5px';
                infoDiv.appendChild(itemP);
            });
        }
        
        content.appendChild(closeBtn);
        content.appendChild(title);
        content.appendChild(infoDiv);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
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

    showInputDialog(title: string, message: string, type: string = 'text'): Promise<string | null> {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'block';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-hidden', 'false');
            
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.maxWidth = '400px';
            
            const titleEl = document.createElement('h3');
            titleEl.textContent = title;
            titleEl.style.marginBottom = '15px';
            titleEl.style.color = '#ff0033';
            
            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.marginBottom = '15px';
            messageEl.style.color = '#ccc';
            
            const input = document.createElement('input');
            input.type = type;
            input.style.cssText = 'width:100%; padding:12px; margin:15px 0; border-radius:8px; border:1px solid #333; background:#111; color:white; font-size:1rem;';
            input.placeholder = type === 'password' ? 'Введите пароль...' : 'Введите значение...';
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.display = 'flex';
            buttonsDiv.style.gap = '10px';
            buttonsDiv.style.marginTop = '20px';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Отмена';
            cancelBtn.style.cssText = 'flex:1; padding:12px; background:#333; color:white; border:none; border-radius:8px; cursor:pointer;';
            cancelBtn.addEventListener('click', () => {
                modal.remove();
                resolve(null);
            });
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            okBtn.style.cssText = 'flex:1; padding:12px; background:#ff0033; color:white; border:none; border-radius:8px; cursor:pointer;';
            okBtn.addEventListener('click', () => {
                const value = input.value;
                modal.remove();
                resolve(value);
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    okBtn.click();
                } else if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            });
            
            buttonsDiv.appendChild(cancelBtn);
            buttonsDiv.appendChild(okBtn);
            
            content.appendChild(titleEl);
            content.appendChild(messageEl);
            content.appendChild(input);
            content.appendChild(buttonsDiv);
            modal.appendChild(content);
            document.body.appendChild(modal);
            
            setTimeout(() => input.focus(), 100);
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null);
                }
            });
        });
    }
}

