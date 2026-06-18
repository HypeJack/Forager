import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface VaultDocument {
  id: string;
  tenant_id: string;
  title: string;
  file_path: string;
  file_type: string;
  file_size_bytes: number;
  status: "processing" | "indexed" | "failed";
  chunk_count: number;
  created_at: string;
  deleted_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  processing: { label: "Processing", color: "text-semantic-info", bg: "bg-semantic-info/10" },
  indexed: { label: "Indexed", color: "text-semantic-success", bg: "bg-semantic-success/10" },
  failed: { label: "Failed", color: "text-semantic-error", bg: "bg-semantic-error/10" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function VaultPage() {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tenantId, setTenantId] = useState<string | null>(null);

  // Load documents from Supabase
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("users")
          .select("tenant_id")
          .eq("id", session.user.id)
          .single();
        if (data) {
          setTenantId(data.tenant_id);
        }
      }
      loadDocuments();
    }
    init();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("vault_documents")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (data) setDocuments(data as VaultDocument[]);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    if (!tenantId) {
      console.error("Tenant ID not loaded yet.");
      setUploading(false);
      return;
    }

    for (const file of Array.from(files)) {
      // 1. Upload to Supabase Storage
      const filePath = `${tenantId}/vault/${crypto.randomUUID()}/${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("vault-documents")
        .upload(filePath, file);

      if (storageError) {
        console.error("Upload failed:", storageError.message);
        continue;
      }

      // 2. Insert document record — status starts as "processing"
      // The Inngest worker will pick it up and process it
      const { data: dbData, error: dbError } = await supabase.from("vault_documents").insert({
        tenant_id: tenantId,
        title: file.name.replace(/\.[^.]+$/, ""),
        file_path: filePath,
        file_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
        status: "processing",
        chunk_count: 0,
      }).select("id, tenant_id").single();

      if (dbError) {
        console.error("DB insert failed:", dbError.message);
        continue;
      }
      
      if (!dbData) {
        console.error("DB insert succeeded but returned no data.");
        continue;
      }

      // 3. Fire the Inngest event
      try {
        const { error: invokeError } = await supabase.functions.invoke("emit-inngest-event", {
          body: {
            name: "vault/document.uploaded",
            data: {
              documentId: dbData.id,
              tenantId: dbData.tenant_id,
            },
          },
        });
        
        if (invokeError) {
          console.error("Document uploaded, but processing trigger failed (invoke error):", invokeError.message);
        }
      } catch (err: any) {
        console.error("Document uploaded, but processing trigger failed (exception):", err.message || err);
      }
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Reload the list
    loadDocuments();
  }

  async function handleSoftDelete(docId: string) {
    const { error } = await supabase
      .from("vault_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", docId);

    if (!error) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-950">Vault</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Upload organizational documents for Scout to reference when matching grants.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={handleUpload}
            className="hidden"
            id="vault-file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            id="btn-upload-document"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-brand-primary text-white hover:bg-brand-primary-light transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploading ? "Uploading..." : "Upload Documents"}
          </button>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-neutral-200 rounded-xl">
          <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="font-medium text-neutral-500 mb-1">No documents yet</p>
          <p className="text-sm text-neutral-400">
            Upload annual reports, strategic plans, or past grant applications.
          </p>
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Document</th>
                <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Chunks</th>
                <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Size</th>
                <th className="text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide px-4 py-3">Added</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const status = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.processing;
                return (
                  <tr key={doc.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 transition-colors" id={`vault-doc-${doc.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{doc.title}</p>
                          <p className="text-xs text-neutral-400">{doc.file_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                        {doc.status === "processing" && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{doc.chunk_count}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatBytes(doc.file_size_bytes)}</td>
                    <td className="px-4 py-3 text-sm text-neutral-500">{formatDate(doc.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSoftDelete(doc.id)}
                        className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-semantic-error transition-colors"
                        aria-label="Delete document"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
