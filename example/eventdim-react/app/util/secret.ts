import 'dotenv/config'
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import invariant from 'tiny-invariant';

invariant(typeof process.env.ENV_SECRET === "string", "process.env.ENV_SECRET env var not set");
const ENCRYPTION_KEY = new Uint8Array(createHash('sha256').update(String(process.env.ENV_SECRET)).digest());
const ALGORITHM = 'aes-256-ctr' as const;
const IV_LENGTH = 16; // AES block size

export function Encode(text: string): string {
	const iv = new Uint8Array(randomBytes(IV_LENGTH)); // Initialization vector
	const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
	let encrypted = cipher.update(text, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	const ivHex = Buffer.from(iv).toString('hex');
	return `${ivHex}:${encrypted}`;
}

export function Decode(encryptedText: string): string {
	try {
		const [ivHex, encrypted] = encryptedText.split(':');
		const ivBuffer = new Uint8Array(Buffer.from(ivHex, 'hex'));
		const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, ivBuffer);
		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');
		return decrypted;
	} catch (e) {
		return "ERROR: DECODE FAILED";
	}
}