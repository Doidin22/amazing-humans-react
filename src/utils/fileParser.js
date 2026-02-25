import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure the worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Parses a file (PDF or DOCX) and extracts chapters.
 * @param {File} file - The file object from the input.
 * @returns {Promise<Array<{title: string, content: string}>>} - Array of chapters.
 */
export async function parseFile(file) {
    const fileType = file.name.split('.').pop().toLowerCase();

    if (fileType === 'pdf') {
        return await parsePdf(file);
    } else if (fileType === 'docx') {
        return await parseDocx(file);
    } else {
        throw new Error("Unsupported file type. Please use .pdf or .docx");
    }
}

/**
 * Parses a PDF file with better layout preservation.
 */
async function parsePdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        let lastY, text = '';
        // Sort items by Y (descending) then X (ascending) to handle multi-column or out-of-order text
        // textContent.items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]); 
        // Note: Standard PDF text is usually in order, sorting might break sentences if not careful with columns.
        // Let's stick to the default order which is usually reading order, but check Y for newlines.

        for (const item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
                text += item.str;
            }
            else {
                // If Y difference is significant, it's a new line. 
                // We use a small threshold because sometimes Y varies slightly on the same line.
                if (Math.abs(item.transform[5] - lastY) > 5) {
                    text += '\n' + item.str;
                } else {
                    text += item.str;
                }
            }
            lastY = item.transform[5];
        }

        fullText += text + "\n\n";
    }

    return extractChapters(fullText);
}

/**
 * Parses a DOCX file using Mammoth.
 */
async function parseDocx(file) {
    const arrayBuffer = await file.arrayBuffer();
    // Use extractRawText but preserve double newlines
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    const text = result.value;
    return extractChapters(text);
}

/**
 * Splits text into chapters and formats content as HTML paragraphs.
 */
function extractChapters(fullText) {
    const chapters = [];

    // Normalize line endings
    const text = fullText.replace(/\r\n/g, '\n');
    const lines = text.split('\n');

    let currentChapter = { title: "Introduction", content: "" };
    let foundFirstChapter = false;

    // Pattern: Start of line, optional whitespace, "Chapter" or "Capítulo", space, number
    const chapterStartRegex = /^\s*(?:chapter|cap[íi]tulo|part|parte)\s+(?:\d+|[ivxlcm]+)/i;

    for (const line of lines) {
        if (chapterStartRegex.test(line)) {
            // Push previous chapter if it exists
            if (foundFirstChapter || currentChapter.content.trim().length > 0) {
                if (currentChapter.content.trim().length > 0 || foundFirstChapter) {
                    chapters.push({
                        ...currentChapter,
                        content: formatContentToHtml(currentChapter.content)
                    });
                }
            }

            currentChapter = {
                title: line.trim(),
                content: ""
            };
            foundFirstChapter = true;
        } else {
            currentChapter.content += line + "\n";
        }
    }

    // Push the last chapter
    if (currentChapter.content.trim().length > 0) {
        chapters.push({
            ...currentChapter,
            content: formatContentToHtml(currentChapter.content)
        });
    }

    // If no chapters were detected (only Introduction), return it as one chapter
    if (chapters.length === 0 && currentChapter.content.length > 0) {
        chapters.push({ title: "Full Content", content: formatContentToHtml(currentChapter.content) });
    }

    return chapters;
}

/**
 * Formats plain text content into HTML paragraphs.
 */
function formatContentToHtml(content) {
    if (!content) return "";

    // Split by double newlines to find paragraphs
    const paragraphs = content.split(/\n\s*\n/);

    return paragraphs
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
}
