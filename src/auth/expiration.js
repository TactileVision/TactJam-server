export function getExpiresIn() {
  // sec * mins * hours * days * years -> 1day
  return 60 * 60 * 24;
}

export function getExpirationDate() {
  return Date.now() + getExpiresIn() * 1000;
}
