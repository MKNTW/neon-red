// admin.ts - Модуль для админ-панели (полная версия)
import { escapeHtml, escapeAttr, safeFetch, showLoadingIndicator, hideLoadingIndicator, showToast } from './utils';
import type { Product, User, Order, ApiResponse } from './types';
import type { ShopInstance } from './products';

export class AdminModule {
    private shop: ShopInstance & { productsModule: any };
    public currentEditProduct: Product | null = null;

    constructor(shop: ShopInstance & { productsModule: any }) {
        this.shop = shop;
    }

    async openAdminPanel(): Promise<void> {
        if (!this.shop.user || !(this.shop.user as User).isAdmin) {
            showToast('Доступ запрещен', 'error');
            return;
        }

        const modal = document.getElementById('admin-modal');
        if (!modal) return;
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        await this.loadAdminProducts();
    }

    closeAdminPanel(): void {
        const modal = document.getElementById('admin-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    async loadAdminProducts(): Promise<void> {
        try {
            const container = document.getElementById('admin-products-list');
            if (!container) return;
            
            if (container.children.length === 0) {
                container.innerHTML = '<div class="admin-loading">Загрузка товаров...</div>';
            }
            
            const response = await safeFetch(`${this.shop.API_BASE_URL}/admin/products`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });
            
            const products: Product[] = await response.json();
            this.renderAdminProducts(products);
        } catch (error: any) {
            const container = document.getElementById('admin-products-list');
            if (container) {
                container.innerHTML = '<div class="admin-error">Ошибка загрузки товаров</div>';
            }
            showToast(error.message, 'error');
            console.error('Load admin products error:', error);
        }
    }

