// validators.ts - Модуль валидации
import type { ValidationResult, FormValidationResult, RegisterData, LoginData } from './types';

export function validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

export function validateUsername(username: string, minLength: number = 3, maxLength: number = 50): ValidationResult {
    if (!username || typeof username !== 'string') {
        return { valid: false, error: 'Имя пользователя обязательно' };
    }
    
    const trimmed = username.trim();
    
    if (trimmed.length < minLength) {
        return { valid: false, error: `Имя пользователя должно быть не менее ${minLength} символов` };
    }
    
    if (trimmed.length > maxLength) {
        return { valid: false, error: `Имя пользователя должно быть не более ${maxLength} символов` };
    }
    
    const usernameRegex = /^[a-zA-Zа-яА-ЯёЁ0-9_-]+$/;
    if (!usernameRegex.test(trimmed)) {
        return { valid: false, error: 'Имя пользователя может содержать только буквы, цифры, подчеркивание и дефис' };
    }
    
    return { valid: true };
}

export function validatePassword(password: string, minLength: number = 6, maxLength: number = 100): ValidationResult {
    if (!password || typeof password !== 'string') {
        return { valid: false, error: 'Пароль обязателен' };
    }
    
    if (password.length < minLength) {
        return { valid: false, error: `Пароль должен быть не менее ${minLength} символов` };
    }
    
    if (password.length > maxLength) {
        return { valid: false, error: `Пароль должен быть не более ${maxLength} символов` };
    }
    
    return { valid: true };
}

export function validatePasswordMatch(password: string, password2: string): ValidationResult {
    if (!password || !password2) {
        return { valid: false, error: 'Оба поля пароля обязательны' };
    }
    
    if (password !== password2) {
        return { valid: false, error: 'Пароли не совпадают' };
    }
    
    return { valid: true };
}

export function validateVerificationCode(code: string, length: number = 6): ValidationResult {
    if (!code || typeof code !== 'string') {
        return { valid: false, error: `Введите ${length}-значный код` };
    }
    
    const trimmed = code.trim();
    const codeRegex = new RegExp(`^\\d{${length}}$`);
    
    if (!codeRegex.test(trimmed)) {
        return { valid: false, error: `Код должен состоять из ${length} цифр` };
    }
    
    return { valid: true };
}

export function validateFullName(fullName: string, maxLength: number = 100): ValidationResult {
    if (!fullName || fullName.trim().length === 0) {
        return { valid: true }; // Полное имя необязательно
    }
    
    if (fullName.trim().length > maxLength) {
        return { valid: false, error: `Полное имя должно быть не более ${maxLength} символов` };
    }
    
    return { valid: true };
}

export function validateAddress(address: string, minLength: number = 5): ValidationResult {
    if (!address || typeof address !== 'string') {
        return { valid: false, error: 'Адрес обязателен' };
    }
    
    const trimmed = address.trim();
    
    if (trimmed.length < minLength) {
        return { valid: false, error: `Адрес должен быть не менее ${minLength} символов` };
    }
    
    return { valid: true };
}

export function validateRegistrationForm(data: RegisterData): FormValidationResult {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    const usernameResult = validateUsername(data.username);
    if (!usernameResult.valid) {
        errors.username = usernameResult.error || '';
        isValid = false;
    }
    
    if (!validateEmail(data.email)) {
        errors.email = 'Неверный формат email';
        isValid = false;
    }
    
    const passwordResult = validatePassword(data.password);
    if (!passwordResult.valid) {
        errors.password = passwordResult.error || '';
        isValid = false;
    }
    
    const passwordMatchResult = validatePasswordMatch(data.password, data.password);
    if (!passwordMatchResult.valid && data.password) {
        errors.password2 = passwordMatchResult.error || '';
        isValid = false;
    }
    
    if (data.fullName) {
        const fullNameResult = validateFullName(data.fullName);
        if (!fullNameResult.valid) {
            errors.fullName = fullNameResult.error || '';
            isValid = false;
        }
    }
    
    return { valid: isValid, errors };
}

export function validateLoginForm(data: LoginData): FormValidationResult {
    const errors: Record<string, string> = {};
    let isValid = true;
    
    if (!data.usernameOrEmail || data.usernameOrEmail.trim().length === 0) {
        errors.usernameOrEmail = 'Введите имя пользователя или email';
        isValid = false;
    }
    
    if (!data.password || data.password.length === 0) {
        errors.password = 'Введите пароль';
        isValid = false;
    }
    
    return { valid: isValid, errors };
}

export function isEmail(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

