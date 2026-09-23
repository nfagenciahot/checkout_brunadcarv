const VALID_DDDS = new Set([
  11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,
  41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,
  71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99
]);

export function normalizeBrazilPhone(input = '') {
  let digits = String(input).replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  return digits;
}

function isObviousFake(local) {
  if (/^(\d)\1+$/.test(local)) return true;
  if (local === '123456789' || local === '987654321' || local === '12345678' || local === '87654321') return true;
  if (/^(\d{2})\1{3,}$/.test(local)) return true;
  return false;
}

export function validateBrazilPhone(input = '') {
  const digits = normalizeBrazilPhone(input);
  if (![10,11].includes(digits.length)) return { ok:false, message:'Informe um telefone com DDD válido.' };
  const ddd = Number(digits.slice(0,2));
  if (!VALID_DDDS.has(ddd)) return { ok:false, message:'DDD inválido.' };
  const local = digits.slice(2);
  if (isObviousFake(local)) return { ok:false, message:'Informe um número de telefone válido.' };
  if (digits.length === 11 && local[0] !== '9') return { ok:false, message:'Celular brasileiro deve começar com 9 após o DDD.' };
  if (digits.length === 10 && !/^[2-5]/.test(local)) return { ok:false, message:'Número fixo inválido.' };
  const formatted = digits.length === 11
    ? `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
    : `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return { ok:true, digits, formatted, e164:`+55${digits}` };
}
