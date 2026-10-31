export const join = (...args) => {
  const parts = args.filter(Boolean);
  const joined = parts.join('/');
  const hasLeading = parts[0]?.startsWith('/');
  const norm = joined.replace(/\/+/g, '/');
  return hasLeading && !norm.startsWith('/') ? '/' + norm : norm;
};
export const resolve = (...args) => {
  const res = join(...args);
  return res.startsWith('/') ? res : '/' + res;
};
export const dirname = (p) => p.split('/').slice(0, -1).join('/') || '/';
export const basename = (p) => p.split('/').pop() || '';
export const posix = { resolve, dirname, basename, join };
export default { resolve, dirname, basename, join, posix };
