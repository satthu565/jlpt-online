/* global Buffer */
export const randomUUID = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : '00000000-0000-0000-0000-000000000000';

export const randomBytes = (size) => {
  const bytes = new Uint8Array(size);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < size; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return typeof Buffer !== 'undefined' ? Buffer.from(bytes) : bytes;
};

export const createHash = () => ({
  update: () => ({
    digest: () => '',
  }),
});

export default {
  randomUUID,
  randomBytes,
  createHash,
};
