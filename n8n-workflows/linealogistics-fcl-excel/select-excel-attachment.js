const item = $input.item;
const binary = item.binary || {};

const excelEntries = Object.entries(binary).filter(([, file]) => {
  const fileName = String(file.fileName || "").toLowerCase();
  const mime = String(file.mimeType || "").toLowerCase();
  const ext = String(file.fileExtension || "").toLowerCase();

  return (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("officedocument.spreadsheetml") ||
    ext === "xlsx" ||
    ext === "xls" ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  );
});

if (excelEntries.length === 0) {
  throw new Error(
    "No se encontró ningún archivo Excel en los adjuntos del correo.",
  );
}

if (excelEntries.length > 1) {
  const names = excelEntries.map(([, file]) => file.fileName).join(", ");
  throw new Error(
    `Se encontraron ${excelEntries.length} archivos Excel (${names}). Se esperaba solo uno.`,
  );
}

const [excelKey, excelFile] = excelEntries[0];

item.json = {
  ...item.json,
  excelAttachmentKey: excelKey,
  excelFileName: excelFile.fileName,
};

item.binary = {
  [excelKey]: excelFile,
};

return item;
