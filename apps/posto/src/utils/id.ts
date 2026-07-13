// UUID v4 sem dependência externa — o suficiente para offlineClientId.
export function uuid(): string {
  // eslint-disable-next-line no-bitwise
  const rnd = (n: number) => Math.floor(Math.random() * n);
  const hex = (n: number, len: number) => n.toString(16).padStart(len, '0');
  const b = new Array(16).fill(0).map(() => rnd(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const s = b.map((x) => hex(x, 2)).join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
