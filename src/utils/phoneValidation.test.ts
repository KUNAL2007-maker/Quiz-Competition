import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWhatsAppNumber } from './phoneValidation.ts';

test('validateWhatsAppNumber accepts genuine 10-digit mobile numbers starting with 6, 7, 8, or 9', () => {
  assert.equal(validateWhatsAppNumber('9845123490').isValid, true);
  assert.equal(validateWhatsAppNumber('8765432198').isValid, true);
  assert.equal(validateWhatsAppNumber('7019823456').isValid, true);
  assert.equal(validateWhatsAppNumber('6361234567').isValid, true);
});

test('validateWhatsAppNumber accepts valid formatted numbers with +91 country code and spaces/dashes', () => {
  assert.equal(validateWhatsAppNumber('+91 98451 23490').isValid, true);
  assert.equal(validateWhatsAppNumber('+91-98765-43219').isValid, true);
  assert.equal(validateWhatsAppNumber('+919845123490').isValid, true);
});

test('validateWhatsAppNumber accepts valid international numbers', () => {
  assert.equal(validateWhatsAppNumber('+1 415 555 2671').isValid, true);
  assert.equal(validateWhatsAppNumber('+44 7911 123456').isValid, true);
  assert.equal(validateWhatsAppNumber('+971 50 123 4567').isValid, true);
});

test('validateWhatsAppNumber rejects empty or whitespace inputs', () => {
  assert.equal(validateWhatsAppNumber('').isValid, false);
  assert.equal(validateWhatsAppNumber('   ').isValid, false);
  assert.equal(validateWhatsAppNumber(undefined as any).isValid, false);
});

test('validateWhatsAppNumber rejects numbers that are too short or too long', () => {
  assert.equal(validateWhatsAppNumber('12345').isValid, false);
  assert.equal(validateWhatsAppNumber('984512').isValid, false);
  assert.equal(validateWhatsAppNumber('+12345678901234567').isValid, false);
});

test('validateWhatsAppNumber rejects all identical digits', () => {
  assert.equal(validateWhatsAppNumber('0000000000').isValid, false);
  assert.equal(validateWhatsAppNumber('1111111111').isValid, false);
  assert.equal(validateWhatsAppNumber('9999999999').isValid, false);
});

test('validateWhatsAppNumber rejects numbers with fewer than 4 unique digits', () => {
  assert.equal(validateWhatsAppNumber('1212121212').isValid, false);
  assert.equal(validateWhatsAppNumber('9999988888').isValid, false);
});

test('validateWhatsAppNumber rejects common dummy and sequential sequences', () => {
  assert.equal(validateWhatsAppNumber('1234567890').isValid, false);
  assert.equal(validateWhatsAppNumber('0123456789').isValid, false);
  assert.equal(validateWhatsAppNumber('9876543210').isValid, false);
  assert.equal(validateWhatsAppNumber('1231231234').isValid, false);
});

test('validateWhatsAppNumber rejects 10-digit Indian numbers starting with invalid prefixes', () => {
  assert.equal(validateWhatsAppNumber('1456789012').isValid, false);
  assert.equal(validateWhatsAppNumber('2456789012').isValid, false);
  assert.equal(validateWhatsAppNumber('3456789012').isValid, false);
  assert.equal(validateWhatsAppNumber('4456789012').isValid, false);
  assert.equal(validateWhatsAppNumber('5456789012').isValid, false);
});
