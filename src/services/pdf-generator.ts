
/**
 * Represents the content to be presented as a document (e.g., HTML for printing/saving as PDF).
 */
export interface DocumentContent {
  /**
   * The HTML content of the document.
   */
  htmlContent: string;
}

/**
 * Asynchronously prepares HTML content intended for PDF generation or display.
 * In a real application, this might interact with a backend service.
 *
 * @param htmlContent The HTML content to be used.
 * @returns A promise that resolves to a DocumentContent object containing the HTML.
 */
export async function generatePdf(htmlContent: string): Promise<DocumentContent> {
  // TODO: In a real implementation, you might:
  // 1. Send this HTML to a server-side service (like Puppeteer) to generate a real PDF.
  // 2. Return the Base64 encoded PDF content from that service.
  // For now, we'll just return the HTML itself, assuming the client might use print-to-PDF.

  console.warn("PDF generation mock: Returning raw HTML content. Use browser's Print-to-PDF functionality.");
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate minimal processing

  return {
    htmlContent: htmlContent,
  };
}

/**
 * Helper function to trigger HTML content download in the browser.
 * The user can then save this HTML or use the browser's print function to save as PDF.
 * @param htmlContent The HTML content string.
 * @param filename The desired filename for the download (e.g., "account_statement.html").
 */
export function downloadPdf(htmlContent: string, filename: string) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        console.error("Download function can only be called on the client-side browser environment.");
        return;
    }
    try {
        // Create Blob with HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        // Create link and trigger download
        const link = document.createElement('a');
        link.href = url;
        // Ensure filename has .html extension for clarity
        link.download = filename.endsWith('.html') ? filename : filename.replace(/\.pdf$/i, '.html');
        document.body.appendChild(link); // Append link to body
        link.click(); // Programmatically click the link to trigger the download
        document.body.removeChild(link); // Remove link from body

        // Clean up the object URL
        URL.revokeObjectURL(url);

    } catch (e) {
        console.error("Error creating blob or triggering download:", e);
        alert("Could not trigger the file download. Check console for details.");
    }
}
