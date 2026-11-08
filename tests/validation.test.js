import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, validateAuth } from '../src/cabinet/validation.js';

test('Uzbek phone input normalizes consistently and rejects malformed numbers', () => {
  for (const input of ['+998 (90) 123-45-67', '998901234567', '901234567']) assert.equal(normalizePhone(input), '+998901234567');
  for (const input of ['', '+99890', '123456789012345', '+79012345678']) assert.equal(normalizePhone(input), null);
});
test('registration rejects blank names, short passwords and a mismatched confirmation', () => {
  const errors = validateAuth({ firstName: ' ', lastName: 'A', phone: '123', password: 'short', confirm: 'different' }, true);
  assert.deepEqual(Object.keys(errors).sort(), ['confirm', 'firstName', 'lastName', 'password', 'phone']);
});
test('login does not apply new-password length requirements to an existing password', () => {
  assert.deepEqual(validateAuth({ phone: '+998901234567', password: 'oldpass' }), {});
  assert.equal(validateAuth({ phone: '+998901234567', password: '' }).password, 'Parolingizni kiriting.');
});
