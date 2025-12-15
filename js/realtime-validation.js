// realtime-validation.js - Валидация форм в реальном времени
import { validateEmail, isEmail } from './validators.js';
import { showFieldError, hideFieldError } from './utils.js';

/**
 * Настройка валидации в реальном времени для полей регистрации
 */
export function setupRealtimeValidation() {
    // Валидация имени пользователя
    const usernameInput = document.getElementById('register-username');
    if (usernameInput) {
        let usernameTimeout;
        usernameInput.addEventListener('input', (e) => {
            clearTimeout(usernameTimeout);
            const value = e.target.value.trim();
            
            if (value.length === 0) {
                hideFieldError('username-error');
                return;
            }
            
            // Валидация после небольшой задержки (debounce)
            usernameTimeout = setTimeout(() => {
                if (value.length < 3) {
                    showFieldError('username-error', 'Имя пользователя должно быть не менее 3 символов');
                    usernameInput.setAttribute('aria-invalid', 'true');
                } else if (value.length > 20) {
                    showFieldError('username-error', 'Имя пользователя должно быть не более 20 символов');
                    usernameInput.setAttribute('aria-invalid', 'true');
                } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
                    showFieldError('username-error', 'Имя пользователя может содержать только буквы, цифры и подчеркивание');
                    usernameInput.setAttribute('aria-invalid', 'true');
                } else {
                    hideFieldError('username-error');
                    usernameInput.setAttribute('aria-invalid', 'false');
                }
            }, 300);
        });
        
        usernameInput.addEventListener('blur', () => {
            clearTimeout(usernameTimeout);
        });
    }
    
    // Валидация email
    const emailInput = document.getElementById('register-email');
    if (emailInput) {
        let emailTimeout;
        emailInput.addEventListener('input', (e) => {
            clearTimeout(emailTimeout);
            const value = e.target.value.trim();
            
            if (value.length === 0) {
                hideFieldError('email-error');
                return;
            }
            
            emailTimeout = setTimeout(() => {
                if (!validateEmail(value)) {
                    showFieldError('email-error', 'Неверный формат email');
                    emailInput.setAttribute('aria-invalid', 'true');
                } else {
                    hideFieldError('email-error');
                    emailInput.setAttribute('aria-invalid', 'false');
                }
            }, 300);
        });
        
        emailInput.addEventListener('blur', () => {
            clearTimeout(emailTimeout);
        });
    }
    
    // Валидация пароля с индикатором силы
    const passwordInput = document.getElementById('register-password');
    const password2Input = document.getElementById('register-password2');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const value = e.target.value;
            updatePasswordStrength(value);
            validatePasswordMatch();
        });
    }
    
    if (password2Input) {
        password2Input.addEventListener('input', () => {
            validatePasswordMatch();
        });
    }
    
    // Валидация кода подтверждения
    const codeInput = document.getElementById('register-code');
    if (codeInput) {
        codeInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            const codeError = document.getElementById('code-error');
            
            if (value.length === 0) {
                if (codeError) {
                    codeError.textContent = '';
                    codeError.style.display = 'none';
                }
                codeInput.setAttribute('aria-invalid', 'false');
            } else if (value.length !== 6 || !/^\d{6}$/.test(value)) {
                if (codeError) {
                    codeError.textContent = 'Введите 6-значный код';
                    codeError.style.display = 'block';
                }
                codeInput.setAttribute('aria-invalid', 'true');
            } else {
                if (codeError) {
                    codeError.textContent = '';
                    codeError.style.display = 'none';
                }
                codeInput.setAttribute('aria-invalid', 'false');
            }
        });
    }
    
    // Валидация полного имени
    const fullNameInput = document.getElementById('register-fullname');
    if (fullNameInput) {
        fullNameInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length > 0 && value.length < 2) {
                showFieldError('fullname-error', 'Полное имя должно быть не менее 2 символов');
                fullNameInput.setAttribute('aria-invalid', 'true');
            } else {
                hideFieldError('fullname-error');
                fullNameInput.setAttribute('aria-invalid', 'false');
            }
        });
    }
}

/**
 * Обновление индикатора силы пароля
 */
function updatePasswordStrength(password) {
    const passwordInput = document.getElementById('register-password');
    if (!passwordInput) return;
    
    let strength = 0;
    let strengthText = '';
    let strengthColor = '';
    
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 1) {
        strengthText = 'Слабый';
        strengthColor = '#ff0033';
    } else if (strength <= 3) {
        strengthText = 'Средний';
        strengthColor = '#ffaa00';
    } else {
        strengthText = 'Сильный';
        strengthColor = '#00ff88';
    }
    
    // Создаем или обновляем индикатор силы пароля
    let strengthIndicator = document.getElementById('password-strength-indicator');
    if (!strengthIndicator) {
        strengthIndicator = document.createElement('div');
        strengthIndicator.id = 'password-strength-indicator';
        strengthIndicator.className = 'password-strength-indicator';
        strengthIndicator.style.cssText = 'margin-top: 8px; font-size: 0.85rem;';
        
        const passwordGroup = passwordInput.closest('.input-group');
        if (passwordGroup) {
            passwordGroup.appendChild(strengthIndicator);
        }
    }
    
    if (password.length > 0) {
        strengthIndicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span>Сила пароля:</span>
                <span style="color: ${strengthColor}; font-weight: 600;">${strengthText}</span>
                <div style="flex: 1; height: 4px; background: var(--border-color); border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; width: ${(strength / 5) * 100}%; background: ${strengthColor}; transition: width 0.3s;"></div>
                </div>
            </div>
        `;
        strengthIndicator.setAttribute('aria-live', 'polite');
    } else {
        strengthIndicator.innerHTML = '';
    }
}

/**
 * Валидация совпадения паролей
 */
function validatePasswordMatch() {
    const passwordInput = document.getElementById('register-password');
    const password2Input = document.getElementById('register-password2');
    
    if (!passwordInput || !password2Input) return;
    
    const password = passwordInput.value;
    const password2 = password2Input.value;
    const passwordError = document.getElementById('password-error');
    
    if (password2.length === 0) {
        if (passwordError) {
            passwordError.textContent = '';
            passwordError.style.display = 'none';
        }
        password2Input.setAttribute('aria-invalid', 'false');
        return;
    }
    
    if (password !== password2) {
        if (passwordError) {
            passwordError.textContent = 'Пароли не совпадают';
            passwordError.style.display = 'block';
        }
        password2Input.setAttribute('aria-invalid', 'true');
    } else {
        if (passwordError && password.length >= 6) {
            passwordError.textContent = '';
            passwordError.style.display = 'none';
        }
        password2Input.setAttribute('aria-invalid', 'false');
    }
}

/**
 * Настройка валидации для формы входа
 */
export function setupLoginValidation() {
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    
    if (usernameInput) {
        usernameInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value.length > 0) {
                usernameInput.setAttribute('aria-invalid', 'false');
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length > 0) {
                passwordInput.setAttribute('aria-invalid', 'false');
            }
        });
    }
}

