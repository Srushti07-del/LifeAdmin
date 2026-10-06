import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  FileText,
  Upload,
  Search,
  Trash2,
  ExternalLink,
  Calendar,
  Loader2,
  X,
  Pencil,
} from 'lucide-react';

interface ExtractedDate {
  label: string;
  date: string;
}

interface ExtractedAmount {
  label: string;
  amount: number;
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
  aiExtracted?: {
    provider?: string;
    summary?: string;
    expiryDate?: string;
    importantDates?: ExtractedDate[];
    amounts?: ExtractedAmount[];
  };
  createdAt: string;
}

export default function DocumentsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showUploadModal, setShowUploadModal] = useState(location.pathname.endsWith('/new'));
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [category, setCategory] = useState('General');
  const [notes, setNotes] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit metadata modal state
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [editCategory, setEditCategory] = useState('General');
  const [editDocType, setEditDocType] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Entity creation modal state
  const [entityModalDoc, setEntityModalDoc] = useState<DocumentItem | null>(null);
  const [entityType, setEntityType] = useState<'task' | 'bill' | 'reminder'>('task');
  const [entityTitle, setEntityTitle] = useState('');
  const [entityDueDate, setEntityDueDate] = useState('');
  const [entityAmount, setEntityAmount] = useState<number | ''>('');
  const [entityPriority, setEntityPriority] = useState('medium');
  const [creatingEntity, setCreatingEntity] = useState(false);

  const categories = ['All', 'General', 'Utilities', 'Housing', 'Medical', 'Education', 'Financial', 'Legal'];

  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setShowUploadModal(true);
    }
  }, [location.pathname]);

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
      setFeedback(null);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', category);
      formData.append('notes', notes);
      if (documentType) formData.append('documentType', documentType);
      if (expiryDate) formData.append('expiryDate', expiryDate);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowUploadModal(false);
      setUploadFile(null);
      setNotes('');
      setCategory('General');
      setDocumentType('');
      setExpiryDate('');
      if (location.pathname.endsWith('/new')) {
        navigate('/documents', { replace: true });
      }
      setFeedback({ type: 'success', message: 'Document uploaded successfully' });
      fetchDocuments();
    } catch (err: any) {
      console.error('Upload error:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to upload document' });
    } finally {
      setUploading(false);
    }
  };

  const startEditingDoc = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setEditCategory(doc.category || 'General');
    setEditDocType(doc.documentType || '');
    setEditNotes(doc.notes || '');
    setEditExpiryDate(doc.aiExtracted?.expiryDate ? new Date(doc.aiExtracted.expiryDate).toISOString().split('T')[0] : '');
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    try {
      setSavingEdit(true);
      setFeedback(null);
      await api.put(`/documents/${editingDoc._id}`, {
        category: editCategory,
        documentType: editDocType,
        notes: editNotes,
        expiryDate: editExpiryDate || undefined,
      });
      setEditingDoc(null);
      setFeedback({ type: 'success', message: 'Document metadata updated' });
      fetchDocuments();
    } catch (err: any) {
      console.error('Update metadata error:', err);
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to update metadata' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      setFeedback({ type: 'success', message: 'Document deleted' });
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleOpenDocument = (doc: DocumentItem) => {
    const token = localStorage.getItem('lifeadmin_token');
    const url = `/api/documents/${doc._id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank');
  };

  const openCreateEntityModal = (doc: DocumentItem, type: 'task' | 'bill' | 'reminder') => {
    setEntityModalDoc(doc);
    setEntityType(type);

    const firstDate = doc.aiExtracted?.expiryDate || doc.aiExtracted?.importantDates?.[0]?.date;
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

      setDocuments((prev) =>
        prev.map((d) => (d._id === entityModalDoc._id ? { ...d, aiConfirmed: true } : d))
      );
      setEntityModalDoc(null);
      setFeedback({ type: 'success', message: `Successfully created ${entityType} from document!` });
    } catch (err) {
      console.error('Create entity error:', err);
      setFeedback({ type: 'error', message: 'Failed to create responsibility from document.' });
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
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F3EE]">Documents Vault</h1>
          <p className="text-[#85827C] text-sm mt-1">
            Store essential files with metadata, expiry tracking, and direct responsibility creation.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#383838] hover:bg-[#414141] text-[#F5F3EE] border border-[#505050] font-medium text-xs transition-all shadow-sm"
        >
          <Upload size={16} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800'
              : 'bg-rose-950/40 text-rose-300 border border-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#85827C]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents by name, type, or notes..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-[#323232] border border-[#505050] text-[#F5F3EE] placeholder-[#85827C] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#414141] text-[#F5F3EE] border border-[#505050] shadow-sm'
                  : 'bg-[#383838] border border-[#505050] text-[#B8B5AE] hover:bg-[#414141] hover:text-[#F5F3EE]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#85827C]">
          <Loader2 size={32} className="animate-spin text-[#B8B5AE]" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-[#383838] rounded-2xl border border-[#505050] p-8">
          <div className="w-12 h-12 rounded-xl bg-[#323232] border border-[#505050] text-[#B8B5AE] flex items-center justify-center mx-auto mb-3">
            <FileText size={24} />
          </div>
          <h3 className="text-base font-semibold text-[#F5F3EE]">No documents found</h3>
          <p className="text-[#85827C] text-xs max-w-md mx-auto mt-1 mb-4">
            Upload contracts, bills, leases, or identity records to keep your essential records accessible.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#414141] hover:bg-[#505050] text-[#F5F3EE] border border-[#505050] text-xs font-medium transition-colors"
          >
            <Upload size={14} />
            <span>Upload File</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const expiry = doc.aiExtracted?.expiryDate ? new Date(doc.aiExtracted.expiryDate) : null;
            const isExpired = expiry && expiry.getTime() < Date.now();

            return (
              <div
                key={doc._id}
                className="bg-[#383838] rounded-2xl border border-[#505050] p-4 flex flex-col justify-between hover:bg-[#414141] hover:border-[#606060] transition-all group"
              >
                <div>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#323232] border border-[#505050] text-[#B8B5AE] flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#F5F3EE] truncate" title={doc.originalName}>
                          {doc.originalName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#85827C] mt-0.5">
                          <span>{doc.category}</span>
                          <span>•</span>
                          <span>{formatSize(doc.fileSize)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleOpenDocument(doc)}
                        className="p-1 rounded-lg text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#323232] transition-colors"
                        title="Download / View Document"
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        onClick={() => startEditingDoc(doc)}
                        className="p-1 rounded-lg text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#323232] transition-colors"
                        title="Edit Metadata"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-1 rounded-lg text-[#85827C] hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Metadata & Expiry badge */}
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    {doc.documentType && (
                      <span className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-[#323232] border border-[#505050] text-[#B8B5AE]">
                        {doc.documentType}
                      </span>
                    )}

                    {expiry && (
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${isExpired ? 'text-rose-400' : 'text-amber-400'}`}>
                        <Calendar size={12} />
                        <span>{isExpired ? 'Expired' : 'Expires'}: {expiry.toLocaleDateString()}</span>
                      </div>
                    )}

                    {doc.notes && (
                      <p className="text-xs text-[#85827C] line-clamp-2 italic pt-1">
                        "{doc.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Convert Actions */}
                <div className="mt-3 pt-2.5 border-t border-[#505050] flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-[#85827C]">Convert:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openCreateEntityModal(doc, 'task')}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-[#323232] text-[#B8B5AE] hover:bg-[#414141] hover:text-[#F5F3EE] border border-[#505050]"
                    >
                      + Task
                    </button>
                    <button
                      onClick={() => openCreateEntityModal(doc, 'bill')}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-[#323232] text-[#B8B5AE] hover:bg-[#414141] hover:text-[#F5F3EE] border border-[#505050]"
                    >
                      + Bill
                    </button>
                    <button
                      onClick={() => openCreateEntityModal(doc, 'reminder')}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-[#323232] text-[#B8B5AE] hover:bg-[#414141] hover:text-[#F5F3EE] border border-[#505050]"
                    >
                      + Reminder
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#505050] animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#505050] pb-3 mb-4">
              <h3 className="text-base font-semibold text-[#F5F3EE]">Upload Document</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  if (location.pathname.endsWith('/new')) navigate('/documents', { replace: true });
                }}
                className="text-[#85827C] hover:text-[#F5F3EE]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">
                  File (PDF, PNG, JPG, DOCX)
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#B8B5AE] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-[#505050] file:text-xs file:font-semibold file:bg-[#323232] file:text-[#F5F3EE] hover:file:bg-[#414141] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Document Type</label>
                  <input
                    type="text"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    placeholder="e.g. Lease, Insurance, Receipt"
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Expiry / Renewal Date (optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Important information or reference notes..."
                  className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#505050]">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    if (location.pathname.endsWith('/new')) navigate('/documents', { replace: true });
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#323232]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-1.5 rounded-xl bg-[#414141] hover:bg-[#505050] disabled:opacity-50 text-[#F5F3EE] border border-[#505050] text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  <span>{uploading ? 'Uploading...' : 'Save Document'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Document Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#505050] animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#505050] pb-3 mb-4">
              <h3 className="text-base font-semibold text-[#F5F3EE]">Edit Document Metadata</h3>
              <button onClick={() => setEditingDoc(null)} className="text-[#85827C] hover:text-[#F5F3EE]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Document Type</label>
                  <input
                    type="text"
                    value={editDocType}
                    onChange={(e) => setEditDocType(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#505050]">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#323232]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-1.5 rounded-xl bg-[#414141] hover:bg-[#505050] disabled:opacity-50 text-[#F5F3EE] border border-[#505050] text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  {savingEdit && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert to Entity Modal */}
      {entityModalDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#383838] rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#505050] animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#505050] pb-3 mb-4">
              <h3 className="text-base font-semibold text-[#F5F3EE]">
                Create {entityType === 'task' ? 'Task' : entityType === 'bill' ? 'Bill' : 'Reminder'}
              </h3>
              <button onClick={() => setEntityModalDoc(null)} className="text-[#85827C] hover:text-[#F5F3EE]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEntity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={entityTitle}
                  onChange={(e) => setEntityTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#85827C] mb-1">Due Date</label>
                <input
                  type="date"
                  value={entityDueDate}
                  onChange={(e) => setEntityDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                />
              </div>

              {entityType === 'bill' && (
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entityAmount}
                    onChange={(e) => setEntityAmount(e.target.value ? parseFloat(e.target.value) : '')}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] placeholder-[#85827C] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  />
                </div>
              )}

              {entityType === 'task' && (
                <div>
                  <label className="block text-xs font-medium text-[#85827C] mb-1">Priority</label>
                  <select
                    value={entityPriority}
                    onChange={(e) => setEntityPriority(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-[#505050] bg-[#323232] text-[#F5F3EE] text-xs focus:outline-none focus:ring-2 focus:ring-[#505050]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#505050]">
                <button
                  type="button"
                  onClick={() => setEntityModalDoc(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-medium text-[#85827C] hover:text-[#F5F3EE] hover:bg-[#323232]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingEntity}
                  className="px-5 py-1.5 rounded-xl bg-[#414141] hover:bg-[#505050] disabled:opacity-50 text-[#F5F3EE] border border-[#505050] text-xs font-medium transition-all flex items-center gap-1.5"
                >
                  {creatingEntity && <Loader2 size={14} className="animate-spin" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
