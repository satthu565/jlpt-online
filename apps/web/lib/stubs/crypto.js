export const randomUUID = () =>
  typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : '00000000-0000-0000-0000-000000000000';

export const createHash = () => ({
  update: () => ({
    digest: () => '',
  }),
});

export default {
  randomUUID,
  createHash,
};
