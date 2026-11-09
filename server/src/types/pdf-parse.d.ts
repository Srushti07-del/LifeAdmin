declare module 'pdf-parse' {
  const pdfParse: (dataBuffer: Buffer) => Promise<{
    text: string;
    numpages: number;
    metadata: any;
    [key: string]: any;
  }>;
  export default pdfParse;
}
