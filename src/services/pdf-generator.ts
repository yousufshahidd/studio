
/**
 * Represents a document's content.
 */
export interface DocumentContent {
  /**
   * The content of the document as a base64 encoded string.
   * For HTML, this is base64-encoded HTML.
   * For actual PDF, this would be base64-encoded PDF data.
   */
  content: string;
  /**
   * The MIME type of the content.
   */
  mimeType: 'text/html' | 'application/pdf';
  /**
   * The recommended file extension.
   */
  fileExtension: '.html' | '.pdf';
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
 * Asynchronously generates an HTML document from given HTML content.
 * THIS IS A MOCK IMPLEMENTATION FOR PDF. It actually returns HTML.
 * A real PDF generation solution (e.g., using a library like jsPDF or a server-side service)
 * is required to produce actual, viewable PDF files.
 *
 * @param htmlContent The HTML content to be "processed".
 * @returns A promise that resolves to a DocumentContent object (containing HTML).
 */
export async function generatePdf(htmlContent: string): Promise<DocumentContent> {
  console.warn(
    "PDF generation is using a MOCK implementation. " +
    "It returns base64 encoded HTML, not a real PDF. " +
    "The downloaded file will be an HTML file for viewing purposes. " +
    "For actual PDF output, a dedicated PDF generation library or service is required."
  );
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing time

  const base64Html = typeof Buffer !== 'undefined'
    ? Buffer.from(htmlContent).toString('base64') // Use Buffer if on Node.js-like env
    : safeBtoa(htmlContent); // Use safeBtoa for browser env


  return {
    content: base64Html,
    mimeType: 'text/html', // Explicitly set to HTML
    fileExtension: '.html'   // Explicitly set to .html
  };
}

/**
 * Helper function to trigger document download in the browser.
 * Decodes base64 content and creates a Blob for download.
 * @param base64Content The Base64 encoded document content.
 * @param filename The desired filename for the download (extension will be added based on mimeType).
 * @param mimeType The MIME type of the document ('text/html' or 'application/pdf').
 */
export function downloadPdf(base64Content: string, filename: string, mimeType: 'text/html' | 'application/pdf' = 'text/html') {
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

        // Determine file extension based on mimeType
        const fileExtension = mimeType === 'application/pdf' ? '.pdf' : '.html';
        const filenameWithExtension = filename.endsWith(fileExtension) ? filename : filename + fileExtension;

        // Create Blob and URL
        const blob = new Blob([byteArray], { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Create link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = filenameWithExtension; // Use filename with correct extension
        document.body.appendChild(link); // Append link to body (required for Firefox)
        link.click(); // Programmatically click the link
        document.body.removeChild(link); // Remove link from body

        // Clean up the object URL
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Error decoding Base64 or triggering download:", e);
        // Provide a more informative message to the user
        const alertMessage = mimeType === 'application/pdf'
          ? `Could not download the PDF file '${filename}'. The data might be corrupted or PDF generation failed. Note: The current PDF generation is a mock and produces invalid PDF data for PDF viewers.`
          : `Could not download the statement file '${filename}'. The data might be corrupted or generation failed.`;
        alert(`${alertMessage} Check console for details.`);
    }
}
