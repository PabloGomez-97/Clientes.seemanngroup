import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  countByType,
  deleteDocument,
  downloadDocumentFile,
  fetchAllDocuments,
  filterDocs,
  flattenDocs,
  type AllDocs,
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
  const visible = useMemo(
    () => filterDocs(flat, activeType, search),
    [activeType, flat, search],
  );
  const counts = useMemo(() => countByType(docs), [docs]);

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
