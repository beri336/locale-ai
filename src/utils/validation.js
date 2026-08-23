// src/utils/validation.js

/// Provides shared validation helpers for Ollama and LM Studio model identifiers.
/// Validates supported naming conventions before model-related API requests
/// are sent from the application.

const OLLAMA_MODEL_NAME_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,62})?(?::[a-zA-Z0-9._-]{1,63})?$/;

const LM_STUDIO_MODEL_ID_PATTERN =
  /^[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/;

/**
 * Checks whether a value is a valid Ollama model name.
 *
 * Supports an optional tag, for example `llama3.2:3b` or `mistral`.
 *
 * @param {unknown} value Candidate Ollama model name
 * @returns {boolean} True when the model name is valid
 */
export function isValidOllamaModelName(value) {
  if (typeof value !== "string")
    return false;

  return OLLAMA_MODEL_NAME_PATTERN.test(value.trim());
}

/**
 * Checks whether a value is a valid LM Studio model identifier.
 *
 * Supports identifiers such as `qwen/qwen3-8b` and nested publisher paths.
 *
 * @param {unknown} value Candidate LM Studio model identifier
 * @returns {boolean} True when the model identifier is valid
 */
export function isValidLmStudioModelId(value) {
  if (typeof value !== "string")
    return false;

  return LM_STUDIO_MODEL_ID_PATTERN.test(value.trim());
}
