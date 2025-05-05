/**
 * Represents a PDF document.
 */
export interface PdfDocument {
  /**
   * The content of the PDF document as a base64 encoded string.
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

  console.warn("PDF generation is not implemented. Returning placeholder data (Base64 encoded HTML).");
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
 * NOTE: This should ideally be called from the component after generatePdf resolves.
 * @param base64Content The Base64 encoded PDF content.
 * @param filename The desired filename for the download.
 */
export function downloadPdf(base64Content: string, filename: string) {
    if (typeof window === 'undefined' || typeof document === 'undefined' || typeof atob === 'undefined') {
        console.error("Download function can only be called on the client-side browser environment.");
        return;
    }
    try {
        // Decode Base64 string
        const byteCharacters = atob(base64Content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Determine MIME type - assume application/pdf for now
        // WARNING: Since we are encoding HTML as base64 in the mock, downloading it as application/pdf
        // will result in a corrupted file. A real implementation generating actual PDF bytes is needed.
        // For the *mock* to download the HTML source itself, you could use 'text/html'.
        // const mimeType = 'text/html'; // Use this to download the source HTML in the mock
        const mimeType = 'application/pdf'; // Keep as PDF for the intended final functionality

        // Create Blob and URL
        const blob = new Blob([byteArray], { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Create link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link); // Append link to body
        link.click(); // Programmatically click the link to trigger the download
        document.body.removeChild(link); // Remove link from body

        // Clean up the object URL
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Error decoding Base64 or triggering download:", e);
        // Fallback for placeholder or invalid Base64
        alert("Could not decode or download the PDF file. The generated data might be a placeholder or corrupted. Check console for details.");
    }
}
