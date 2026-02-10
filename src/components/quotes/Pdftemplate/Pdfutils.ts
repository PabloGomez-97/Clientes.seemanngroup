import html2pdf from 'html2pdf.js';

interface GeneratePDFOptions {
  filename: string;
  element: HTMLElement;
}

const pdfOptions = {
  margin: 0,
  image: { type: 'jpeg' as const, quality: 0.98 },
  html2canvas: { 
    scale: 2,
    useCORS: true,
    logging: false
  },
  pagebreak: {
    mode: ['css', 'legacy']
  },
  jsPDF: { 
    unit: 'mm', 
    format: 'a4', 
    orientation: 'portrait' 
  } as const
};

export const generatePDF = async ({ filename, element }: GeneratePDFOptions): Promise<void> => {
  try {
    await html2pdf().set({ ...pdfOptions, filename }).from(element).save();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

/**
 * Genera el PDF y lo retorna como string base64 (data URI) sin descargarlo.
 */
export const generatePDFBase64 = async (element: HTMLElement): Promise<string> => {
  try {
    console.log('[Pdfutils] Iniciando generatePDFBase64...');
    const worker = html2pdf().set(pdfOptions).from(element);
    console.log('[Pdfutils] Worker creado, llamando outputPdf("blob")...');
    const blob: Blob = await worker.outputPdf('blob');
    console.log('[Pdfutils] Blob obtenido, tipo:', blob?.type, 'tamaño:', blob?.size);
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        console.log('[Pdfutils] FileReader completado, longitud resultado:', result?.length);
        resolve(result);
      };
      reader.onerror = (err) => {
        console.error('[Pdfutils] FileReader error:', err);
        reject(err);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error generating PDF base64:', error);
    throw new Error('Failed to generate PDF base64');
  }
};

export const formatDateForFilename = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};