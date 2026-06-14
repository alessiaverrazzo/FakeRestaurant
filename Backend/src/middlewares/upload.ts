import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 * Percorso della cartella di destinazione per i file caricati.
 * Viene creata se non esiste.
 */
const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Lista di estensioni e tipi MIME consentiti per i file immagine.
 * Serve come primo livello di validazione.
 */
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

/**
 * Strategia di storage per Multer.
 * `memoryStorage` mantiene il file in un buffer in memoria (`req.file.buffer`).
 * Questo permette di validare il file prima di salvarlo fisicamente su disco.
 */
const storage = multer.memoryStorage();

/**
 * Funzione di filtro per Multer.
 * Rifiuta i file che non corrispondono alle estensioni e ai tipi MIME consentiti.
 *
 * @param req La richiesta Express.
 * @param file Il file caricato da Multer.
 * @param cb Callback per accettare o rifiutare il file.
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Controlla sia l'estensione che il tipo MIME dichiarato
  if (!ALLOWED_EXT.includes(ext) || !ALLOWED_MIME.includes(file.mimetype)) {
    return cb(new Error("Tipo di file non permesso (sono ammesse solo immagini JPG, PNG, WEBP)"));
  }

  cb(null, true);
};

/**
 * Istanza di Multer configurata per gestire il caricamento di file singoli.
 * - `storage`: Usa la memoria per un'elaborazione intermedia.
 * - `fileFilter`: Valida il tipo di file.
 * - `limits`: Imposta un limite di dimensione di 5MB.
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite di 5MB
  },
});

/**
 * Middleware per salvare fisicamente l'immagine su disco dopo la validazione di Multer.
 * Viene eseguito dopo che `upload.single()` ha processato il file.
 * Genera un nome univoco e sicuro per il file e lo scrive nella cartella 'uploads'.
 */
export const saveUploadedImage = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Se non c'è nessun file, prosegui
  if (!req.file) return next();

  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = crypto.randomBytes(16).toString("hex") + ext;
  const filepath = path.join(uploadDir, filename);

  // Scrive il buffer del file (dalla memoria) su disco
  fs.writeFile(filepath, req.file.buffer!, (err) => {
    if (err) return next(err);

    // Aggiunge il nome e il percorso del file salvato all'oggetto `req.file`
    // per renderlo disponibile ai controller successivi.
    (req.file as any).savedFilename = filename;
    (req.file as any).savedPath = filepath;

    next();
  });
};

export default upload;
