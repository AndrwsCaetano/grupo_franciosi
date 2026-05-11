/** Mantém apenas dígitos. */
export function digitsOnly(raw: string): string {
  return (raw ?? '').replace(/\D+/g, '');
}

/** Validação do CPF (11 dígitos + dígitos verificadores). */
export function isValidCpf(rawOrDigits: string): boolean {
  const cpf = digitsOnly(rawOrDigits);
  if (cpf.length !== 11) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i += 1) {
      sum += Number(cpf[i]) * (slice + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

/** Aplica máscara 999.999.999-99 (entrada já em dígitos). */
export function formatCpfMask(digits: string): string {
  const d = digitsOnly(digits);
  if (d.length !== 11) {
    return d;
  }
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
