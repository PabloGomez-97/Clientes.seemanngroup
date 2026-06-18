import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldResetNotificationRead } from './portal-notifications.js';

describe('shouldResetNotificationRead', () => {
  it('marca como no leída si no existe documento previo', () => {
    assert.equal(
      shouldResetNotificationRead(null, { type: 'QUOTE_COMPLETED' }),
      true,
    );
  });

  it('conserva leída si el contenido no cambió', () => {
    const existing = {
      audience: 'EJECUTIVO',
      recipientEmail: 'ej@corp.com',
      type: 'QUOTE_COMPLETED',
      dedupKey: 'QUOTE:s1',
      read: true,
      payload: { route: '/admin/home' },
    };
    const incoming = {
      audience: 'EJECUTIVO',
      recipientEmail: 'ej@corp.com',
      type: 'QUOTE_COMPLETED',
      dedupKey: 'QUOTE:s1',
      payload: { route: '/admin/home' },
    };
    assert.equal(shouldResetNotificationRead(existing, incoming), false);
  });

  it('resetea leída si cambia el payload', () => {
    const existing = {
      audience: 'EJECUTIVO',
      recipientEmail: 'ej@corp.com',
      type: 'QUOTE_COMPLETED',
      dedupKey: 'QUOTE:s1',
      read: true,
      payload: { route: '/admin/home' },
    };
    const incoming = {
      audience: 'EJECUTIVO',
      recipientEmail: 'ej@corp.com',
      type: 'QUOTE_COMPLETED',
      dedupKey: 'QUOTE:s1',
      payload: { route: '/admin/clientes/reporteria/acme' },
    };
    assert.equal(shouldResetNotificationRead(existing, incoming), true);
  });
});
