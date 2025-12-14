// types.d.ts - JSDoc типы для лучшей поддержки IDE (без полной миграции на TypeScript)

/**
 * @typedef {Object} User
 * @property {string} id - ID пользователя
 * @property {string} username - Имя пользователя
 * @property {string} email - Email
 * @property {string|null} fullName - Полное имя
 * @property {boolean} isAdmin - Является ли администратором
 * @property {string} created_at - Дата создания
 */

/**
 * @typedef {Object} Product
 * @property {string} id - ID товара
 * @property {string} title - Название товара
 * @property {string} description - Описание товара
 * @property {number} price - Цена товара
 * @property {number} quantity - Количество в наличии
 * @property {string|null} image_url - URL изображения
 * @property {string|null} image_path - Путь к изображению
 * @property {boolean} featured - Является ли товар рекомендуемым
 * @property {string} created_at - Дата создания
 */

/**
 * @typedef {Object} CartItem
 * @property {string} id - ID товара
 * @property {string} title - Название товара
 * @property {number} price - Цена товара
 * @property {number} quantity - Количество в корзине
 * @property {string|null} image_url - URL изображения
 */

/**
 * @typedef {Object} Order
 * @property {string} id - ID заказа
 * @property {string} user_id - ID пользователя
 * @property {number} total_amount - Общая сумма заказа
 * @property {string} status - Статус заказа
 * @property {string} shipping_address - Адрес доставки
 * @property {string} created_at - Дата создания
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Валидны ли данные
 * @property {string} [error] - Сообщение об ошибке
 */

/**
 * @typedef {Object} FormValidationResult
 * @property {boolean} valid - Валидна ли форма
 * @property {Object<string, string>} errors - Объект с ошибками по полям
 */

