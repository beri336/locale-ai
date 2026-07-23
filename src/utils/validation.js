// src/utils/validation.js

// Shared input validation helpers

const MODEL_NAME_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9._-]{0,62})?(:[a-zA-Z0-9._-]{1,63})?$/

export function isValidModelName(name) { // RENAME-TO isValidOllamaModelName
  if (!name || typeof name !== "string") return false
  return MODEL_NAME_PATTERN.test(name)
}

export function isValidLmStudioModelId(modelId) {
  if (!modelId || typeof modelId !== "string") return false;
  // erlaubt: buchstaben, zahlen, punkte, bindestriche, unterstriche, slash für publisher/model
  return /^[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._-]+)*$/.test(modelId);
}