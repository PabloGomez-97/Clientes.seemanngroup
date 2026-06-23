import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildNotificationNavigation,
  isVisibleInNotificationBell,
  resolveNotificationRoute,
} from '../src/lib/notification-navigation.js';

describe('isVisibleInNotificationBell', () => {
  it('oculta CLIENT_COLD', () => {
    assert.equal(isVisibleInNotificationBell('CLIENT_COLD'), false);
    assert.equal(isVisibleInNotificationBell('QUOTE_COMPLETED'), true);
  });
});

describe('resolveNotificationRoute', () => {
  it('mapea ruta legacy de comportamiento', () => {
    const route = resolveNotificationRoute({
      clientUsername: 'acme',
      payload: { route: '/admin/comportamiento-clientes' },
    });
    assert.equal(route, '/admin/clientes/comportamiento/acme');
  });

  it('lleva cotización con número a reportería', () => {
    const route = resolveNotificationRoute({
      clientUsername: 'acme',
      quoteNumber: 'Q-123',
      payload: { route: '/admin/clientes/comportamiento/acme' },
    });
    assert.equal(route, '/admin/clientes/reporteria/acme');
  });
});

describe('buildNotificationNavigation', () => {
  it('arma deep link ShipsGo para cliente', () => {
    const nav = buildNotificationNavigation({
      payload: {
        route: '/shipsgo',
        shipmentMode: 'AIR',
        shipmentId: '99',
        awbNumber: 'AWB-1',
      },
    });
    assert.equal(nav.route, '/trackings');
    assert.equal(nav.state.openTab, 'air');
    assert.deepEqual(nav.state.openTracking, {
      mode: 'air',
      awbNumber: 'AWB-1',
    });
  });

  it('arma state de reportería para quote', () => {
    const nav = buildNotificationNavigation({
      clientUsername: 'acme',
      quoteNumber: 'Q-99',
      payload: {
        route: '/admin/clientes/reporteria/acme',
        clientUsername: 'acme',
      },
    });
    assert.equal(nav.state.targetTab, 'quotes');
    assert.equal(nav.state.quoteFilterNumber, 'Q-99');
  });
});
