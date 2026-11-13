import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, getCurrencyInfo } from '../lib/currency';

interface ExtractedDate {
  label: string;
  date: string;
}

interface ExtractedAmount {
  label: string;
  amount: number;
  currency?: string;
}

interface ExtractedIdentifier {
  label: string;
  value: string;
}

interface DocumentItem {
  _id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  documentType?: string;
  category: string;
  notes?: string;
  aiProcessed: boolean;
  aiConfirmed: boolean;
  aiExtractionStatus?: 'processing' | 'completed' | 'no_info' | 'unsupported' | 'failed';
  aiExtractionError?: string;
  aiExtracted?: {
    provider?: string;
    summary?: string;
    importantDates?: ExtractedDate[];
    amounts?: ExtractedAmount[];
    identifiers?: ExtractedIdentifier[];
  };
  createdAt: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [category, setCategory] = useState('General');
  const [notes, setNotes] = useState('');
  const [documentType, setDocumentType] = useState('');

  // Entity creation modal state
  const [entityModalDoc, setEntityModalDoc] = useState<DocumentItem | null>(null);
  const [entityType, setEntityType] = useState<'task' | 'bill' | 'reminder'>('task');
  const [entityTitle, setEntityTitle] = useState('');
  const [entityDueDate, setEntityDueDate] = useState('');
  const [entityAmount, setEntityAmount] = useState<number | ''>('');
  const [entityPriority, setEntityPriority] = useState('medium');
  const [reExtracting, setReExtracting] = useState<Set<string>>(new Set());
  const [creatingEntity, setCreatingEntity] = useState(false);

