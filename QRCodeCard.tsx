import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from './Button';
import { Download, Copy, Check } from 'lucide-react';
import { useToast } from './Toast';

interface QRCodeCardProps {
  url: string;
  title?: string;
  subtitle?: string;
  downloadFileName?: string;
}

export const QRCodeCard = ({
  url,
  title = 'Scan to RSVP',
  subtitle,
  downloadFileName = 'event-rsvp-qr.png',
}: QRCodeCardProps) => {
  const [qrSrc, setQrSrc] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => setQrSrc(dataUrl))
      .catch((err) => console.error('QR generation error:', err));
  }, [url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      success('RSVP link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      error('Failed to copy link');
    }
  };

  const handleDownload = () => {
    if (!qrSrc) return;
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    success('QR Code downloaded!');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        maxWidth: 320,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      {title && (
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {title}
        </h4>
      )}
      {subtitle && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          {subtitle}
        </p>
      )}

      <div
        style={{
          padding: 8,
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#FFFFFF',
          marginBottom: 16,
        }}
      >
        {qrSrc ? (
          <img src={qrSrc} alt="Event RSVP QR Code" style={{ width: 180, height: 180, display: 'block' }} />
        ) : (
          <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generating QR...</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyLink}
          icon={copied ? <Check size={14} /> : <Copy size={14} />}
          style={{ flex: 1 }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleDownload}
          icon={<Download size={14} />}
          style={{ flex: 1 }}
        >
          Download
        </Button>
      </div>
    </div>
  );
};
