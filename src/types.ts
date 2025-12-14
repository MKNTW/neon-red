// types.ts - TypeScript типы для проекта

export interface User {
    id: string;
    username: string;
    email: string;
    fullName: string | null;
    isAdmin: boolean;
    created_at: string;
    email_verified?: boolean;
}

export interface Product {
    id: string;
    title: string;
    description: string | null;
    price: number;
    quantity: number;
    image_url: string | null;
    image_path: string | null;
    featured: boolean;
    created_at: string;
}

export interface CartItem extends Product {
    quantity: number; // Количество в корзине
}

export interface Order {
    id: string;
    user_id: string;
    total_amount: number;
    status: string;
    shipping_address: string;
    payment_method: string;
    created_at: string;
    items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price: number;
    product?: Product;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

export interface FormValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    fullName?: string;
}

export interface LoginData {
    usernameOrEmail: string;
    password: string;
}

export interface ApiResponse<T = any> {
    success?: boolean;
    error?: string;
    message?: string;
    data?: T;
    [key: string]: any;
}

export interface PaginatedResponse<T> {
    products?: T[];
    items?: T[];
    currentPage: number;
    totalPages: number;
    totalProducts?: number;
    total?: number;
}

export interface NeonShopConfig {
    API_BASE_URL: string;
    isMobile: boolean;
}

