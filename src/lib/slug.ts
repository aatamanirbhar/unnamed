const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";

export function createSlug(length = 12) {
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((value) => alphabet[value % alphabet.length])
    .join("");
}

export function normalizeQuestion(input: string) {
  const trimmed = input.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return "";
  }

  return trimmed.toLowerCase().startsWith("should i")
    ? trimmed
    : `Should I ${trimmed}`;
}
