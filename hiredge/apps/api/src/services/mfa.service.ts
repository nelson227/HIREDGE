import crypto from 'crypto';
import prisma from '../db/prisma';

/**
 * TOTP-based MFA service using HMAC-based OTP (RFC 6238).
 * No external dependency — pure Node.js crypto.
 */
export class MfaService {
  private readonly DIGITS = 6;
  private readonly PERIOD = 30; // seconds
  private readonly ALGORITHM = 'sha1';

  /**
   * Generate a random base32 secret.
   */
  generateSecret(): string {
    const bytes = crypto.randomBytes(20);
    return this.base32Encode(bytes);
  }

  /**
   * Generate TOTP URI for authenticator apps.
   */
  getTotpUri(secret: string, email: string): string {
    const issuer = 'HirEdge';
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&digits=${this.DIGITS}&period=${this.PERIOD}`;
  }

  /**
   * Generate current TOTP code from secret (for verification).
   */
  generateCode(secret: string, timestamp?: number): string {
    const time = timestamp || Date.now();
    const counter = Math.floor(time / 1000 / this.PERIOD);
    return this.hotp(secret, counter);
  }

  /**
   * Verify a TOTP code with ±1 window tolerance.
   */
  verifyCode(secret: string, code: string): boolean {
    const time = Date.now();
    const counter = Math.floor(time / 1000 / this.PERIOD);

    // Check current, previous, and next time window
    for (let i = -1; i <= 1; i++) {
      const expected = this.hotp(secret, counter + i);
      if (this.timingSafeEqual(expected, code)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Setup MFA for a user — generates secret, stores (unverified).
   */
  async setup(userId: string, email: string) {
    const secret = this.generateSecret();

    await prisma.mfaSecret.upsert({
      where: { userId },
      update: { secret, verified: false },
      create: { userId, secret, verified: false },
    });

    return {
      secret,
      uri: this.getTotpUri(secret, email),
    };
  }

  /**
   * Verify MFA setup — user confirms with a valid code.
   */
  async verifySetup(userId: string, code: string): Promise<boolean> {
    const mfa = await prisma.mfaSecret.findUnique({ where: { userId } });
    if (!mfa) return false;

    if (this.verifyCode(mfa.secret, code)) {
      await prisma.mfaSecret.update({
        where: { userId },
        data: { verified: true },
      });
      return true;
    }
    return false;
  }

  /**
   * Validate MFA code during login.
   */
  async validateLogin(userId: string, code: string): Promise<boolean> {
    const mfa = await prisma.mfaSecret.findUnique({ where: { userId } });
    if (!mfa || !mfa.verified) return false;
    return this.verifyCode(mfa.secret, code);
  }

  /**
   * Check if user has MFA enabled.
   */
  async isEnabled(userId: string): Promise<boolean> {
    const mfa = await prisma.mfaSecret.findUnique({ where: { userId } });
    return !!mfa?.verified;
  }

  /**
   * Disable MFA for a user.
   */
  async disable(userId: string): Promise<void> {
    await prisma.mfaSecret.deleteMany({ where: { userId } });
  }

  // ----- Internal HOTP implementation -----

  private hotp(secret: string, counter: number): string {
    const decodedSecret = this.base32Decode(secret);
    const buffer = Buffer.alloc(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
      buffer[i] = tmp & 0xff;
      tmp = Math.floor(tmp / 256);
    }

    const hmac = crypto.createHmac(this.ALGORITHM, decodedSecret);
    hmac.update(buffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1]! & 0x0f;
    const binCode =
      ((digest[offset]! & 0x7f) << 24) |
      ((digest[offset + 1]! & 0xff) << 16) |
      ((digest[offset + 2]! & 0xff) << 8) |
      (digest[offset + 3]! & 0xff);

    const otp = binCode % Math.pow(10, this.DIGITS);
    return otp.toString().padStart(this.DIGITS, '0');
  }

  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 0x1f];
    }
    return result;
  }

  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanInput = encoded.replace(/=+$/, '').toUpperCase();
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (const char of cleanInput) {
      const index = alphabet.indexOf(char);
      if (index === -1) continue;
      value = (value << 5) | index;
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
  }
}

export const mfaService = new MfaService();
