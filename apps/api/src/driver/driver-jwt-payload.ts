export type DriverJwtPayload = {
  sub: string;
  typ: 'driver';
};

export function isDriverJwtPayload(
  v: Record<string, unknown>,
): v is DriverJwtPayload {
  return v.typ === 'driver' && typeof v.sub === 'string';
}