    renderAdminProducts(products: Product[]): void {
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
                            <span class="admin-item-price">${escapeHtml(product.price.toString())} ₽</span>
                        </div>
                    </div>
                </div>
                <div class="admin-item-details">
                    <span>ID: ${escapeHtml(product.id)}</span>
                    <span>В наличии: ${escapeHtml(product.quantity.toString())} шт.</span>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-btn edit" data-product-id="${escapeAttr(product.id)}">✏️ Редактировать</button>
                    <button class="admin-btn delete" data-product-id="${escapeAttr(product.id)}">🗑️ Удалить</button>
                </div>
            `;
            
            const editBtn = div.querySelector('.edit');
            const deleteBtn = div.querySelector('.delete');
            editBtn?.addEventListener('click', () => this.editProduct(product.id));
            deleteBtn?.addEventListener('click', () => this.deleteProduct(product.id));
            
            container.appendChild(div);
        });
    }

    async editProduct(id: string): Promise<void> {
        const product = this.shop.products.find((p: Product) => p.id === id);
        if (!product) return;

        const modal = document.getElementById('edit-product-modal');
        if (!modal) return;
        
        modal.style.display = 'block';
        
        const idInput = document.getElementById('edit-product-id') as HTMLInputElement;
        const titleInput = document.getElementById('edit-product-title') as HTMLInputElement;
        const descInput = document.getElementById('edit-product-description') as HTMLTextAreaElement;
        const priceInput = document.getElementById('edit-product-price') as HTMLInputElement;
        const quantityInput = document.getElementById('edit-product-quantity') as HTMLInputElement;
        const imageUrlInput = document.getElementById('edit-product-image-url') as HTMLInputElement;
        
        if (idInput) idInput.value = product.id;
        if (titleInput) titleInput.value = product.title;
        if (descInput) descInput.value = product.description || '';
        if (priceInput) priceInput.value = product.price.toString();
        if (quantityInput) quantityInput.value = product.quantity.toString();
        if (imageUrlInput) imageUrlInput.value = product.image_url || '';
        
        const preview = document.getElementById('edit-product-image-preview');
        if (preview) {
            preview.innerHTML = '';
            if (product.image_url) {
                const img = document.createElement('img');
                img.src = product.image_url;
                img.alt = 'Текущее изображение';
                img.style.cssText = 'max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px;';
                preview.appendChild(img);
            }
        }
        
        const fileInput = document.getElementById('edit-product-image-upload') as HTMLInputElement;
        const removeBtn = document.getElementById('edit-remove-image') as HTMLButtonElement;
        if (fileInput) fileInput.value = '';
        
        if (removeBtn) {
            removeBtn.style.display = product.image_url ? 'block' : 'none';
            removeBtn.onclick = () => {
                if (imageUrlInput) imageUrlInput.value = '';
                if (preview) preview.innerHTML = '';
                removeBtn.style.display = 'none';
            };
        }
        
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file && preview) {
                    this.previewImage(file, preview);
                    if (removeBtn) removeBtn.style.display = 'block';
                }
            };
        }
        
        this.currentEditProduct = product;
    }
    
    previewImage(file: File, container: HTMLElement): void {
        const reader = new FileReader();
        reader.onload = (e) => {
            container.innerHTML = '';
            const img = document.createElement('img');
            img.src = e.target?.result as string;
            img.alt = 'Превью';
            img.style.cssText = 'max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px;';
            container.appendChild(img);
        };
        reader.readAsDataURL(file);
    }

    async saveProduct(): Promise<void> {
        const idInput = document.getElementById('edit-product-id') as HTMLInputElement;
        const titleInput = document.getElementById('edit-product-title') as HTMLInputElement;
        const descInput = document.getElementById('edit-product-description') as HTMLTextAreaElement;
        const priceInput = document.getElementById('edit-product-price') as HTMLInputElement;
        const quantityInput = document.getElementById('edit-product-quantity') as HTMLInputElement;
        const imageUrlInput = document.getElementById('edit-product-image-url') as HTMLInputElement;
        const fileInput = document.getElementById('edit-product-image-upload') as HTMLInputElement;
        
        if (!idInput || !titleInput || !priceInput || !quantityInput) {
            showToast('Ошибка: не все поля найдены', 'error');
            return;
        }
        
        const id = idInput.value;
        const title = titleInput.value;
        const description = descInput?.value || '';
        const price = parseFloat(priceInput.value);
        const quantity = parseInt(quantityInput.value);
        const imageUrl = imageUrlInput?.value.trim() || '';
        const file = fileInput?.files?.[0];

        try {
            let finalImageUrl: string | null = imageUrl || null;
            
            if (file) {
                if (!file.type || !file.type.startsWith('image/')) {
                    showToast('Недопустимый тип файла. Разрешены только изображения.', 'error');
                    return;
                }
                
                const maxSize = 10 * 1024 * 1024;
                if (file.size > maxSize) {
                    showToast('Файл слишком большой. Максимальный размер: 10MB.', 'error');
                    return;
                }
                
                const formData = new FormData();
                formData.append('image', file);
                
                const uploadResponse = await safeFetch(`${this.shop.API_BASE_URL}/admin/products/${id}/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.shop.token}`
                    },
                    body: formData
                });
                
                const uploadData: ApiResponse<{ image_url: string }> = await uploadResponse.json();
                
                if ((uploadData as any).image_url) {
                    finalImageUrl = (uploadData as any).image_url;
                } else {
                    throw new Error('Сервер не вернул URL изображения');
                }
            }
            
            if (!finalImageUrl && !file) {
                try {
                    await safeFetch(`${this.shop.API_BASE_URL}/admin/products/${id}/image`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${this.shop.token}`
                        }
                    });
                } catch (err) {
                    console.error('Error deleting image:', err);
                }
                finalImageUrl = null;
            }

            const response = await safeFetch(`${this.shop.API_BASE_URL}/admin/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.shop.token}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    price,
                    quantity,
                    image_url: finalImageUrl
                })
            });

            showToast('Товар обновлен', 'success');
            this.closeEditProductModal();
            await this.loadAdminProducts();
            await this.shop.productsModule.loadProducts();
        } catch (error: any) {
            let errorMessage = error.message || 'Ошибка сохранения товара';
            
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

    async deleteProduct(id: string): Promise<void> {
        const confirmed = await this.showConfirmDialog('Удалить товар?', 'Вы уверены, что хотите удалить этот товар?');
        if (!confirmed) return;

        try {
            await safeFetch(`${this.shop.API_BASE_URL}/admin/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });

            showToast('Товар удален', 'success');
            await this.loadAdminProducts();
            await this.shop.productsModule.loadProducts();
        } catch (error: any) {
            showToast(error.message, 'error');
            console.error('Delete product error:', error);
        }
    }

    async addNewProduct(): Promise<void> {
        const modal = document.getElementById('add-product-modal');
        if (!modal) return;
        
        modal.style.display = 'block';
        
        const titleInput = document.getElementById('new-product-title') as HTMLInputElement;
        const descInput = document.getElementById('new-product-description') as HTMLTextAreaElement;
        const priceInput = document.getElementById('new-product-price') as HTMLInputElement;
        const quantityInput = document.getElementById('new-product-quantity') as HTMLInputElement;
        const imageUrlInput = document.getElementById('new-product-image') as HTMLInputElement;
        const fileInput = document.getElementById('new-product-image-upload') as HTMLInputElement;
        const preview = document.getElementById('new-product-image-preview');
        
        if (titleInput) titleInput.value = '';
        if (descInput) descInput.value = '';
        if (priceInput) priceInput.value = '';
        if (quantityInput) quantityInput.value = '';
        if (imageUrlInput) imageUrlInput.value = '';
        if (fileInput) fileInput.value = '';
        if (preview) preview.innerHTML = '';
        
        const removeBtn = document.getElementById('new-remove-image') as HTMLButtonElement;
        if (removeBtn) {
            removeBtn.onclick = () => {
                if (imageUrlInput) imageUrlInput.value = '';
                if (preview) preview.innerHTML = '';
                if (fileInput) fileInput.value = '';
                removeBtn.style.display = 'none';
            };
        }
        
        if (fileInput && preview) {
            fileInput.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    this.previewImage(file, preview);
                    if (removeBtn) removeBtn.style.display = 'block';
                }
            };
        }
        
        if (imageUrlInput && preview) {
            imageUrlInput.addEventListener('input', () => {
                if (imageUrlInput.value.trim()) {
                    preview.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = imageUrlInput.value;
                    img.alt = 'Превью';
                    img.style.cssText = 'max-width: 200px; max-height: 200px; border-radius: 8px; margin-top: 10px;';
                    img.onerror = () => {
                        preview.innerHTML = '<p style="color:#ff0033; margin-top:10px;">Неверный URL изображения</p>';
                    };
                    preview.appendChild(img);
                    if (removeBtn) removeBtn.style.display = 'block';
                } else {
                    preview.innerHTML = '';
                    if (removeBtn) removeBtn.style.display = 'none';
                }
            });
        }
    }

    async uploadImage(file: File): Promise<string> {
        if (!file) {
            throw new Error('Файл не выбран');
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Недопустимый тип файла. Разрешены только изображения (JPEG, PNG, GIF, WebP).');
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('Файл слишком большой. Максимальный размер: 10MB.');
        }

        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await safeFetch(`${this.shop.API_BASE_URL}/upload-image`, {
                method: 'POST',
                body: formData
            });
            
            const data: ApiResponse<{ url: string }> = await response.json();
            
            if (!(data as any).url) {
                throw new Error('Сервер не вернул URL изображения');
            }
            
            return (data as any).url;
        } catch (error: any) {
            console.error('Image upload error:', error);
            throw error;
        }
    }

    async saveNewProduct(): Promise<void> {
        const titleInput = document.getElementById('new-product-title') as HTMLInputElement;
        const descInput = document.getElementById('new-product-description') as HTMLTextAreaElement;
        const priceInput = document.getElementById('new-product-price') as HTMLInputElement;
        const quantityInput = document.getElementById('new-product-quantity') as HTMLInputElement;
        const imageUrlInput = document.getElementById('new-product-image') as HTMLInputElement;
        const fileInput = document.getElementById('new-product-image-upload') as HTMLInputElement;
        
        if (!titleInput || !priceInput || !quantityInput) {
            showToast('Ошибка: не все поля найдены', 'error');
            return;
        }
        
        const title = titleInput.value;
        const description = descInput?.value || '';
        const price = parseFloat(priceInput.value);
        const quantity = parseInt(quantityInput.value);
        const imageUrl = imageUrlInput?.value || '';
        const file = fileInput?.files?.[0];

        try {
            let finalImageUrl: string = imageUrl || 'https://via.placeholder.com/300';
            
            if (file) {
                try {
                    finalImageUrl = await this.uploadImage(file);
                } catch (uploadError: any) {
                    console.error('Upload error:', uploadError);
                }
            }
            
            const productResponse = await safeFetch(`${this.shop.API_BASE_URL}/admin/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.shop.token}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    price,
                    quantity,
                    image_url: finalImageUrl
                })
            });
            
            await productResponse.json();
            showToast('Товар создан', 'success');

            this.closeAddProductModal();
            await this.loadAdminProducts();
            await this.shop.productsModule.loadProducts();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    }

    closeEditProductModal(): void {
        const modal = document.getElementById('edit-product-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.currentEditProduct = null;
    }

    closeAddProductModal(): void {
        const modal = document.getElementById('add-product-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    async loadAdminUsers(): Promise<void> {
        try {
            const container = document.getElementById('admin-users-list');
            if (!container) return;
            
            if (container.children.length === 0) {
                container.innerHTML = '<div class="admin-loading">Загрузка пользователей...</div>';
            }
            
            const response = await safeFetch(`${this.shop.API_BASE_URL}/admin/users`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });
            
            const users: User[] = await response.json();
            this.renderAdminUsers(users);
        } catch (error: any) {
            const container = document.getElementById('admin-users-list');
            if (container) {
                container.innerHTML = '<div class="admin-error">Ошибка загрузки пользователей</div>';
            }
            showToast(error.message, 'error');
            console.error('Load admin users error:', error);
        }
    }

    renderAdminUsers(users: User[]): void {
        const container = document.getElementById('admin-users-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            
            const avatarDisplay = user.avatar_url 
                ? `<img src="${escapeAttr(user.avatar_url)}" alt="Avatar" class="admin-user-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                : '';
            const avatarFallback = `<span class="admin-user-avatar-text" style="${user.avatar_url ? 'display: none;' : 'display: flex;'}">${escapeHtml((user.username || 'U').charAt(0).toUpperCase())}</span>`;
            
            div.innerHTML = `
                <div class="admin-item-header">
                    <div class="admin-user-info">
                        <div class="admin-user-avatar">
                            ${avatarDisplay}
                            ${avatarFallback}
                        </div>
                        <div class="admin-user-details">
                            <strong>${escapeHtml(user.username)}</strong>
                            <span class="admin-user-role">${user.isAdmin ? 'Админ' : 'Пользователь'}</span>
                        </div>
                    </div>
                </div>
                <div class="admin-item-details">
                    <span>Email: ${escapeHtml(user.email)}</span>
                    <span>Зарегистрирован: ${escapeHtml(new Date(user.created_at).toLocaleDateString())}</span>
                </div>
                <div class="admin-item-actions">
                    <button class="admin-btn" data-user-id="${escapeAttr(user.id)}">📋 Заказы</button>
                </div>
            `;
            
            const ordersBtn = div.querySelector('.admin-btn');
            ordersBtn?.addEventListener('click', () => this.viewUserOrders(user.id));
            
            container.appendChild(div);
        });
    }

    async loadAdminOrders(): Promise<void> {
        try {
            const container = document.getElementById('admin-orders-list');
            if (!container) return;
            
            if (container.children.length === 0) {
                container.innerHTML = '<div class="admin-loading">Загрузка заказов...</div>';
            }
            
            const response = await safeFetch(`${this.shop.API_BASE_URL}/admin/orders`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });
            
            const orders: Order[] = await response.json();
            this.renderAdminOrders(orders);
        } catch (error: any) {
            const container = document.getElementById('admin-orders-list');
            if (container) {
                container.innerHTML = '<div class="admin-error">Ошибка загрузки заказов</div>';
            }
            showToast(error.message, 'error');
            console.error('Load admin orders error:', error);
        }
    }

    renderAdminOrders(orders: Order[]): void {
        const container = document.getElementById('admin-orders-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        orders.forEach(order => {
            const div = document.createElement('div');
            div.className = 'admin-item';
            const orderId = escapeAttr(order.id);
            const safeStatus = escapeAttr(order.status);
            div.innerHTML = `
                <div class="admin-item-header">
                    <strong>Заказ #${escapeHtml(order.id.substring(0, 8))}</strong>
                    <span class="admin-order-status ${safeStatus}">${escapeHtml(order.status)}</span>
                </div>
                <div class="admin-item-details">
                    <span>Клиент: ${escapeHtml((order as any).user?.username || 'Неизвестно')}</span>
                    <span>Сумма: ${escapeHtml(order.total_amount.toString())} ₽</span>
                    <span>Дата: ${escapeHtml(new Date(order.created_at).toLocaleString())}</span>
                    <span>Адрес: ${escapeHtml(order.shipping_address)}</span>
                </div>
                <div class="admin-item-actions">
                    <select class="status-select" data-order-id="${orderId}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Ожидание</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>В обработке</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Отправлен</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Доставлен</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Отменен</option>
                    </select>
                    <button class="admin-btn view-details" data-order-id="${orderId}">🔍 Детали</button>
                </div>
            `;
            
            const statusSelect = div.querySelector('.status-select') as HTMLSelectElement;
            const detailsBtn = div.querySelector('.view-details');
            statusSelect?.addEventListener('change', (e) => {
                this.updateOrderStatus(order.id, (e.target as HTMLSelectElement).value);
            });
            detailsBtn?.addEventListener('click', () => {
                this.viewOrderDetails(order.id);
            });
            
            container.appendChild(div);
        });
    }

    async updateOrderStatus(orderId: string, status: string): Promise<void> {
        try {
            await safeFetch(`${this.shop.API_BASE_URL}/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.shop.token}`
                },
                body: JSON.stringify({ status })
            });

            showToast('Статус обновлен', 'success');
            await this.loadAdminOrders();
        } catch (error: any) {
            showToast(error.message, 'error');
            console.error('Update order status error:', error);
        }
    }

    async viewUserOrders(userId: string): Promise<void> {
        try {
            const response = await safeFetch(`${this.shop.API_BASE_URL}/admin/users/${userId}/orders`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });

            const orders: Order[] = await response.json();
            this.showUserOrdersModal(orders);
        } catch (error: any) {
            showToast(error.message, 'error');
            console.error('View user orders error:', error);
        }
    }

    showUserOrdersModal(orders: Order[]): void {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-hidden', 'false');
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => modal.remove());
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.maxWidth = '600px';
        
        const title = document.createElement('h3');
        title.textContent = 'Заказы пользователя';
        
        const ordersList = document.createElement('div');
        ordersList.style.maxHeight = '400px';
        ordersList.style.overflowY = 'auto';
        ordersList.style.marginTop = '20px';
        
        if (orders.length === 0) {
            ordersList.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">Заказов нет</p>';
        } else {
            orders.forEach(order => {
                const orderDiv = document.createElement('div');
                orderDiv.className = 'order-item';
                orderDiv.style.marginBottom = '15px';
                orderDiv.innerHTML = `
                    <p><strong>Заказ #${escapeHtml(order.id.substring(0, 8))}</strong></p>
                    <p>Сумма: ${escapeHtml(order.total_amount.toString())} ₽</p>
                    <p>Статус: ${escapeHtml(order.status)}</p>
                    <p>Дата: ${escapeHtml(new Date(order.created_at).toLocaleString())}</p>
                `;
                ordersList.appendChild(orderDiv);
            });
        }
        
        content.appendChild(closeBtn);
        content.appendChild(title);
        content.appendChild(ordersList);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async viewOrderDetails(orderId: string): Promise<void> {
        try {
            const response = await safeFetch(`${this.shop.API_BASE_URL}/admin/orders/${orderId}`, {
                headers: { 'Authorization': `Bearer ${this.shop.token}` }
            });

            const order: Order = await response.json();
            this.showOrderDetailsModal(order);
        } catch (error: any) {
            showToast(error.message, 'error');
            console.error('View order details error:', error);
        }
    }

    showOrderDetailsModal(order: Order): void {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-hidden', 'false');
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => modal.remove());
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.maxWidth = '700px';
        
        const title = document.createElement('h3');
        title.textContent = `Детали заказа #${order.id.substring(0, 8)}`;
        
        const details = document.createElement('div');
        details.style.marginTop = '20px';
        details.innerHTML = `
            <div class="order-item">
                <p><strong>ID заказа:</strong> ${escapeHtml(order.id)}</p>
                <p><strong>Клиент:</strong> ${escapeHtml((order as any).user?.username || 'Неизвестно')}</p>
                <p><strong>Email:</strong> ${escapeHtml((order as any).user?.email || 'Не указан')}</p>
                <p><strong>Сумма:</strong> ${escapeHtml(order.total_amount.toString())} ₽</p>
                <p><strong>Статус:</strong> ${escapeHtml(order.status)}</p>
                <p><strong>Адрес доставки:</strong> ${escapeHtml(order.shipping_address)}</p>
                <p><strong>Способ оплаты:</strong> ${escapeHtml((order as any).payment_method || 'Не указан')}</p>
                <p><strong>Дата создания:</strong> ${escapeHtml(new Date(order.created_at).toLocaleString())}</p>
            </div>
            ${order.items && order.items.length > 0 ? `
                <h4 style="margin-top:20px;">Товары:</h4>
                ${order.items.map(item => `
                    <p>${escapeHtml(item.productName || 'Товар')} × ${item.quantity} = ${escapeHtml((item.price * item.quantity).toString())} ₽</p>
                `).join('')}
            ` : ''}
        `;
        
        content.appendChild(closeBtn);
        content.appendChild(title);
        content.appendChild(details);
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
}

