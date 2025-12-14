// profile.js - Модуль для профиля пользователя
import { escapeHtml, safeFetch, showLoadingIndicator, hideLoadingIndicator, showToast } from './utils.js';

export class ProfileModule {
    constructor(shop) {
        this.shop = shop;
    }

    openProfileModal() {
        if (!this.shop.user) return;

        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            this.loadProfileData();
        }
    }

    closeProfileModal() {
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    loadProfileData() {
        if (!this.shop.user) return;

        const usernameEl = document.getElementById('profile-username');
        const emailEl = document.getElementById('profile-email');
        const fullNameEl = document.getElementById('profile-fullname');

        if (usernameEl) usernameEl.textContent = this.shop.user.username || 'Не указано';
        if (emailEl) emailEl.textContent = this.shop.user.email || 'Не указано';
        if (fullNameEl) fullNameEl.textContent = this.shop.user.fullName || 'Не указано';
    }

    async loadOrders() {
        if (!this.shop.user) return;

        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` },
                showLoading: false
            });

            const orders = await response.json();
            this.renderOrders(orders);
            hideLoadingIndicator();
        } catch (error) {
            hideLoadingIndicator();
            console.error('Load orders error:', error);
            const ordersList = document.getElementById('orders-list');
            if (ordersList) {
                ordersList.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">Ошибка загрузки заказов</p>';
            }
        }
    }

    renderOrders(orders) {
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
            amount.innerHTML = `Сумма: <strong>${escapeHtml(order.total_amount)} ₽</strong>`;
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

    showOrderDetails(order) {
        alert(`Заказ #${order.id.substring(0, 8)}\nДата: ${new Date(order.created_at).toLocaleDateString('ru-RU')}\nСумма: ${order.total_amount} ₽\nСтатус: ${order.status}`);
    }
}

