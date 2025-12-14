// utils.ts - Утилиты и вспомогательные функции
import type { ValidationResult } from './types';

export function escapeHtml(text: string | null | undefined): string {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function escapeAttr(text: string | null | undefined): string {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

let loadingIndicator: HTMLElement | null = null;

export function showLoadingIndicator(): void {
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

export function hideLoadingIndicator(): void {
    if (loadingIndicator) {
        loadingIndicator.remove();
        loadingIndicator = null;
    }
}

interface FetchOptions extends RequestInit {
    showLoading?: boolean;
}

export async function safeFetch(url: string, options: FetchOptions = {}): Promise<Response> {
    const FETCH_TIMEOUT_MS = 30 * 1000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    const showLoading = (options.method && options.method !== 'GET') || options.showLoading === true;
    if (showLoading) {
        showLoadingIndicator();
    }
    
    if (options.method && options.method !== 'GET') {
        console.log(`[safeFetch] ${options.method} ${url}`);
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            credentials: 'include'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            let errorMessage = `Ошибка ${response.status}`;
            let errorData: any = null;
            try {
                errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
                if (response.status === 401) errorMessage = 'Требуется авторизация';
                else if (response.status === 403) errorMessage = 'Доступ запрещен';
                else if (response.status === 404) errorMessage = `Ресурс не найден: ${url}`;
                else if (response.status === 400) errorMessage = 'Неверный запрос';
                else if (response.status === 409) errorMessage = 'Конфликт данных';
                else if (response.status === 429) errorMessage = 'Слишком много запросов';
                else if (response.status === 500) errorMessage = 'Ошибка сервера';
            }
            
            const error = new Error(errorMessage) as Error & { status?: number; data?: any; url?: string };
            error.status = response.status;
            error.data = errorData;
            error.url = url;
            
            console.error(`[safeFetch] Error ${response.status} for ${url}:`, errorMessage);
            throw error;
        }
        
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if ((error as Error).name === 'AbortError') {
            throw new Error('Превышено время ожидания запроса');
        }
        if (error instanceof TypeError && (error as Error).message.includes('fetch')) {
            console.error(`[safeFetch] Network error for ${url}:`, error);
            throw new Error('Ошибка сети. Проверьте подключение к интернету');
        }
        throw error;
    } finally {
        if (showLoading) {
            hideLoadingIndicator();
        }
    }
}

export type ToastType = 'success' | 'error' | 'info';

export function showToast(message: string, type: ToastType = 'success', duration: number = 3000): void {
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

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    const timer = setTimeout(() => {
        removeToast(toastId);
    }, duration);

    toast.addEventListener('click', () => {
        clearTimeout(timer);
        removeToast(toastId);
    });

    if (type === 'error' && 'vibrate' in navigator) {
        (navigator as any).vibrate(100);
    }
}

export function removeToast(toastId: string): void {
    const toast = document.getElementById(toastId);
    if (!toast) return;

    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
}

export function closeAllModals(): void {
    document.querySelectorAll('.modal').forEach(modal => {
        (modal as HTMLElement).style.display = 'none';
    });
    document.body.style.overflow = '';
}

export function checkIsMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
}

export function preventDoubleTapZoom(): void {
    let lastTouchEnd = 0;

    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });
}

export function setupSwipeGestures(closeAllModalsCallback: () => void): void {
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

        if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30) {
            if (diffX > 0) {
                closeAllModalsCallback();
            }
        }

        touchStartX = 0;
        touchStartY = 0;
    }, { passive: true });
}

export function getApiBaseUrl(): string {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3001/api';
    } else if (window.location.hostname === 'shop.mkntw.xyz' || window.location.hostname.includes('mkntw.xyz')) {
        return 'https://apiforshop.mkntw.xyz/api';
    } else {
        return 'https://apiforshop.mkntw.xyz/api';
    }
}

