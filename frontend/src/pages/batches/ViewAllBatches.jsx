import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Plus, Loader2, ServerCrash, Search, Pencil, QrCode, X, Printer, Download, Save, AlertTriangle, Box, Calendar, MapPin, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const getStatus = (batch) => {
  const { expiryDate, currentQuantity, lowStockThresholdQuantity } = batch;
  const currentQty = Number(currentQuantity);
  const thresholdQty = Number(lowStockThresholdQuantity);

  if (currentQty <= 0) {
    return { text: 'Out of Stock', color: 'bg-zinc-200 text-zinc-800' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (expiryDate) {
    const expiry = new Date(expiryDate);
    if (expiry < today) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800' };
    }
  }

  if (Number.isFinite(thresholdQty) && thresholdQty >= 0 && currentQty <= thresholdQty) {
    return { text: 'Low Stock', color: 'bg-orange-100 text-orange-800' };
  }

  if (expiryDate) {
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    if (expiry <= thirtyDaysFromNow) {
      return { text: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800' };
    }
  }

  return { text: 'Good', color: 'bg-green-100 text-green-800' };
};

const QrCodeModal = ({ batch, onClose }) => {
  const qrValue = `${window.location.origin}/stock/batches/${batch.id}`;
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    const printContent = document.getElementById('qr-print-area-modal')?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print QR Label</title>');
    printWindow.document.write(`
      <style>
        body { 
          text-align: center; 
          padding: 15px; 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
        } 
        h1 { font-size: 15px; margin: 0 0 4px 0; color: #111827; } 
        p { font-size: 11px; margin: 0 0 6px 0; color: #4b5563; } 
        svg { width: 160px; height: 160px; margin: 0 auto; }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPdf = async () => {
    const qrElement = document.getElementById('qr-print-area-modal');
    if (!qrElement) return;

    setIsDownloading(true);

    try {
      const canvas = await html2canvas(qrElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 60;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`QR-Label-${batch.chemical?.chemicalCode || 'CHEM'}-${batch.batchNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">
          <X size={20} />
        </button>
        <div id="qr-print-area-modal" className="flex flex-col items-center rounded-md bg-white p-5 text-center">
          <h1 className="text-base font-bold text-gray-900 leading-snug">{batch.chemical?.canonicalName}</h1>
          <p className="mt-0.5 text-xs font-medium text-gray-500">
            {batch.chemical?.chemicalCode ? `Chemical Code: ${batch.chemical.chemicalCode}` : ''}
          </p>

          <div className="my-3">
            <QRCodeSVG value={qrValue} size={175} includeMargin={true} />
          </div>

          {/* QR Representation Code & Details (Rendered below QR on screen, print, and PDF) */}
          <div className="mt-1 flex flex-col items-center gap-1.5 w-full">
            <div className="inline-flex items-center justify-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 font-mono text-sm font-extrabold text-gray-900 border border-gray-300 shadow-sm">
              <span className="text-gray-500 font-semibold text-xs">BATCH NO:</span>
              <span className="text-[var(--color-primary)]">{batch.batchNumber}</span>
            </div>

            {batch.chemical?.binCardNumber && (
              <p className="text-xs font-mono font-semibold text-gray-700">
                Bin Card No: {batch.chemical.binCardNumber}
              </p>
            )}

            <p className="text-[10px] font-mono text-gray-400 break-all max-w-[220px]">
              ID: {batch.id}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)]">
              <Printer size={16} /> Print Label
          </button>
          <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-70">
              {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditBatchModal = ({ batch, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    supplier: batch.supplier || '',
    batchNumber: batch.batchNumber || '',
    quantityReceived: batch.quantityReceived || '',
    currentQuantity: batch.currentQuantity || '',
    lowStockThresholdQuantity: batch.lowStockThresholdQuantity || '',
    expiryDate: batch.expiryDate || '',
    receivedDate: batch.receivedDate || '',
    locationId: batch.locationId || '',
  });
  const [locations, setLocations] = useState([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchLocations = async () => {
      const buildLocationPaths = (items) => {
        const locationMap = new Map(items.map((loc) => [loc.id, loc]));

        const getPath = (locationId) => {
          const path = [];
          let currentLocation = locationMap.get(locationId);

          while (currentLocation) {
            path.unshift(currentLocation.name);
            currentLocation = locationMap.get(currentLocation.parentLocationId);
          }

          return path.join(' > ');
        };

        return items
          .map((loc) => ({ ...loc, pathName: getPath(loc.id) }))
          .sort((a, b) => a.pathName.localeCompare(b.pathName));
      };

      try {
        setIsLoadingLocations(true);
        const response = await api.get('/locations');

        if (response.data?.success) {
          setLocations(buildLocationPaths(response.data.locations));
        }
      } catch (error) {
        setSubmitError(error.response?.data?.message || 'Could not load locations.');
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setSubmitError('');
  };

  const validateForm = () => {
    const nextErrors = {};
    const quantityReceived = Number(formData.quantityReceived);
    const currentQuantity = Number(formData.currentQuantity);
    const thresholdQuantity = Number(formData.lowStockThresholdQuantity);

    if (!formData.batchNumber.trim()) {
      nextErrors.batchNumber = 'Batch Number is required.';
    }

    if (!formData.quantityReceived) {
      nextErrors.quantityReceived = 'Quantity received is required.';
    } else if (Number.isNaN(quantityReceived) || quantityReceived <= 0) {
      nextErrors.quantityReceived = 'Quantity received must be greater than zero.';
    }

    if (formData.currentQuantity === '') {
      nextErrors.currentQuantity = 'Current quantity is required.';
    } else if (Number.isNaN(currentQuantity) || currentQuantity < 0) {
      nextErrors.currentQuantity = 'Current quantity must be zero or greater.';
    } else if (!Number.isNaN(quantityReceived) && currentQuantity > quantityReceived) {
      nextErrors.currentQuantity = 'Current quantity cannot be greater than quantity received.';
    }

    if (formData.lowStockThresholdQuantity === '') {
      nextErrors.lowStockThresholdQuantity = 'Low stock threshold is required.';
    } else if (Number.isNaN(thresholdQuantity) || thresholdQuantity < 0) {
      nextErrors.lowStockThresholdQuantity = 'Threshold must be zero or greater.';
    } else if (!Number.isNaN(quantityReceived) && thresholdQuantity > quantityReceived) {
      nextErrors.lowStockThresholdQuantity = 'Threshold cannot be greater than quantity received.';
    }

    if (!formData.receivedDate) {
      nextErrors.receivedDate = 'Received date is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      setSubmitError('Please correct the highlighted fields.');
      return;
    }

    try {
      setIsSaving(true);
      setSubmitError('');
      const response = await api.put(`/batches/${batch.id}`, {
        ...formData,
        quantityReceived: Number(formData.quantityReceived),
        currentQuantity: Number(formData.currentQuantity),
        lowStockThresholdQuantity: Number(formData.lowStockThresholdQuantity),
        expiryDate: formData.expiryDate || null,
        locationId: formData.locationId || null,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to update batch.');
      }

      onSuccess(response.data.batch);
      onClose();
    } catch (error) {
      setSubmitError(error.response?.data?.message || error.message || 'Failed to update batch.');
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = (fieldName) =>
    `w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] color-transition ${
      errors[fieldName] ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
    }`;

  const unit = batch.chemical?.baseUnit || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-dark)]">Edit Batch</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{batch.chemical?.canonicalName || 'Stock Batch'}</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{batch.chemical?.chemicalCode}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="batchNumber" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Batch Number</label>
              <input id="batchNumber" name="batchNumber" type="text" value={formData.batchNumber} onChange={handleChange} className={fieldClass('batchNumber')} />
              {errors.batchNumber && <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">{errors.batchNumber}</p>}
            </div>

            <div>
              <label htmlFor="supplier" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Supplier</label>
              <input id="supplier" name="supplier" type="text" value={formData.supplier} onChange={handleChange} placeholder="Optional" className={fieldClass('supplier')} />
            </div>

            <div>
              <label htmlFor="quantityReceived" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Quantity Received</label>
              <div className="relative">
                <Box size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input id="quantityReceived" name="quantityReceived" type="number" min="0" step="0.01" value={formData.quantityReceived} onChange={handleChange} className={`${fieldClass('quantityReceived')} pl-11 pr-20`} />
                {unit && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-secondary)]">{unit}</span>}
              </div>
              {errors.quantityReceived && <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">{errors.quantityReceived}</p>}
            </div>

            <div>
              <label htmlFor="currentQuantity" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Current Quantity</label>
              <div className="relative">
                <Box size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input id="currentQuantity" name="currentQuantity" type="number" min="0" step="0.01" value={formData.currentQuantity} onChange={handleChange} className={`${fieldClass('currentQuantity')} pl-11 pr-20`} />
                {unit && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-secondary)]">{unit}</span>}
              </div>
              {errors.currentQuantity && <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">{errors.currentQuantity}</p>}
            </div>

            <div>
              <label htmlFor="lowStockThresholdQuantity" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Low Stock Alert Threshold</label>
              <div className="relative">
                <AlertTriangle size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input id="lowStockThresholdQuantity" name="lowStockThresholdQuantity" type="number" min="0" step="0.01" value={formData.lowStockThresholdQuantity} onChange={handleChange} className={`${fieldClass('lowStockThresholdQuantity')} pl-11 pr-20`} />
                {unit && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--color-text-secondary)]">{unit}</span>}
              </div>
              {errors.lowStockThresholdQuantity && <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">{errors.lowStockThresholdQuantity}</p>}
            </div>

            <div>
              <label htmlFor="locationId" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Storage Location</label>
              <div className="relative">
                <MapPin size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <select id="locationId" name="locationId" value={formData.locationId} onChange={handleChange} disabled={isLoadingLocations} className={`${fieldClass('locationId')} appearance-none pl-11 pr-10 disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)]`}>
                  <option value="">{isLoadingLocations ? 'Loading...' : 'Assign later'}</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.pathName}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              </div>
            </div>

            <div>
              <label htmlFor="receivedDate" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Received Date</label>
              <div className="relative">
                <Calendar size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input id="receivedDate" name="receivedDate" type="date" value={formData.receivedDate} onChange={handleChange} className={`${fieldClass('receivedDate')} pl-11`} />
              </div>
              {errors.receivedDate && <p className="mt-2 text-xs font-medium text-[var(--color-danger)]">{errors.receivedDate}</p>}
            </div>

            <div>
              <label htmlFor="expiryDate" className="mb-2 block text-sm font-semibold text-[var(--color-text-primary)]">Expiry Date</label>
              <div className="relative">
                <Calendar size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input id="expiryDate" name="expiryDate" type="date" value={formData.expiryDate || ''} onChange={handleChange} className={`${fieldClass('expiryDate')} pl-11`} />
              </div>
            </div>
          </div>

          {submitError && (
            <div className="mt-5 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-red-50 p-3 text-sm font-medium text-[var(--color-danger)]">
              <AlertTriangle size={17} />
              {submitError}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSaving} className="inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-70">
              {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ViewAllBatches = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [qrModalBatch, setQrModalBatch] = useState(null);
  const [editingBatch, setEditingBatch] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        setLoading((previous) => previous || batches.length === 0);
        setError(null);
        const response = await api.get('/batches');
        if (response.data?.success) {
          setBatches(response.data.batches);
        } else {
          throw new Error('Failed to fetch batches from the server.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'An unknown error occurred.');
        console.error("Error fetching batches:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
    const refreshTimer = window.setInterval(fetchBatches, 30000);

    return () => window.clearInterval(refreshTimer);
  }, [batches.length]);

  const filteredBatches = useMemo(() =>
    batches.filter(batch =>
      (batch.chemical?.canonicalName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (batch.supplier?.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [batches, searchTerm]);

  const canViewQrCode = user && (user.role === 'ADMIN' || user.role === 'TECHNICAL_OFFICER');
  const canEditBatch = canViewQrCode;

  const handleBatchUpdated = (updatedBatch) => {
    setBatches((prev) => prev.map((batch) => (batch.id === updatedBatch.id ? updatedBatch : batch)));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-[var(--color-text-secondary)]">
          <Loader2 size={40} className="animate-spin text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold">Loading Stock Batches...</h3>
          <p>Please wait while we fetch the inventory data.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-danger)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-danger)]">
          <ServerCrash size={40} />
          <h3 className="text-lg font-semibold">Failed to Load Batches</h3>
          <p className="max-w-md">{error}</p>
        </div>
      );
    }

    if (filteredBatches.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-20 text-center text-[var(--color-text-secondary)]">
          <Truck size={40} />
          <h3 className="text-lg font-semibold">No Batches Found</h3>
          <p>Your inventory is empty. Add a new stock batch to get started.</p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border)] text-sm">
            <thead className="bg-[var(--color-surface-muted)]">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Chemical</th>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Batch No.</th>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Quantity</th>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Supplier</th>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Received</th>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Expires</th>
                <th scope="col" className="px-4 py-3.5 text-left font-semibold text-[var(--color-text-primary)]">Status</th>
                <th scope="col" className="relative px-4 py-3.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredBatches.map(batch => {
                const status = getStatus(batch);
                return (
                  <tr
                    key={batch.id}
                    className="cursor-pointer hover:bg-[var(--color-surface-muted)]"
                    onClick={() => navigate(`/stock/batches/${batch.id}`)}
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-[var(--color-text-primary)]">
                      <div className="font-bold">{batch.chemical?.canonicalName || 'N/A'}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">{batch.chemical?.chemicalCode}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--color-text-secondary)]">{batch.batchNumber}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--color-text-secondary)]">
                      <span className="font-semibold text-[var(--color-text-primary)]">{parseFloat(batch.currentQuantity)}</span> / {parseFloat(batch.quantityReceived)} {batch.chemical?.baseUnit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--color-text-secondary)]">{batch.supplier || 'N/A'}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--color-text-secondary)]">{format(new Date(batch.receivedDate), 'MMM dd, yyyy')}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--color-text-secondary)]">{batch.expiryDate ? format(new Date(batch.expiryDate), 'MMM dd, yyyy') : 'N/A'}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {canViewQrCode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setQrModalBatch(batch); }}
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-text-primary)]"
                            title="Show QR Code"
                          ><QrCode size={16} /></button>
                        )}
                        {canEditBatch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingBatch(batch);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-white hover:text-[var(--color-text-primary)]"
                            title="Edit Batch"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {qrModalBatch && <QrCodeModal batch={qrModalBatch} onClose={() => setQrModalBatch(null)} />}
      {editingBatch && (
        <EditBatchModal
          batch={editingBatch}
          onClose={() => setEditingBatch(null)}
          onSuccess={handleBatchUpdated}
        />
      )}
    <main
      className="
        min-h-screen
        px-4 py-5
        sm:px-6
        lg:px-8 lg:py-8
      "
    >
      <div className="mx-auto w-full max-w-7xl">
          {/* Page header */}
          <header className="mb-8 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                      <Truck size={14} />
                      Procurement & Stock
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    All Stock Batches
                  </h1>
                </div>
                <div className="shrink-0">
                  <Link
                    to="/stock/add"
                    className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-[var(--color-primary-dark)] shadow-[var(--shadow-sm)] color-transition hover:bg-[var(--color-accent-light)]"
                  >
                    <Plus size={18} />
                    Add New Batch
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* Search and Filter Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by chemical, batch no, or supplier..."
                className="w-full max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-3 pl-12 pr-4 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] color-transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-tint)]"
              />
            </div>
          </div>

          {/* Content Area */}
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default ViewAllBatches;
