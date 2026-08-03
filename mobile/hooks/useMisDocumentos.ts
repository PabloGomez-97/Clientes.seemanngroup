import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  countByType,
  deleteDocument,
  docsForReference,
  downloadDocumentFile,
  fetchAllDocuments,
  filterDocs,
  filterFolders,
  flattenDocs,
  groupDocsByReference,
  type AllDocs,
  type DocFolder,
  type DocTransportType,
  type UnifiedDoc,
} from "../services/documentsApi";

const EMPTY: AllDocs = { air: [], ocean: [], ground: [], quotes: [] };

export function useMisDocumentos() {
  const { token, activeUsername } = useAuth();
  const [docs, setDocs] = useState<AllDocs>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<DocTransportType>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token || !activeUsername) {
        setDocs(EMPTY);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await fetchAllDocuments(token, activeUsername);
        setDocs(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar documentos",
        );
      } finally {
        setLoading(false);
      }
    },
    [activeUsername, token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const flat = useMemo(() => flattenDocs(docs), [docs]);

  /** Docs filtrados solo por tipo (sin search); la búsqueda aplica a carpetas. */
  const typedDocs = useMemo(
    () => filterDocs(flat, activeType, ""),
    [activeType, flat],
  );

  const folders = useMemo(
    () => filterFolders(groupDocsByReference(typedDocs), search),
    [search, typedDocs],
  );

  /** Lista plana filtrada (tipo + búsqueda) — útil en pantalla de carpeta. */
  const visible = useMemo(
    () => filterDocs(flat, activeType, search),
    [activeType, flat, search],
  );

  const counts = useMemo(() => countByType(docs), [docs]);

  const getDocsForReference = useCallback(
    (reference: string): UnifiedDoc[] => docsForReference(flat, reference),
    [flat],
  );

  const getFolder = useCallback(
    (reference: string): DocFolder | undefined => {
      const folderDocs = docsForReference(flat, reference);
      if (folderDocs.length === 0) return undefined;
      return groupDocsByReference(folderDocs)[0];
    },
    [flat],
  );

  const remove = useCallback(
    async (doc: UnifiedDoc) => {
      if (!token || !activeUsername) return;
      setBusyId(doc.id);
      try {
        await deleteDocument(token, activeUsername, doc);
        await load(true);
      } finally {
        setBusyId(null);
      }
    },
    [activeUsername, load, token],
  );

  const download = useCallback(
    async (doc: UnifiedDoc) => {
      if (!token || !activeUsername) return null;
      setBusyId(doc.id);
      try {
        return await downloadDocumentFile(token, activeUsername, doc);
      } finally {
        setBusyId(null);
      }
    },
    [activeUsername, token],
  );

  return {
    activeUsername,
    docs: visible,
    folders,
    getDocsForReference,
    getFolder,
    counts,
    loading,
    error,
    activeType,
    setActiveType,
    search,
    setSearch,
    busyId,
    refresh: () => load(true),
    remove,
    download,
  };
}