  const categories = ['All', 'General', 'Utilities', 'Housing', 'Medical', 'Education', 'Financial', 'Legal'];

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents', {
        params: {
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: search || undefined,
        },
      });
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory, search]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', category);
      formData.append('notes', notes);
      if (documentType) formData.append('documentType', documentType);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowUploadModal(false);
      setUploadFile(null);
      setNotes('');
      setCategory('General');
      setDocumentType('');
      fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload document. Please check file type and size.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleReExtract = async (id: string) => {
    if (reExtracting.has(id)) return;
    setReExtracting((prev) => new Set([...prev, id]));
    try {
      await api.post(`/documents/${id}/re-extract`);
      await fetchDocuments();
    } catch (err) {
      console.error('Re-extract error:', err);
      alert('Failed to re-extract document. Please try again.');
    } finally {
      setReExtracting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const blobUrls = useRef<Set<string>>(new Set());

  const revokeBlobUrl = useCallback((url: string) => {
    try {
      URL.revokeObjectURL(url);
      blobUrls.current.delete(url);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      blobUrls.current.forEach((url) => revokeBlobUrl(url));
    };
  }, [revokeBlobUrl]);

  const VIEWABLE_MIME_TYPES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ]);

  const handleOpenDocument = useCallback(async (doc: DocumentItem) => {
    try {
      const res = await api.get(`/documents/${doc._id}/download`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data as BlobPart], {
        type: String(res.headers['content-type'] || doc.mimeType || 'application/octet-stream'),
      });
      const url = URL.createObjectURL(blob);
      blobUrls.current.add(url);

      const contentDisposition = String(res.headers['content-disposition'] || '');
      let originalName = doc.originalName;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"']+)["']?/);
        if (match) {
          try {
            originalName = decodeURIComponent(match[1]);
          } catch {
            originalName = match[1];
          }
        }
      }

      const isViewable = VIEWABLE_MIME_TYPES.has(
        String(res.headers['content-type'] || doc.mimeType || '')
      );

      if (isViewable) {
        const newWin = window.open(url, '_blank');
        if (!newWin) {
          triggerDownload(url, originalName);
        }
      } else {
        triggerDownload(url, originalName);
      }
    } catch (err) {
      console.error('Open document error:', err);
      alert('Failed to open document. Please try again.');
    }
  }, [revokeBlobUrl]);

  const triggerDownload = useCallback((url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => revokeBlobUrl(url), 1000);
  }, [revokeBlobUrl]);


  const openCreateEntityModal = (doc: DocumentItem, type: 'task' | 'bill' | 'reminder') => {
    setEntityModalDoc(doc);
    setEntityType(type);
    
    // Auto-populate values from AI extraction
    const firstDate = doc.aiExtracted?.importantDates?.[0]?.date;
    const firstAmount = doc.aiExtracted?.amounts?.[0]?.amount;
    const provider = doc.aiExtracted?.provider || '';

    if (type === 'bill') {
      setEntityTitle(provider ? `Pay ${provider}` : `Bill for ${doc.originalName}`);
      setEntityAmount(firstAmount || '');
    } else if (type === 'task') {
      setEntityTitle(`Review / Action for ${doc.originalName}`);
      setEntityAmount('');
    } else {
      setEntityTitle(`Reminder: ${doc.originalName}`);
      setEntityAmount('');
    }

    setEntityDueDate(firstDate ? new Date(firstDate).toISOString().split('T')[0] : '');
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityModalDoc) return;

    try {
      setCreatingEntity(true);
      await api.post(`/documents/${entityModalDoc._id}/create-entities`, {
        type: entityType,
        title: entityTitle,
        dueDate: entityDueDate || undefined,
        amount: entityAmount ? Number(entityAmount) : undefined,
        priority: entityPriority,
      });

      // Update local doc state to confirmed
      setDocuments((prev) =>
        prev.map((d) => (d._id === entityModalDoc._id ? { ...d, aiConfirmed: true } : d))
      );
      setEntityModalDoc(null);
      alert(`Successfully generated ${entityType} from document!`);
    } catch (err) {
      console.error('Create entity error:', err);
      alert('Failed to create entity from document.');
    } finally {
      setCreatingEntity(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Documents Vault</h1>
          <p className="text-surface-500 dark:text-surface-200 text-sm mt-1">
            Store essential files with AI-powered deadline extraction and automated task creation.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow"
        >
          <Upload size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name, type, or notes..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#1C292D] border border-surface-200 dark:border-[#304247] text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-500 text-white'
                  : 'bg-white dark:bg-[#1C292D] border border-surface-200 dark:border-[#304247] text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-surface-400">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#1C292D] rounded-2xl border border-surface-200 dark:border-[#304247] p-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-500 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">No documents yet</h3>
          <p className="text-surface-500 dark:text-surface-200 text-sm max-w-md mx-auto mt-1 mb-5">
            Upload contracts, bills, IDs, or lease documents. LifeAdmin will extract critical dates, amounts, and providers automatically.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Upload size={16} />
            <span>Upload Your First File</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="bg-white dark:bg-[#1C292D] rounded-2xl border border-surface-200 dark:border-[#304247] p-5 flex flex-col justify-between hover:shadow-md transition-shadow group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate" title={doc.originalName}>
                        {doc.originalName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-surface-400 mt-0.5">
                        <span>{doc.category}</span>
                        <span>•</span>
                        <span>{formatSize(doc.fileSize)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenDocument(doc)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-primary-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                      title="Open Document"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* AI Extracted Insights Banner */}
                {doc.aiProcessed || doc.aiExtractionStatus === 'processing' || doc.aiExtractionStatus === 'failed' || doc.aiExtractionStatus === 'no_info' || doc.aiExtractionStatus === 'unsupported' ? (
                  <div className="mt-3 p-3 rounded-xl space-y-2">
                    {/* Processing state */}
                    {doc.aiExtractionStatus === 'processing' ? (
                      <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/60 flex items-center gap-3">
                        <Loader2 size={16} className="animate-spin text-primary-600 dark:text-primary-400" />
                        <div className="text-xs text-surface-600 dark:text-surface-300 font-medium">Analyzing document…</div>
                      </div>
                    ) : null}

                    {/* Unsupported format */}
                    {doc.aiExtractionStatus === 'unsupported' ? (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                        <AlertTriangle size={14} />
                        <span>Unsupported file format — AI extraction not available for this file type.</span>
                      </div>
                    ) : null}

                    {/* No relevant information */}
                    {doc.aiExtractionStatus === 'no_info' ? (
                      <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/60 text-xs text-surface-500 dark:text-surface-400 flex items-center gap-2">
                        <Sparkles size={14} className="text-surface-400" />
                        <span>{doc.aiExtracted?.summary || 'No relevant information found in this document.'}</span>
                      </div>
                    ) : null}

                    {/* Failed */}
                    {doc.aiExtractionStatus === 'failed' ? (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/40 dark:border-rose-900/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                        <AlertCircle size={14} className="text-rose-600 dark:text-rose-400" />
                        <span>{doc.aiExtractionError || 'AI extraction failed. Please try again.'}</span>
                        <button
                          type="button"
                          onClick={() => handleReExtract(doc._id)}
                          disabled={reExtracting.has(doc._id)}
                          className="ml-auto px-2 py-1 rounded text-[10px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 disabled:opacity-50"
                        >
                          {reExtracting.has(doc._id) ? 'Retrying...' : 'Retry'}
                        </button>
                      </div>
                    ) : null}

                    {/* Completed extraction panel */}
                    {doc.aiExtractionStatus === 'completed' || (doc.aiProcessed && doc.aiExtractionStatus !== 'processing') ? (
                      <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/60 dark:border-surface-700/60 space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
                            <Sparkles size={14} />
                            AI Extraction
                          </span>
                          {doc.aiConfirmed ? (
                            <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                              <CheckCircle2 size={12} />
                              Converted
                            </span>
                          ) : null}
                        </div>

                        {doc.aiExtracted?.provider && (
                          <p className="text-xs text-surface-600 dark:text-surface-300">
                            <span className="font-medium text-surface-900 dark:text-surface-100">Provider:</span> {doc.aiExtracted.provider}
                          </p>
                        )}

                        {doc.aiExtracted?.importantDates && doc.aiExtracted.importantDates.length > 0 && (
                          <div className="space-y-1">
                            {doc.aiExtracted.importantDates.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300">
                                <Calendar size={12} className="text-accent-500 flex-shrink-0" />
                                <span className="truncate">{item.label}:</span>
                                <span className="font-semibold text-surface-800 dark:text-surface-200">
                                  {new Date(item.date).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {doc.aiExtracted?.amounts && doc.aiExtracted.amounts.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300">
                            <span className="text-teal-600 dark:text-teal-400 flex-shrink-0 text-xs">{getCurrencyInfo(doc.aiExtracted.amounts[0].currency).symbol}</span>
                            <span>{doc.aiExtracted.amounts[0].label}:</span>
                            <span className="font-semibold text-surface-900 dark:text-surface-100">
                              {formatCurrency(doc.aiExtracted.amounts[0].amount, doc.aiExtracted.amounts[0].currency)}
                            </span>
                          </div>
                        )}

                        {/* Summary (useful for academic case studies even with no bill/deadline) */}
                        {doc.aiExtracted?.summary && (
                          <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed mt-0.5">
                            <span className="font-medium text-surface-900 dark:text-surface-100">Summary:</span>{' '}
                            {doc.aiExtracted.summary}
                          </p>
                        )}

                        {/* Key concepts / identifiers (academic case studies) */}
                        {doc.aiExtracted?.identifiers && doc.aiExtracted.identifiers.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 mb-1 uppercase tracking-wider">Key concepts</p>
                            {doc.aiExtracted.identifiers.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-surface-300 dark:bg-surface-700 flex-shrink-0" />
                                <span className="truncate">{item.label}: {item.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {doc.notes && (
                          <p className="text-xs text-surface-400 line-clamp-2 italic pt-1 border-t border-surface-200 dark:border-surface-700">
                            "{doc.notes}"
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Action Bar: Create Task / Bill from Doc */}
              <div className="mt-4 pt-3 border-t border-surface-100 dark:border-[#304247] flex items-center justify-between gap-2">
                <span className="text-[11px] text-surface-400">Convert to:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openCreateEntityModal(doc, 'task')}
                    className="px-2 py-1 rounded-lg text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 transition-colors"
                  >
                    + Task
                  </button>
                  <button
                    onClick={() => openCreateEntityModal(doc, 'bill')}
                    className="px-2 py-1 rounded-lg text-xs font-medium bg-accent-400/10 text-accent-500 hover:bg-accent-400/20 transition-colors"
                  >
                    + Bill
                  </button>
                  <button
                    onClick={() => openCreateEntityModal(doc, 'reminder')}
                    className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                  >
                    + Reminder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C292D] rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-200 dark:border-[#304247] animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">Upload New Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Select File (PDF, Image, Doc)
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-surface-600 dark:text-surface-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-500 file:text-white hover:file:bg-primary-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                >
                  {categories.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Optional Document Type Hint
                </label>
                <input
                  type="text"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="e.g. Electricity Bill, Apartment Lease, W2 Form"
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any details or reminders related to this document..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {uploading && <Loader2 size={16} className="animate-spin" />}
                  <span>{uploading ? 'Analyzing...' : 'Upload & Analyze'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Entity Modal */}
      {entityModalDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C292D] rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-200 dark:border-[#304247] animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                Create {entityType === 'task' ? 'Task' : entityType === 'bill' ? 'Bill' : 'Reminder'}
              </h3>
              <button
                onClick={() => setEntityModalDoc(null)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={entityTitle}
                  onChange={(e) => setEntityTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={entityDueDate}
                  onChange={(e) => setEntityDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                />
              </div>

              {entityType === 'bill' && (
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Amount (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={entityAmount}
                    onChange={(e) => setEntityAmount(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                  />
                </div>
              )}

              {entityType === 'task' && (
                <div>
                  <label className="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={entityPriority}
                    onChange={(e) => setEntityPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm text-surface-900 dark:text-surface-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEntityModalDoc(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingEntity}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium"
                >
                  {creatingEntity && <Loader2 size={16} className="animate-spin" />}
                  <span>Save to {entityType}s</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

