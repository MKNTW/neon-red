// utils.js - Утилиты и вспомогательные функции

/**
 * Экранирование HTML для защиты от XSS
 * @param {string|null|undefined} text - Текст для экранирования
 * @returns {string} - Экранированный текст
 */
export function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Экранирование атрибутов HTML
 * @param {string|null|undefined} text - Текст для экранирования
 * @returns {string} - Экранированный текст
 */
export function escapeAttr(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Глобальный индикатор загрузки
let loadingIndicator = null;

export function showLoadingIndicator() {
    if (loadingIndicator) return;
    
    loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'global-loading';
    loadingIndicator.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
        </div>
    `;
    document.body.appendChild(loadingIndicator);
}

export function hideLoadingIndicator() {
    if (loadingIndicator) {
        loadingIndicator.remove();
        loadingIndicator = null;
    }
}

/**
 * Универсальная функция для fetch запросов с обработкой ошибок
 * @param {string} url - URL для запроса
 * @param {RequestInit & {showLoading?: boolean}} options - Опции запроса
 * @returns {Promise<Response>} - Ответ сервера
 * @throws {Error} - Ошибка при запросе
 */
export async function safeFetch(url, options = {}) {
    const FETCH_TIMEOUT_MS = 60 * 1000; // 60 секунд таймаут для слабого соединения
    const MAX_RETRIES = 3; // Максимум 3 попытки
    const RETRY_DELAY_MS = 1000; // Задержка между попытками
    
    let lastError = null;
    
    // Показываем индикатор загрузки только для не-GET запросов или если явно указано
    const showLoading = options.method && options.method !== 'GET' || options.showLoading === true;
    
    // Логирование для отладки
    if (options.method && options.method !== 'GET') {
        console.log(`[safeFetch] ${options.method} ${url}`);
    }
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        
        if (showLoading && attempt === 0) {
            showLoadingIndicator();
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                credentials: 'include',
                // Добавляем keepalive для лучшей работы на слабом соединении
                keepalive: true
            });
            
            clearTimeout(timeoutId);
            
            // Если ответ не OK, пытаемся получить сообщение об ошибке
            if (!response.ok) {
                let errorMessage = `Ошибка ${response.status}`;
                let errorData = null;
                try {
                    errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // Если не удалось распарсить JSON, используем статус
                    if (response.status === 401) errorMessage = 'Требуется авторизация';
                    else if (response.status === 403) errorMessage = 'Доступ запрещен';
                    else if (response.status === 404) errorMessage = `Ресурс не найден: ${url}`;
                    else if (response.status === 400) errorMessage = 'Неверный запрос';
                    else if (response.status === 409) errorMessage = 'Конфликт данных';
                    else if (response.status === 429) errorMessage = 'Слишком много запросов';
                    else if (response.status === 500) errorMessage = 'Ошибка сервера';
                }
                
                // Для ошибок сервера (5xx) или сетевых ошибок - повторяем попытку
                // Для клиентских ошибок (4xx) - не повторяем
                if (response.status >= 500 || response.status === 0) {
                    if (attempt < MAX_RETRIES - 1) {
                        console.log(`[safeFetch] Retry ${attempt + 1}/${MAX_RETRIES} for ${url}`);
                        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
                        continue;
                    }
                }
                
                // Сохраняем данные ошибки для дальнейшей обработки
                const error = new Error(errorMessage);
                error.status = response.status;
                error.data = errorData;
                error.url = url;
                
                console.error(`[safeFetch] Error ${response.status} for ${url}:`, errorMessage);
                throw error;
            }
            
            if (showLoading) {
                hideLoadingIndicator();
            }
            
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            
            // Для сетевых ошибок и таймаутов - повторяем попытку
            if ((error.name === 'AbortError' || 
                 (error instanceof TypeError && error.message.includes('fetch'))) &&
                attempt < MAX_RETRIES - 1) {
                lastError = error;
                console.log(`[safeFetch] Network error, retry ${attempt + 1}/${MAX_RETRIES} for ${url}`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
                continue;
            }
            
            // Если все попытки исчерпаны или это не сетевая ошибка
            if (showLoading) {
                hideLoadingIndicator();
            }
            
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания запроса. Проверьте подключение к интернету');
            }
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error(`[safeFetch] Network error for ${url}:`, error);
                throw new Error('Ошибка сети. Проверьте подключение к интернету');
            }
            throw error;
        }
    }
    
    // Если все попытки исчерпаны
    if (showLoading) {
        hideLoadingIndicator();
    }
    
    if (lastError) {
        if (lastError.name === 'AbortError') {
            throw new Error('Превышено время ожидания запроса. Проверьте подключение к интернету');
        }
        throw new Error('Ошибка сети после нескольких попыток. Проверьте подключение к интернету');
    }
    
    throw new Error('Неизвестная ошибка при выполнении запроса');
}

/**
 * Показ уведомлений (Toast)
 * @param {string} message - Сообщение для отображения
 * @param {'success'|'error'|'info'} type - Тип уведомления
 * @param {number} duration - Длительность отображения в миллисекундах
 */
export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toastId = `toast-${Date.now()}`;
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'i';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-message';
    messageDiv.textContent = message;
    
    const progress = document.createElement('div');
    progress.className = 'toast-progress';
    progress.style.animationDuration = `${duration}ms`;
    
    toast.appendChild(icon);
    toast.appendChild(messageDiv);
    toast.appendChild(progress);

    container.appendChild(toast);

    // Для мобильных устройств используем requestAnimationFrame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    const timer = setTimeout(() => {
        removeToast(toastId);
    }, duration);

    // Закрытие по тапу на мобильных
    toast.addEventListener('click', () => {
        clearTimeout(timer);
        removeToast(toastId);
    });

    // Вибрация на мобильных при ошибке
    if (type === 'error' && 'vibrate' in navigator) {
        navigator.vibrate(100);
    }
}

export function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;

    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
}

export function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        // Не закрываем модалку проверки возраста
        if (modal.id === 'age-verification-modal') {
            return;
        }
        modal.style.display = 'none';
    });
    document.body.style.overflow = '';
}

export function checkIsMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

export function preventDoubleTapZoom() {
    let lastTouchEnd = 0;

    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
}

export function setupSwipeGestures(closeAllModalsCallback) {
    let touchStartX = 0;
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!touchStartX || !touchStartY) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;

        // Горизонтальный свайп (только если вертикальное движение минимально)
        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30) {
            // Свайп влево для закрытия модальных окон
            if (diffX > 0) {
                closeAllModalsCallback();
            }
        }

        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });
}

export function getApiBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001/api';
    } else if (window.location.hostname === 'shop.mkntw.xyz' || window.location.hostname.includes('mkntw.xyz')) {
        return 'https://apiforshop.mkntw.xyz/api';
    } else {
        return 'https://apiforshop.mkntw.xyz/api';
    }
}

