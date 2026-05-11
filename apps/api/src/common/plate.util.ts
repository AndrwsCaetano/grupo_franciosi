/** Normaliza placa: maiúsculas, sem espaços/hífen. Aceita Mercosul (ABC1D23) ou clássica (ABC1234). */
export function normalizePlate(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

const PLATE_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

export function isValidPlate(value: string): boolean {
  return PLATE_REGEX.test(value);
}
