export const resolve = (...args) => args.join('/');
export const dirname = (p) => p.split('/').slice(0, -1).join('/') || '/';
export const basename = (p) => p.split('/').pop() || '';
export const join = (...args) => args.join('/');
export default { resolve, dirname, basename, join };
