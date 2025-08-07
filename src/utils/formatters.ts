/**
 * Formats a number as a currency string in RUB.
 * Handles null/undefined values.
 * @param num The number to format.
 * @returns A formatted currency string (e.g., "1 234 ₽") or "0 ₽" if the input is null/undefined.
 */
export const formatCurrency = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Formats a number as a string with thousand separators.
 * Handles null/undefined values.
 * @param num The number to format.
 * @returns A formatted number string (e.g., "1 234") or "0" if the input is null/undefined.
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('ru-RU').format(num);
};

/**
 * Formats a number as a percentage string with a sign.
 * Handles null/undefined values.
 * @param num The number to format.
 * @returns A formatted percentage string (e.g., "+10.5%").
 */
export const formatPercent = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0.0%';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
};

/**
 * Returns a Tailwind CSS color class based on the percentage value.
 * @param percent The percentage value.
 * @returns A string with Tailwind CSS classes for text color.
 */
export const getPercentColor = (percent: number | null | undefined): string => {
  if (percent === null || percent === undefined) return 'text-gray-600 dark:text-gray-400';
  if (percent > 0) return 'text-green-600 dark:text-green-400';
  if (percent < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
};