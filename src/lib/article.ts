// D-092 rule 7: "a" or "an" before a number, by how the number is spoken
// ("an 8 min warm-up", "an 11 min walk", "a 10 min timer").

export function aOrAn(n: number | string): 'a' | 'an' {
  const digits = String(n).replace(/[^0-9]/g, '')
  if (digits === '') return 'a'
  // eight, eighty, eight hundred…; eleven; eighteen; eleven/eighteen thousand…
  if (digits.startsWith('8')) return 'an'
  if (/^(11|18)$/.test(digits) || /^(11|18)\d{3}$/.test(digits) || /^(11|18)\d{6}$/.test(digits)) return 'an'
  return 'a'
}
