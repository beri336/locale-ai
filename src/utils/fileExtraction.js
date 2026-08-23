// src/utils/fileExtraction.js

/// Extracts plain text from uploaded text files and PDF documents.
/// Limits extracted content to a configured character count and returns
/// normalized metadata, truncation state and user-friendly error details.

const MAX_CHARS_PER_FILE = 20_000;

const PDF_MIME_TYPE = "application/pdf";
const PDF_FILE_EXTENSION = ".pdf";
const PDF_WORKER_MODULE = "pdfjs-dist/build/pdf.worker.min.mjs";
const PDF_LIBRARY_MODULE = "pdfjs-dist/build/pdf";


/**
 * Extracts raw text from a plain-text-compatible file.
 *
 * @param {File} file File to read
 * @returns {Promise<string>} Extracted file content
 */
async function extractPlainText(file) {
    return file.text();
}

/**
 * Loads the PDF.js module and configures its web worker.
 *
 * @returns {Promise<Object>} Configured PDF.js module
 */
async function getPdfLibrary() {
    const pdfjsLib = await import(PDF_LIBRARY_MODULE);

    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        PDF_WORKER_MODULE,
        import.meta.url,
    ).href;

    return pdfjsLib;
}

/**
 * Extracts text from every page of a PDF document.
 *
 * @param {File} file PDF file to extract
 * @returns {Promise<string>} Extracted PDF text
 */
async function extractPdfText(file) {
    const pdfjsLib = await getPdfLibrary();
    const arrayBuffer = await file.arrayBuffer();

    const pdfDocument = await pdfjsLib.getDocument({
        data: arrayBuffer,
    }).promise;

    const pageText = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();

        pageText.push(
            textContent.items
                .map((item) => item.str)
                .join(" "),
        );
    }

    return pageText.join("\n\n").trim();
}

/**
 * Checks whether a file should be processed as a PDF.
 *
 * @param {File} file Uploaded file
 * @returns {boolean} True when the file is a PDF
 */
function isPdfFile(file) {
    return file.type === PDF_MIME_TYPE ||
        file.name.toLocaleLowerCase().endsWith(PDF_FILE_EXTENSION);
}

/**
 * Limits extracted text to the configured character count.
 *
 * @param {string} content Extracted text
 * @param {number} [maxChars=20000] Maximum number of characters
 * @returns {{ content: string, truncated: boolean }} Limited content and state
 */
function truncateContent(content, maxChars = MAX_CHARS_PER_FILE) {
    if (content.length <= maxChars) {
        return {
            content,
            truncated: false,
        };
    }

    return {
        content: content.slice(0, maxChars),
        truncated: true,
    };
}

/**
 * Creates a standardized extraction-error result.
 *
 * @param {File} file File that could not be extracted
 * @param {unknown} error Extraction error
 * @returns {{
 *     filename: string,
 *     content: string,
 *     charCount: number,
 *     truncated: boolean,
 *     error: string
 * }} Error extraction result
 */
function createExtractionErrorResult(file, error) {
    const message = error instanceof Error
        ? error.message
        : "Unknown extraction error.";

    return {
        filename: file.name,
        content: "",
        charCount: 0,
        truncated: false,
        error: `Extraktion fehlgeschlagen: ${message}`,
    };
}

/**
 * Extracts text content from a text file or PDF document.
 *
 * @param {File} file Uploaded file
 * @returns {Promise<{
 *     filename: string,
 *     content: string,
 *     charCount: number,
 *     truncated: boolean,
 *     error: string | null
 * }>} Extracted file content and metadata
 */
export async function extractFileContent(file) {
    if (!(file instanceof File)) {
        throw new TypeError(
            "extractFileContent expects a valid File instance.",
        );
    }

    try {
        const rawText = isPdfFile(file)
            ? await extractPdfText(file)
            : await extractPlainText(file);
        const { content, truncated } = truncateContent(rawText);

        return {
            filename: file.name,
            content,
            charCount: content.length,
            truncated,
            error: null,
        };
    } catch (error) {
        console.error(`Could not extract "${file.name}":`, error);

        return createExtractionErrorResult(file, error);
    }
}


export {
    MAX_CHARS_PER_FILE,
};
