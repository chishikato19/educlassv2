import os from 'node:os';

export interface NetworkInterfacePartial {
  address: string;
  family: string;
  internal: boolean;
}

/**
 * Lựa chọn địa chỉ IPv4 ưu tiên từ danh sách card mạng (ưu tiên dải 192.168.x hoặc 10.x)
 */
export function resolvePreferredIp(
  interfaces: Record<string, NetworkInterfacePartial[] | undefined>
): string {
  const candidates: string[] = [];

  for (const netList of Object.values(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  if (candidates.length === 0) {
    return '127.0.0.1';
  }

  // Ưu tiên dải mạng WiFi/Ethernet phổ biến tại trường học: 192.168.x.x và 10.x.x.x
  const wifiOrLan = candidates.find(
    ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')
  );

  return wifiOrLan ?? candidates[0] ?? '127.0.0.1';
}

/**
 * Lấy địa chỉ IP mạng nội bộ (LAN IP) của máy tính giáo viên
 */
export function getLanIpAddress(): string {
  const interfaces = os.networkInterfaces();
  return resolvePreferredIp(interfaces);
}

/**
 * Lấy tất cả địa chỉ IP mạng nội bộ
 */
export function getAllLanAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const result: string[] = [];

  for (const netList of Object.values(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        result.push(net.address);
      }
    }
  }

  if (result.length === 0) {
    result.push('127.0.0.1');
  }

  return result;
}
