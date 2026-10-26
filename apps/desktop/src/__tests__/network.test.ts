import { describe, expect, it } from 'vitest';
import { getLanIpAddress, resolvePreferredIp } from '../network.js';

describe('Network Utilities', () => {
  it('returns a non-empty IP address', () => {
    const ip = getLanIpAddress();
    expect(typeof ip).toBe('string');
    expect(ip.length).toBeGreaterThan(0);
    // Phải là địa chỉ IPv4 hợp lệ
    expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
  });

  it('prefers private LAN addresses over loopback', () => {
    const mockInterfaces = {
      eth0: [
        {
          address: '192.168.1.100',
          family: 'IPv4',
          internal: false,
        },
      ],
      lo: [
        {
          address: '127.0.0.1',
          family: 'IPv4',
          internal: true,
        },
      ],
    };

    const preferred = resolvePreferredIp(mockInterfaces);
    expect(preferred).toBe('192.168.1.100');
  });

  it('falls back to 127.0.0.1 when no external interfaces are available', () => {
    const mockInterfaces = {
      lo: [
        {
          address: '127.0.0.1',
          family: 'IPv4',
          internal: true,
        },
      ],
    };

    const preferred = resolvePreferredIp(mockInterfaces);
    expect(preferred).toBe('127.0.0.1');
  });
});
