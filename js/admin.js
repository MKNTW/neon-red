// admin.js - Модуль для админ-панели
import { escapeHtml, escapeAttr, safeFetch, showLoadingIndicator, hideLoadingIndicator, showToast } from './utils.js';

export class AdminModule {
    constructor(shop) {
        this.shop = shop;
    }

    async openAdminPanel() {
        if (!this.shop.user || !this.shop.user.isAdmin) {
            showToast('Доступ запрещен', 'error');
            return;
        }

        const modal = document.getElementById('admin-modal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            await this.loadAdminProducts();
        }
    }

    closeAdminPanel() {
        const modal = document.getElementById('admin-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    async loadAdminProducts() {
        try {
            const container = document.getElementById('admin-products-list');
            if (!container) return;
            
            if (container.children.length === 0) {
                container.innerHTML = '<div class="admin-loading">Загрузка товаров...</div>';
            }
            
            const response = await safeFetch(`${this.shop.API_BASE_URL}/admin/products`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });
            
            const products = await response.json();
            this.renderAdminProducts(products);
        } catch (error) {
            const container = document.getElementById('admin-products-list');
            if (container) {
                container.innerHTML = '<div class="admin-error">Ошибка загрузки товаров</div>';
            }
            showToast(error.message, 'error');
            console.error('Load admin products error:', error);
        }
    }

    renderAdminProducts(products) {
        const container = document.getElementById('admin-products-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        products.forEach(product => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            
            const imageDisplay = product.image_url 
                ? `<img src="${escapeAttr(product.image_url)}" alt="Product" class="admin-product-image-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                : '';
            const imageFallback = `<span class="admin-product-image-text" style="${product.image_url ? 'display: none;' : 'display: flex;'}">${escapeHtml((product.title || '?').charAt(0).toUpperCase())}</span>`;
            
            div.innerHTML = `
                <div class="admin-item-header">
                    <div class="admin-product-info">
                        <div class="admin-product-image">
                            ${imageDisplay}
                            ${imageFallback}
                        </div>
                        <div class="admin-product-details">
                            <strong>${escapeHtml(product.title)}</strong>
                            <span class="admin-item-price">${escapeHtml(product.price)} ₽</span>
                        </div>
                    </div>
                </div>
                <div class="admin-item-details">
                    <span>ID: ${escapeHtml(product.id)}</span>
                    <span>В наличии: ${escapeHtml(product.quantity)} шт.</span>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-btn edit" data-product-id="${escapeAttr(product.id)}">✏️ Редактировать</button>
                    <button class="admin-btn delete" data-product-id="${escapeAttr(product.id)}">🗑️ Удалить</button>
                </div>
            `;
            
            const editBtn = div.querySelector('.edit');
            const deleteBtn = div.querySelector('.delete');
            editBtn.addEventListener('click', () => this.editProduct(product.id));
            deleteBtn.addEventListener('click', () => this.deleteProduct(product.id));
            
            container.appendChild(div);
        });
    }

    async editProduct(id) {
        showToast('Функция редактирования в разработке', 'info');
    }

    async deleteProduct(id) {
        if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
        
        try {
            showLoadingIndicator();
            const response = await safeFetch(`${this.shop.API_BASE_URL}/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });
            
            hideLoadingIndicator();
            
            if (response.ok) {
                showToast('Товар удален', 'success');
                await this.loadAdminProducts();
            } else {
                const data = await response.json();
                showToast(data.error || 'Ошибка удаления', 'error');
            }
        } catch (error) {
            hideLoadingIndicator();
            showToast(error.message || 'Ошибка удаления', 'error');
        }
    }

    async loadAdminUsers() {
        showToast('Функция в разработке', 'info');
    }

    async loadAdminOrders() {
        showToast('Функция в разработке', 'info');
    }
}

