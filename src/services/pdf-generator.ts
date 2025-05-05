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
 * Asynchronously generates a PDF document from given HTML content.
 *
 * @param htmlContent The HTML content to be converted to PDF.
 * @returns A promise that resolves to a PdfDocument object.
 */
export async function generatePdf(htmlContent: string): Promise<PdfDocument> {
  // TODO: Implement this by calling an API.

  return {
    content: 'base64encodedpdfcontent',
  };
}
