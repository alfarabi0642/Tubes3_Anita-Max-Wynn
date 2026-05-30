export const VISUAL_CHARACTER_MAP: Record<string, string> = {
  "0": "O",
  "4": "A",
  "1": "I",
  "3": "E",
  "5": "S",
  "8": "B",
  "$": "S",
  "@": "A",
  "!": "I",
  "|": "I",
  "\u0391": "A",
  "\u039F": "O",
  "\u0395": "E",
  "\u0399": "I"
};

export function normalizeCase(input: string): string {
  return input.toUpperCase();
}

export function normalizeVisualCharacter(char: string): string {
  const upperChar = normalizeCase(char);
  const mappedChar = VISUAL_CHARACTER_MAP[upperChar];

  if (mappedChar !== undefined) {
    return mappedChar;
  }

  return upperChar;
}

export function normalizeVisualText(input: string): string {
  let normalized = "";

  for (let i = 0; i < input.length; i += 1) {
    normalized += normalizeVisualCharacter(input[i]);
  }

  return normalized;
}

export function areCharactersVisuallyEquivalent(left: string, right: string): boolean {
  return normalizeVisualCharacter(left) === normalizeVisualCharacter(right);
}

export function isVisualAlphaNumeric(char: string): boolean {
  const normalizedChar = normalizeVisualCharacter(char);

  return normalizedChar.length === 1 && isAsciiAlphaNumeric(normalizedChar);
}

export function isAsciiAlphaNumeric(char: string): boolean {
  if (char.length === 0) {
    return false;
  }

  const code = char.charCodeAt(0);
  const isDigit = code >= 48 && code <= 57;
  const isUppercase = code >= 65 && code <= 90;
  const isLowercase = code >= 97 && code <= 122;

  return isDigit || isUppercase || isLowercase;
}
