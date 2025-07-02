declare module "formidable" {
  import { IncomingMessage } from "http";

  export interface File {
    filepath: string;
    mimetype?: string | null;
    size?: number;
    originalFilename?: string | null;
  }

  export interface Files {
    [key: string]: File | File[];
  }

  export interface Fields {
    [key: string]: string | string[];
  }

  export interface FormidableOptions {
    maxFileSize?: number;
    // add other options if needed
  }

  export interface IncomingForm {
    parse(
      req: IncomingMessage,
      callback: (err: any, fields: Fields, files: Files) => void
    ): void;
  }

  function formidable(options?: FormidableOptions): IncomingForm;
  export default formidable;
} 