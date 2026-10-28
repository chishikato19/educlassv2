import crypto from 'node:crypto';

function scryptAsync(
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, storedHash: string): Promise<boolean>;
}

/**
 * Trình băm mật khẩu Scrypt an toàn, memory-hard, chuẩn theo RFC 7914,
 * sử dụng thư viện crypto tích hợp sẵn trong Node.js (không cần phụ thuộc ngoài).
 */
export class ScryptPasswordHasher implements PasswordHasher {
  private readonly saltLength = 16;
  private readonly keyLength = 64;
  private readonly cost = 16384; // N: iteration count / cost parameter
  private readonly blockSize = 8; // r: blocksize parameter
  private readonly parallel = 1; // p: parallelization parameter

  /**
   * Băm mật khẩu thành chuỗi định dạng `scrypt:<salt_hex>:<derived_key_hex>`
   */
  async hash(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.saltLength);
    const derivedKey = (await scryptAsync(password, salt, this.keyLength, {
      N: this.cost,
      r: this.blockSize,
      p: this.parallel,
    })) as Buffer;

    return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
  }

  /**
   * Xác minh mật khẩu với chuỗi hash đã lưu sử dụng timingSafeEqual để chống timing attack
   */
  async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      const parts = storedHash.split(':');
      if (parts.length !== 3 || parts[0] !== 'scrypt') {
        return false;
      }

      const saltHex = parts[1];
      const expectedKeyHex = parts[2];
      if (!saltHex || !expectedKeyHex) {
        return false;
      }

      const salt = Buffer.from(saltHex, 'hex');
      const expectedKey = Buffer.from(expectedKeyHex, 'hex');

      const derivedKey = (await scryptAsync(password, salt, expectedKey.length, {
        N: this.cost,
        r: this.blockSize,
        p: this.parallel,
      })) as Buffer;

      if (derivedKey.length !== expectedKey.length) {
        return false;
      }

      return crypto.timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }
}
