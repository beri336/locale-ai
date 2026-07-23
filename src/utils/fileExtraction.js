// src/utils/fileExtraction.js

const MAX_CHARS_PER_FILE = 20000

async function extractPlainText(file) {
    return await file.text()
}

async function extractPdfText(file) {
    const pdfjsLib = await import('pdfjs-dist/build/pdf')
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    let fullText = ''
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item) => item.str).join(' ')
        fullText += pageText + '\n\n'
    }

    return fullText.trim()
}

function truncateContent(content, maxChars = MAX_CHARS_PER_FILE) {
    if (content.length > maxChars) {
        return { content: content.slice(0, maxChars), truncated: true }
    }
    return { content, truncated: false }
}

export async function extractFileContent(file) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    let rawText = ''
    try {
        rawText = isPdf ? await extractPdfText(file) : await extractPlainText(file)
    } catch (error) {
        return {
            filename: file.name,
            content: '',
            charCount: 0,
            truncated: false,
            error: `Extraktion fehlgeschlagen: ${error.message}`,
        }
    }

    const { content, truncated } = truncateContent(rawText)

    return {
        filename: file.name,
        content,
        charCount: content.length,
        truncated,
        error: null,
    }
}

export { MAX_CHARS_PER_FILE }