
/**
 * Represents a PDF document.
 */
export interface PdfDocument {
  /**
   * The content of the PDF document as a base64 encoded string.
   * IMPORTANT: In the mock implementation, this is base64-encoded HTML, not actual PDF data.
   */
  content: string;
}

/**
 * Converts a string to a Base64 string, suitable for browser environments.
 * Handles potential issues with UTF-8 characters.
 * @param str The string to encode.
 * @returns The Base64 encoded string.
 */
function safeBtoa(str: string): string {
    try {
        // Use TextEncoder for robust UTF-8 handling before btoa
        const bytes = new TextEncoder().encode(str);
        const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
        return btoa(binString);
    } catch (e) {
        console.error("Error in safeBtoa encoding:", e);
        // Fallback for environments without TextEncoder or potential issues
        try {
          return btoa(unescape(encodeURIComponent(str)));
        } catch (e2) {
           console.error("Fallback btoa failed:", e2);
           // Last resort: very basic btoa, might corrupt non-ASCII
           return btoa(str);
        }
    }
}


/**
 * Asynchronously generates a PDF document from given HTML content.
 *
 * @param htmlContent The HTML content to be converted to PDF.
 * @returns A promise that resolves to a PdfDocument object.
 *
 * @throws {Error} If PDF generation is not implemented.
 */
export async function generatePdf(htmlContent: string): Promise<PdfDocument> {
  // TODO: Implement this by calling a real PDF generation service/library (e.g., Puppeteer on a server, jsPDF on client, or an external API).
  // The current implementation is a placeholder and will simulate a delay.

  console.warn("PDF generation is using mock data. Returning base64 encoded HTML, not a real PDF.");
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time

  // Create a placeholder Base64 by encoding the HTML itself using a safer method
  const placeholderBase64 = typeof Buffer !== 'undefined'
    ? Buffer.from(htmlContent).toString('base64') // Use Buffer if on Node.js-like env
    : safeBtoa(htmlContent); // Use safeBtoa for browser env


  return {
    content: placeholderBase64, // Return placeholder Base64
  };

  // To make it throw an error if used prematurely:
  // throw new Error("PDF generation service is not implemented yet.");
}

/**
 * Helper function to trigger PDF download in the browser.
 * Decodes base64 content and creates a Blob for download.
 * @param base64Content The Base64 encoded PDF content.
 * @param filename The desired filename for the download.
 */
export function downloadPdf(base64Content: string, filename: string) {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof atob === 'undefined') {
        console.error("Download function can only be called on the client-side browser environment.");
        return;
    }
    try {
        // Decode Base64 string into binary data
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Define the MIME type for the PDF
        const mimeType = 'application/pdf';
        // WARNING: The MOCK generatePdf function returns base64 HTML. Downloading this as PDF
        // will result in a file that PDF viewers cannot open. A *real* PDF generation
        // implementation is needed to create a viewable PDF file.

        // Create Blob and URL
        const blob = new Blob([byteArray], { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Create link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link); // Append link to body (required for Firefox)
        link.click(); // Programmatically click the link
        document.body.removeChild(link); // Remove link from body

        // Clean up the object URL
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Error decoding Base64 or triggering download:", e);
        // Provide a more informative message to the user
        alert(`Could not download the file '${filename}'. The data might be corrupted or PDF generation failed. Check console for details. Note: The current PDF generation is a mock and produces invalid PDF data.`);
    }
}
