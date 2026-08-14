// File storage is abstracted the same way as email (see lib/email.ts) —
// the default writes to local disk under .data/uploads; a cloud provider
// (S3-compatible, etc.) can implement the same interface later.
import fs from "node:fs/promises";
import path from "node:path";

export interface StorageProvider {
  save(key: string, contents: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
}

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

class LocalDiskStorageProvider implements StorageProvider {
  async save(key: string, contents: Buffer): Promise<string> {
    const filePath = path.join(UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents);
    return filePath;
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(path.join(UPLOAD_DIR, key));
  }
}

export const storageProvider: StorageProvider = new LocalDiskStorageProvider();
