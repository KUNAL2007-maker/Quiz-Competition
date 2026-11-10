/**
 * Robust phone and WhatsApp number validation.
 * Prevents submission of dummy sequences, repetitive digits, random runs,
 * and invalid mobile prefixes so tournament winners can be contacted.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  normalized?: string;
}

/**
 * Validates whether the given string is a genuine, valid WhatsApp contact number.
 */
export function validateWhatsAppNumber(input: string | undefined | null): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      error: 'WhatsApp contact number is required for tournament verification and prize distribution.',
    };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'WhatsApp contact number cannot be empty.',
    };
  }

  // Strip all non-digit characters except leading plus
  const hasLeadingPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  // 1. Length check: ITU-T E.164 specifies max 15 digits; mobile numbers require at least 10 digits
  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      error: 'Phone number is too short. Please include a complete 10-digit mobile number with country code.',
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      error: 'Phone number exceeds maximum length of 15 digits.',
    };
  }

  // 2. Reject all identical digits (e.g. 0000000000, 1111111111, 9999999999)
  const firstDigit = digitsOnly[0];
  if (digitsOnly.split('').every((d) => d === firstDigit)) {
    return {
      isValid: false,
      error: 'Please enter a genuine WhatsApp number (repeated identical digits are not allowed).',
    };
  }

  // 3. Reject numbers with fewer than 4 unique digits (e.g. 1212121212, 9999988888, 1122331122)
  const uniqueDigits = new Set(digitsOnly.split(''));
  if (uniqueDigits.size < 4) {
    return {
      isValid: false,
      error: 'Please enter a genuine WhatsApp number (insufficient unique digits detected).',
    };
  }

  // 4. Reject common sequential and dummy sequences
  const knownDummies = [
    '0123456789',
    '1234567890',
    '2345678901',
    '9876543210',
    '0987654321',
    '8765432109',
    '1231231234',
    '1234512345',
  ];
  if (knownDummies.some((dummy) => digitsOnly.includes(dummy))) {
    return {
      isValid: false,
      error: 'Please enter your genuine WhatsApp contact number (random sequential patterns are not permitted).',
    };
  }

  // 5. Inspect national 10-digit portion
  // If 10 digits: check Indian/standard mobile format
  if (digitsOnly.length === 10) {
    const startDigit = digitsOnly[0];
    if (!['6', '7', '8', '9'].includes(startDigit)) {
      return {
        isValid: false,
        error: 'Standard 10-digit mobile numbers must start with 6, 7, 8, or 9 (e.g. +91 9876543210).',
      };
    }
  }

  // If 12 digits starting with '91' (India country code without '+')
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const nationalFirstDigit = digitsOnly[2];
    if (!['6', '7', '8', '9'].includes(nationalFirstDigit)) {
      return {
        isValid: false,
        error: 'Indian mobile numbers after country code +91 must start with 6, 7, 8, or 9.',
      };
    }
  }

  // If 11 digits starting with '0' (leading trunk prefix in India/UK)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    const nationalFirstDigit = digitsOnly[1];
    if (!['6', '7', '8', '9'].includes(nationalFirstDigit)) {
      return {
        isValid: false,
        error: 'Please enter a valid mobile number with country code.',
      };
    }
  }

  const normalized = hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;

  return {
    isValid: true,
    normalized,
  };
}
