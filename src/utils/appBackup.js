// src/utils/appBackup.js

const BACKUP_VERSION = 1;

export const LOCALAI_STORAGE_KEYS = [
  "ollama-chats",
  "ollama-projects",
  "settings",
  "theme",
  "app-sidebar-collapsed",
  "chat-sidebar-collapsed",
];

function getStorageValue(key) {
    const rawValue = localStorage.getItem(key);

    if (rawValue === null) {
        return null;
    }

    try {
        return JSON.parse(rawValue);
    } catch {
        return rawValue;
    }
}

function setStorageValue(key, value) {
    if (value === null || value === undefined) {
        localStorage.removeItem(key);
        return;
    }

    localStorage.setItem(
        key,
        typeof value === "string" ? value : JSON.stringify(value),
    );
}

function downloadJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export function createAppBackup() {
    const data = {};

    for (const key of LOCALAI_STORAGE_KEYS) {
        const value = getStorageValue(key);

        if (value !== null) {
            data[key] = value;
        }
    }

    return {
        app: "LocalAI",
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data,
    };
}

export function exportAppBackup() {
    const backup = createAppBackup();
    const date = new Date().toISOString().slice(0, 10);

    downloadJson(backup, `localai-backup-${date}.json`);
}

export function validateAppBackup(backup) {
    if (!backup || typeof backup !== "object") {
        throw new Error("The selected file is not a valid backup.");
    }

    if (backup.app !== "LocalAI") {
        throw new Error("This backup was not created by LocalAI.");
    }

    if (!Number.isInteger(backup.version)) {
        throw new Error("The backup version is missing or invalid.");
    }

    if (backup.version > BACKUP_VERSION) {
        throw new Error(
            "This backup was created by a newer LocalAI version.",
        );
    }

    if (!backup.data || typeof backup.data !== "object") {
        throw new Error("The backup does not contain app data.");
    }

    return true;
}

export function restoreAppBackup(backup) {
    validateAppBackup(backup);

    for (const [key, value] of Object.entries(backup.data)) {
        if (LOCALAI_STORAGE_KEYS.includes(key)) {
            setStorageValue(key, value);
        }
    }
}

export async function importAppBackup(file) {
    if (!file) {
        throw new Error("No file selected.");
    }

    if (!file.name.toLowerCase().endsWith(".json")) {
        throw new Error("Please select a JSON backup file.");
    }

    const content = await file.text();

    let backup;

    try {
        backup = JSON.parse(content);
    } catch {
        throw new Error("The selected file contains invalid JSON.");
    }

    restoreAppBackup(backup);

    return backup;
}