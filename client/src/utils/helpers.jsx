// client/src/utils/helpers.js

/**
 * Formats a number as Philippine Peso (PHP) currency.
 * @param {number} amount - The number to format.
 * @returns {string} The formatted currency string (e.g., "₱1,234.50").
 */
export const formatPrice = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₱0.00';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
};

/**
 * Formats a date string into a more readable format.
 * @param {string} dateString - The ISO date string to format.
 * @returns {string} The formatted date (e.g., "October 24, 2025").
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error("Invalid date string:", dateString, error);
    return 'Invalid Date';
  }
};