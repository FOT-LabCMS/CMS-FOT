import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Loader2,
  ServerCrash,
  ArrowLeft,
  Truck,
  FlaskConical,
  Box,
  Calendar,
  Scale,
  MapPin,
  Info,
  ChevronRight,
  QrCode,
  Printer,
  Download,
  ClipboardList,
  User,
  Hash,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DetailItem = ({ label, value, children, icon: Icon }) => {
  if (!value && !children) {
    return null;
  }

  return (
    <div className="py-4 sm:grid sm:grid-cols-[minmax(140px,0.9fr)_minmax(0,1.6fr)] sm:items-start sm:gap-5 sm:py-5">
      <dt className="flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-[var(--color-text-secondary)]">
        {Icon && <Icon size={16} className="shrink-0" />}
        <span className="min-w-0">{label}</span>
      </dt>

      <dd className="mt-1 min-w-0 break-words text-sm font-semibold leading-6 text-[var(--color-text-primary)] sm:mt-0">
        {children || value || (
          <span className="text-[var(--color-text-muted)]">N/A</span>
        )}
      </dd>
    </div>
  );
};

const getStatus = (expiryDate) => {
  if (!expiryDate) {
    return {
      text: 'No Expiry',
      color: 'bg-gray-100 text-gray-800 border-gray-300',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);

  if (expiry < today) {
    return {
      text: 'Expired',
      color: 'bg-red-100 text-red-800 border-red-400',
    };
  }

  if (expiry <= thirtyDaysFromNow) {
    return {
      text: 'Expiring Soon',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-400',
    };
  }

  return {
    text: 'Good',
    color: 'bg-green-100 text-green-800 border-green-400',
  };
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return format(new Date(value), 'MMM dd, yyyy p');
};

const getUsageStatusStyle = (status) => {
  if (status === 'RETURNED') {
    return 'border-green-300 bg-green-100 text-green-800';
  }

  return 'border-yellow-300 bg-yellow-100 text-yellow-800';
};

const ViewBatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { user } = useAuth();
  const canViewQrCode =
    user &&
    (user.role === 'ADMIN' || user.role === 'TECHNICAL_OFFICER');
  const canDisposeBatch = canViewQrCode;

  const [disposalRemark, setDisposalRemark] = useState('');
  const [isDisposing, setIsDisposing] = useState(false);
  const [disposeError, setDisposeError] = useState('');
  const [disposeSuccess, setDisposeSuccess] = useState(false);

  const scrollToDispose = () => {
    const el = document.getElementById('dispose-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDispose = async () => {
    if (!disposalRemark.trim()) {
      setDisposeError('Please enter a disposal remark before disposing.');
      return;
    }
    setIsDisposing(true);
    setDisposeError('');
    setDisposeSuccess(false);
    try {
      const response = await api.post(`/batches/${id}/dispose`, { remark: disposalRemark });
      if (response.data?.success) {
        setDisposeSuccess(true);
        setBatch(response.data.batch);
      } else {
        throw new Error(response.data?.message || 'Failed to dispose batch.');
      }
    } catch (err) {
      setDisposeError(err.response?.data?.message || err.message || 'Failed to dispose batch.');
    } finally {
      setIsDisposing(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('qr-print-area')?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print QR Code</title>');
    printWindow.document.write(`
      <style>
        body { font-family: sans-serif; text-align: center; padding: 20px; }
        h1 { font-size: 16px; margin: 0 0 5px 0; }
        p { font-size: 12px; margin: 0 0 15px 0; }
        svg { width: 150px; height: 150px; }
      </style>
    `);
    printWindow.document.write(
      '</head><body>' + printContent + '</body></html>',
    );
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPdf = async () => {
    const qrElement = document.getElementById('qr-print-area');
    if (!qrElement) return;

    setIsDownloading(true);

    try {
      const canvas = await html2canvas(qrElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');

      const pdfWidth = 57;
      const pdfHeight = 32;
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfAspectRatio = pdfWidth / pdfHeight;
      const imgAspectRatio = imgProps.width / imgProps.height;

      let finalImgWidth = pdfWidth;
      let finalImgHeight = pdfWidth / imgAspectRatio;

      if (finalImgHeight > pdfHeight) {
        finalImgHeight = pdfHeight;
        finalImgWidth = finalImgHeight * imgAspectRatio;
      }

      const x = (pdfWidth - finalImgWidth) / 2;
      const y = (pdfHeight - finalImgHeight) / 2;

      pdf.addImage(
        imgData,
        'PNG',
        x,
        y,
        finalImgWidth,
        finalImgHeight,
      );
      pdf.save(
        `QR-Label-${batch.chemical?.binCardNumber || 'CHEM'}-${batch.batchNumber}.pdf`,
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const fetchBatch = async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError(null);

        const response = await api.get(`/batches/${id}`);

        if (response.data?.success) {
          setBatch(response.data.batch);
        } else {
          throw new Error('Failed to fetch batch details.');
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Could not find the requested batch.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
    const refreshTimer = window.setInterval(() => fetchBatch({ silent: true }), 30000);

    return () => window.clearInterval(refreshTimer);
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-4 text-center text-[var(--color-text-secondary)]">
        <Loader2
          size={48}
          className="animate-spin text-[var(--color-primary)]"
        />
        <h3 className="text-xl font-semibold">Loading Batch Details...</h3>
        <p>Please wait a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-4 text-center text-[var(--color-danger)]">
        <ServerCrash size={48} />
        <h3 className="text-xl font-semibold">Failed to Load Data</h3>
        <p className="max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/stock/batches')}
          className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-[var(--color-text-inverse)]"
        >
          <ArrowLeft size={18} />
          Back to All Batches
        </button>
      </div>
    );
  }

  if (!batch) return null;

  const status = getStatus(batch.expiryDate);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isExpired = batch.expiryDate && new Date(batch.expiryDate) < today;
  const isDisposed = batch.isDisposed;
  const usageRecords = batch.usages || [];
  const totalUsed = usageRecords.reduce(
    (sum, usage) => sum + Number(usage.quantityUsed || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <main className="px-3 py-4 sm:px-5 sm:py-6 lg:px-7 xl:px-8 xl:py-8">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Header */}
          <header className="mb-6 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-primary-dark)] shadow-[var(--shadow-md)]">
            <div className="relative p-5 sm:p-7 lg:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-[var(--color-primary-light)] opacity-30" />
              <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-10" />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => navigate('/stock/batches')}
                  className="mb-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-primary-light)] bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-inverse)] color-transition hover:bg-[var(--color-primary-light)]"
                >
                  <ArrowLeft size={17} />
                  Back to List
                </button>

                <div className="max-w-3xl">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-accent-light)]">
                      <Truck size={14} />
                      Batch Details
                    </span>
                  </div>

                  <h1 className="break-words text-2xl font-extrabold leading-tight text-[var(--color-text-inverse)] sm:text-3xl lg:text-4xl">
                    {batch.chemical?.canonicalName || 'N/A'}
                  </h1>

                  <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-[var(--color-text-inverse)] opacity-80 sm:text-base">
                    Viewing details for Batch number:{' '}
                    <strong className="font-bold text-[var(--color-accent-light)]">
                      {batch.batchNumber}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Expired & Needs Disposal — Prominent Alert Banner */}
          {canDisposeBatch && isExpired && !isDisposed && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border-2 border-red-400 bg-red-50 p-4 shadow-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 ring-4 ring-red-200">
                  <AlertTriangle className="text-red-600" size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-800">
                    ⚠️ This batch has expired and requires disposal
                  </p>
                  <p className="mt-0.5 text-xs text-red-600">
                    Expired batches must not be used. Please add a disposal
                    remark and confirm disposal to remove it from active
                    inventory.
                  </p>
                </div>
              </div>
              <button
                onClick={scrollToDispose}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-red-700 active:bg-red-800"
              >
                <Trash2 size={15} />
                Dispose This Batch
              </button>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]">
            {/* Left Column */}
            <div className="min-w-0 space-y-6">
              <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                  <Info size={20} className="text-[var(--color-primary)]" />
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                    Batch Information
                  </h2>
                </header>

                <div className="px-4 sm:px-5">
                  <dl className="divide-y divide-[var(--color-border)]">
                    <DetailItem label="Chemical" icon={FlaskConical}>
                      <Link
                        to={`/chemicals/${batch.chemical.id}`}
                        className="break-words text-[var(--color-primary)] hover:underline"
                      >
                        {batch.chemical.canonicalName} (
                        {batch.chemical.binCardNumber})
                      </Link>
                    </DetailItem>

                    <DetailItem
                      label="Supplier"
                      value={batch.supplier}
                      icon={Truck}
                    />
                    <DetailItem
                      label="Batch Number"
                      value={batch.batchNumber}
                      icon={Box}
                    />
                    <DetailItem
                      label="Received Date"
                      value={format(
                        new Date(batch.receivedDate),
                        'MMMM dd, yyyy',
                      )}
                      icon={Calendar}
                    />
                    <DetailItem
                      label="Expiry Date"
                      value={
                        batch.expiryDate
                          ? format(
                              new Date(batch.expiryDate),
                              'MMMM dd, yyyy',
                            )
                          : 'N/A'
                      }
                      icon={Calendar}
                    />
                  </dl>
                </div>
              </section>

              <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                <header className="flex flex-col gap-2 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex items-center gap-3">
                    <ClipboardList
                      size={20}
                      className="text-[var(--color-primary)]"
                    />
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                      Usage History
                    </h2>
                  </div>

                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                    {usageRecords.length} record
                    {usageRecords.length === 1 ? '' : 's'}
                  </span>
                </header>

                <div className="p-4 sm:p-5">
                  {usageRecords.length === 0 ? (
                    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] px-4 py-8 text-center">
                      <ClipboardList
                        size={34}
                        className="mx-auto text-[var(--color-text-muted)]"
                      />
                      <p className="mt-3 text-sm font-semibold text-[var(--color-text-secondary)]">
                        No usage records have been recorded for this batch yet.
                      </p>
                    </div>
                  ) : (
                    <div className={`space-y-4 ${usageRecords.length > 3 ? 'max-h-[520px] overflow-y-auto pr-2' : ''}`}>
                      {usageRecords.map((usage) => (
                        <article
                          key={usage.id}
                          className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 sm:p-5"
                        >
                          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(210px,0.38fr)] md:items-start lg:gap-5">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${getUsageStatusStyle(
                                    usage.returnedStatus,
                                  )}`}
                                >
                                  {usage.returnedStatus}
                                </span>

                                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-secondary)]">
                                  <Hash size={12} className="shrink-0" />
                                  <span className="min-w-0 break-all">
                                    {usage.stuRegisterNum}
                                  </span>
                                </span>
                              </div>

                              <p className="mt-3 flex min-w-0 items-start gap-2 break-words text-sm font-bold leading-6 text-[var(--color-text-primary)]">
                                <User
                                  size={16}
                                  className="mt-1 shrink-0 text-[var(--color-primary)]"
                                />
                                <span className="min-w-0 break-words">
                                  {usage.userName}
                                </span>
                              </p>

                              <p className="mt-2 break-words text-sm leading-6 text-[var(--color-text-secondary)]">
                                {usage.purpose}
                              </p>

                              {usage.remark && (
                                <p className="mt-3 break-words rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs font-medium leading-5 text-[var(--color-text-secondary)]">
                                  <span className="font-bold">Remark:</span>{' '}
                                  {usage.remark}
                                </p>
                              )}
                            </div>

                            <div className="w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left shadow-[var(--shadow-sm)]">
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                                Quantity Used
                              </p>

                              <p className="mt-1 break-words text-xl font-extrabold text-[var(--color-primary)]">
                                {usage.quantityUsed
                                  ? `${parseFloat(usage.quantityUsed)} ${batch.chemical?.baseUnit}`
                                  : 'Pending'}
                              </p>

                              <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3 text-xs leading-5 text-[var(--color-text-secondary)]">
                                <p className="break-words">
                                  <span className="font-semibold">Released:</span>{' '}
                                  {formatDateTime(usage.dateReleased)}
                                </p>
                                <p className="break-words">
                                  <span className="font-semibold">Returned:</span>{' '}
                                  {formatDateTime(usage.dateReturned)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column */}
            <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
              <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                  <Scale size={20} className="text-[var(--color-primary)]" />
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                    Quantity & Status
                  </h2>
                </header>

                <div className="p-4 sm:p-5">
                  <div className="mb-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                      Current Status
                    </p>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-bold ${status.color}`}
                    >
                      {status.text}
                    </span>
                  </div>

                  <dl className="divide-y divide-[var(--color-border)]">
                    <DetailItem label="Quantity Received">
                      {`${parseFloat(batch.quantityReceived)} ${batch.chemical?.baseUnit}`}
                    </DetailItem>

                    <DetailItem label="Current Quantity">
                      {`${parseFloat(batch.currentQuantity)} ${batch.chemical?.baseUnit}`}
                    </DetailItem>

                    <DetailItem label="Low Stock Threshold">
                      <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-bold text-yellow-800">
                        <AlertTriangle size={15} className="shrink-0" />
                        <span className="break-words">
                          {`${parseFloat(batch.lowStockThresholdQuantity)} ${batch.chemical?.baseUnit}`}
                        </span>
                      </span>
                    </DetailItem>

                    <DetailItem label="Recorded Usage">
                      {`${totalUsed
                        .toFixed(2)
                        .replace(/\.?0+$/, '')} ${batch.chemical?.baseUnit}`}
                    </DetailItem>
                  </dl>
                </div>
              </section>
              <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                  <MapPin size={20} className="text-[var(--color-primary)]" />
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                    Storage Location
                  </h2>
                </header>

                <div className="p-4 sm:p-5">
                  {batch.location?.path && batch.location.path.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm font-semibold">
                      {batch.location.path.map((loc, index) => (
                        <React.Fragment key={loc.id}>
                          {index > 0 && (
                            <ChevronRight
                              size={16}
                              className="shrink-0 text-[var(--color-text-muted)]"
                            />
                          )}
                          <Link
                            to={`/locations/${loc.id}`}
                            className="break-words text-[var(--color-primary)] hover:underline"
                          >
                            {loc.name}
                          </Link>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : batch.location ? (
                    <Link
                      to={`/locations/${batch.location.id}`}
                      className="break-words font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      {batch.location.name}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold text-[var(--color-text-muted)]">
                      No location assigned
                    </p>
                  )}
                </div>
              </section>

              {canViewQrCode && (
                <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                  <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4 sm:p-5">
                    <QrCode
                      size={20}
                      className="text-[var(--color-primary)]"
                    />
                    <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                      QR Code & Label
                    </h2>
                  </header>

                  <div className="p-4 text-center sm:p-5">
                    <div className="flex justify-center overflow-x-auto pb-1">
                      <div
                        id="qr-print-area"
                        className="inline-flex max-w-full flex-col items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-sm)]"
                      >
                        <QRCodeSVG
                          value={window.location.href}
                          size={150}
                          includeMargin={true}
                        />
                        <h1 className="mt-3 max-w-[220px] break-words text-center font-bold leading-5 text-[var(--color-text-primary)]">
                          {batch.chemical?.canonicalName}
                        </h1>
                        <p className="mt-1 max-w-[220px] break-all text-center text-sm text-[var(--color-text-secondary)]">
                          Batch: {batch.batchNumber}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] color-transition hover:bg-[var(--color-surface-muted)]"
                      >
                        <Printer size={16} />
                        Print Label
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-bold text-white color-transition hover:bg-[var(--color-primary-light)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isDownloading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        {isDownloading ? 'Downloading...' : 'Download PDF'}
                      </button>
                    </div>
                  </div>
                </section>
              )}


              {/* Dispose Expired Batch section */}
              {canDisposeBatch && isExpired && (
                <section
                  id="dispose-section"
                  className={`overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] ${
                    !isDisposed
                      ? 'border-2 border-red-400 bg-red-50 ring-4 ring-red-100'
                      : 'border border-red-300 bg-red-50'
                  }`}
                >
                  <header className="flex items-center gap-3 border-b border-red-200 bg-red-100 p-4 sm:p-5">
                    <Trash2 size={20} className="text-red-700" />
                    <h2 className="text-base font-bold text-red-800">
                      {isDisposed ? 'Batch Disposed' : 'Dispose Expired Batch'}
                    </h2>
                  </header>

                  <div className="p-4 sm:p-5">
                    {isDisposed ? (
                      // Already disposed – show read-only info
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 size={18} className="shrink-0" />
                          <p className="text-sm font-semibold">This batch has been disposed.</p>
                        </div>
                        {batch.disposedAt && (
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            <span className="font-semibold">Disposed on:</span>{' '}
                            {format(new Date(batch.disposedAt), 'MMMM dd, yyyy p')}
                          </p>
                        )}
                        {batch.disposalRemark && (
                          <div className="rounded-[var(--radius-md)] border border-red-200 bg-white p-3">
                            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
                              <FileText size={13} /> Disposal Remark
                            </p>
                            <p className="mt-1.5 text-sm leading-5 text-[var(--color-text-primary)]">
                              {batch.disposalRemark}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Not yet disposed – show action form
                      <div className="space-y-4">
                        <p className="text-sm leading-5 text-red-700">
                          This batch has <strong>expired</strong> and cannot be released. Add a remark
                          and confirm disposal to remove it from active inventory.
                        </p>

                        <div>
                          <label
                            htmlFor="disposalRemark"
                            className="mb-2 block text-sm font-semibold text-red-800"
                          >
                            Disposal Remark <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="disposalRemark"
                            rows={3}
                            value={disposalRemark}
                            onChange={(e) => {
                              setDisposalRemark(e.target.value);
                              setDisposeError('');
                            }}
                            placeholder="Describe the reason for disposal (e.g. expired stock, contaminated, unusable)..."
                            className="w-full resize-none rounded-[var(--radius-md)] border border-red-300 bg-white px-3 py-2.5 text-sm font-medium text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                          />
                        </div>

                        {disposeError && (
                          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-400 bg-white p-3 text-sm font-medium text-red-700">
                            <AlertTriangle size={16} className="shrink-0" />
                            {disposeError}
                          </div>
                        )}

                        {disposeSuccess && (
                          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-green-400 bg-green-50 p-3 text-sm font-medium text-green-700">
                            <CheckCircle2 size={16} className="shrink-0" />
                            Batch successfully disposed.
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleDispose}
                          disabled={isDisposing}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-red-600 px-4 py-3 text-sm font-bold text-white color-transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isDisposing ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                          {isDisposing ? 'Disposing...' : 'Confirm Disposal'}
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ViewBatchDetail;
