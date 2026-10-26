import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('NSIS Installer & Firewall Rules Configuration', () => {
  it('includes Windows firewall rule script for EduClass Server port 3000', () => {
    const installerNshPath = path.resolve(__dirname, '../../build/installer.nsh');
    expect(fs.existsSync(installerNshPath)).toBe(true);

    const content = fs.readFileSync(installerNshPath, 'utf-8');

    // Phải có lệnh mở rule Firewall
    expect(content).toContain('netsh advfirewall firewall add rule');
    expect(content).toContain('name="EduClass Server"');
    expect(content).toContain('localport=3000');
    expect(content).toContain('protocol=TCP');

    // Phải có lệnh xóa rule khi gỡ cài đặt
    expect(content).toContain('netsh advfirewall firewall delete rule');
  });

  it('provides electron-builder configuration for NSIS installer', () => {
    const builderConfigPath = path.resolve(__dirname, '../../electron-builder.json');
    expect(fs.existsSync(builderConfigPath)).toBe(true);

    const builderConfig = JSON.parse(fs.readFileSync(builderConfigPath, 'utf-8'));
    expect(builderConfig.appId).toBeDefined();
    expect(builderConfig.win?.target).toContain('nsis');
    expect(builderConfig.nsis?.include).toBe('build/installer.nsh');
  });
});
