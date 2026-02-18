/**
 * DRAG UTILITIES - Shared coordinate conversion for drag operations
 * 
 * Solves: "Jump" on drag start caused by mixing coordinate systems
 * Solution: Single source of truth for pointer -> local coords conversion
 */

/**
 * Convert pointer (mouse) coordinates to local coordinates of a container element.
 * Handles CSS transforms (scale, translate, zoom) correctly.
 * 
 * @param {MouseEvent} e - Mouse event with clientX/clientY
 * @param {HTMLElement} containerEl - Container element (workspace root, grid root, etc.)
 * @returns {{ x: number, y: number }} Local coordinates within the container
 */
export const getLocalPointer = (e, containerEl) => {
  if (!containerEl) {
    return { x: e.clientX, y: e.clientY };
  }
  
  const rect = containerEl.getBoundingClientRect();
  
  // Calculate scale factors (handles CSS transform: scale())
  // offsetWidth/offsetHeight = original size before CSS transforms
  // rect.width/rect.height = rendered size after CSS transforms
  const offsetWidth = containerEl.offsetWidth || rect.width;
  const offsetHeight = containerEl.offsetHeight || rect.height;
  
  // Guard: prevent division by zero
  const scaleX = offsetWidth > 0 ? rect.width / offsetWidth : 1;
  const scaleY = offsetHeight > 0 ? rect.height / offsetHeight : 1;
  
  // Convert client coords to local coords, accounting for scale
  const localX = (e.clientX - rect.left) / (scaleX || 1);
  const localY = (e.clientY - rect.top) / (scaleY || 1);
  
  return { x: localX, y: localY };
};

/**
 * Validate if a number is safe for position calculations
 * @param {number} num - Number to validate
 * @returns {boolean} True if valid
 */
export const isValidNumber = (num) => {
  return typeof num === 'number' && isFinite(num) && Math.abs(num) < 100000;
};

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export const clamp = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};
