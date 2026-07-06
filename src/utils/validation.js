// src/utils/validation.js

// Shared input validation helpers

const MODEL_NAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62})?(:[a-zA-Z0-9._-]{1,63})?$/

export function isValidModelName(name) {
  if (!name || typeof name !== "string") return false
  return MODEL_NAME_PATTERN.test(name)
}
