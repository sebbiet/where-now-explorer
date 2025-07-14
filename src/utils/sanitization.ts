/**
 * Input Sanitization Utilities
 * Provides functions to sanitize and validate user inputs
 */

import { getErrorMessage } from './errorMessages';

/**
 * Sanitize text input by removing potentially harmful characters
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags specifically
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove on* event handlers
    .replace(/\bon\w+\s*=/gi, '')
    // Limit length to prevent DoS
    .slice(0, 1000)
    // Trim whitespace
    .trim();
}

/**
 * Validate and sanitize destination search input
 */
export function sanitizeDestination(destination: string): string {
  if (!destination || typeof destination !== 'string') {
    return '';
  }

  const sanitized = sanitizeText(destination);
  
  // Additional validation for destination searches
  if (sanitized.length < 2) {
    throw new Error(getErrorMessage('VALIDATION', 'TOO_SHORT', { field: 'Destination' }));
  }

  if (sanitized.length > 200) {
    throw new Error(getErrorMessage('VALIDATION', 'TOO_LONG', { field: 'Destination search' }));
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./g, // Directory traversal
    /[<>"']/g, // HTML/XML characters
    /\b(script|javascript|vbscript|onload|onerror)\b/gi, // Script injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error(getErrorMessage('VALIDATION', 'INVALID_CHARACTERS'));
    }
  }

  return sanitized;
}

/**
 * Validate coordinates to prevent injection
 */
export function validateCoordinates(lat: number, lng: number): boolean {
  // Check if values are actually numbers
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }

  // Check if values are finite
  if (!isFinite(lat) || !isFinite(lng)) {
    return false;
  }

  // Check coordinate ranges
  if (lat < -90 || lat > 90) {
    return false;
  }

  if (lng < -180 || lng > 180) {
    return false;
  }

  return true;
}

/**
 * Sanitize URL parameters
 */
export function sanitizeUrlParam(param: string): string {
  if (typeof param !== 'string') {
    return '';
  }

  return encodeURIComponent(sanitizeText(param));
}

/**
 * Validate API response data structure
 */
export function validateApiResponse(data: unknown, expectedFields: string[]): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check if all expected fields are present
  for (const field of expectedFields) {
    if (!(field in data)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitize localStorage keys and values
 */
export function sanitizeStorageKey(key: string): string {
  if (typeof key !== 'string') {
    return '';
  }

  return key
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 100);
}

export function sanitizeStorageValue(value: unknown): string {
  try {
    // Ensure the value can be safely serialized
    const serialized = JSON.stringify(value);
    
    // Limit size to prevent storage abuse
    if (serialized.length > 1024 * 100) { // 100KB limit
      throw new Error(getErrorMessage('STORAGE', 'QUOTA_EXCEEDED'));
    }

    return serialized;
  } catch (error) {
    throw new Error(getErrorMessage('STORAGE', 'INVALID_DATA'));
  }
}