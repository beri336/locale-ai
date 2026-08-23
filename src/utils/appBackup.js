// src/utils/appBackup.js

/// Creates, validates, exports, imports, and restores LocalAI application backups.
/// Backs up selected local-storage entries as JSON while restricting restores
/// to approved storage keys and compatible backup versions.

const APP_NAME = "LocalAI";
const BACKUP_VERSION = 1;

const BACKUP_FILE_EXTENSION = ".json";
const BACKUP_FILE_PREFIX = "localai-backup";
const JSON_MIME_TYPE = "application/json";

const LOCALAI_STORAGE_KEYS = [
    "ollama-chats",
    "ollama-projects",
    "settings",
    "theme",
    "app-sidebar-collapsed",
    "chat-sidebar-collapsed",
];

const ALLOWED_STORAGE_KEYS = new Set(LOCALAI_STORAGE_KEYS);

export { LOCALAI_STORAGE_KEYS };

/**
 * Safely reads a local-storage value and parses JSON values when possible.
 *
 * @param {string} key Local-storage key
 * @returns {unknown | null} Parsed value, raw string, or null when unavailable
 */
function getStorageValue(key) {
    try {
        const rawValue = localStorage.getItem(key);

        if (rawValue === null)
            return null;

        try {
            return JSON.parse(rawValue);
        } catch {
            return rawValue;
        }
    } catch (error) {
        console.warn(`Could not read local-storage key "${key}":`, error);

        return null;
    }
}

/**
 * Saves a value to local storage or removes the key for nullish values.
 *
 * @param {string} key Local-storage key
 * @param {unknown} value Value to persist
 */
function setStorageValue(key, value) {
    try {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
            return;
        }

        localStorage.setItem(
            key,
            typeof value === "string" ? value : JSON.stringify(value),
        );
    } catch (error) {
        console.warn(`Could not save local-storage key "${key}":`, error);
    }
}

/**
 * Triggers a download of serializable data as a JSON file.
 *
 * @param {Object} data Data to export
 * @param {string} filename Download filename
 */
function downloadJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {
        type: JSON_MIME_TYPE,
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

/**
 * Returns the current date formatted for a backup filename.
 *
 * @returns {string} ISO date in YYYY-MM-DD format
 */
function getBackupDate() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Creates the filename used for an exported backup.
 *
 * @returns {string} Backup filename
 */
function createBackupFilename() {
    return `${BACKUP_FILE_PREFIX}-${getBackupDate()}${BACKUP_FILE_EXTENSION}`;
}

/**
 * Creates a backup object from selected LocalAI local-storage entries.
 *
 * @returns {{
 *     app: string,
 *     version: number,
 *     exportedAt: string,
 *     data: Record<string, unknown>
 * }} Serializable application backup
 */
export function createAppBackup() {
    const data = {};

    LOCALAI_STORAGE_KEYS.forEach((key) => {
        const value = getStorageValue(key);

        if (value !== null)
            data[key] = value;
    });

    return {
        app: APP_NAME,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data,
    };
}

/**
 * Creates and downloads a LocalAI backup as a JSON file.
 */
export function exportAppBackup() {
    const backup = createAppBackup();

    downloadJson(backup, createBackupFilename());
}

/**
 * Validates the format and compatibility of a LocalAI backup.
 *
 * @param {unknown} backup Candidate backup object
 * @returns {true} True when the backup is valid
 * @throws {Error} When the backup is invalid or incompatible
 */
export function validateAppBackup(backup) {
    if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
        throw new Error("The selected file is not a valid backup.");
    }

    if (backup.app !== APP_NAME) {
        throw new Error(`This backup was not created by ${APP_NAME}.`);
    }

    if (!Number.isInteger(backup.version)) {
        throw new Error("The backup version is missing or invalid.");
    }

    if (backup.version > BACKUP_VERSION) {
        throw new Error(
            `This backup was created by a newer ${APP_NAME} version.`,
        );
    }

    if (
        !backup.data ||
        typeof backup.data !== "object" ||
        Array.isArray(backup.data)
    ) {
        throw new Error("The backup does not contain valid app data.");
    }

    return true;
}

/**
 * Restores allowed local-storage data from a validated backup.
 *
 * Existing keys not present in the backup remain unchanged.
 *
 * @param {unknown} backup Backup object to restore
 * @returns {string[]} Restored local-storage keys
 * @throws {Error} When the backup is invalid
 */
export function restoreAppBackup(backup) {
    validateAppBackup(backup);

    const restoredKeys = [];

    Object.entries(backup.data).forEach(([key, value]) => {
        if (!ALLOWED_STORAGE_KEYS.has(key))
            return;

        setStorageValue(key, value);
        restoredKeys.push(key);
    });

    return restoredKeys;
}

/**
 * Reads, validates, and restores an uploaded LocalAI JSON backup.
 *
 * @param {File | null | undefined} file Backup file to import
 * @returns {Promise<Object>} Restored backup object
 * @throws {Error} When the file is missing, invalid, or incompatible
 */
export async function importAppBackup(file) {
    if (!(file instanceof File))
        throw new Error("No backup file selected.");

    if (!file.name.toLocaleLowerCase().endsWith(BACKUP_FILE_EXTENSION)) {
        throw new Error("Please select a JSON backup file.");
    }

    let backup;

    try {
        const content = await file.text();

        backup = JSON.parse(content);
    } catch {
        throw new Error("The selected file contains invalid JSON.");
    }

    restoreAppBackup(backup);

    return backup;
}
