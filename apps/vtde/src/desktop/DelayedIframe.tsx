import { useEffect, useState } from 'react';

interface DelayedIframeProps {
  url: string;
  title: string;
  probeTimeoutMs?: number;
}

export function DelayedIframe({ url, title, probeTimeoutMs = 15000 }: DelayedIframeProps) {
  const needsProbe = url.startsWith('http://localhost');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    needsProbe ? 'loading' : 'ready',
  );
  const [reloadKey, setReloadKey] = useState(0);
  const effectiveStatus = needsProbe ? status : 'ready';

  useEffect(() => {
    if (!needsProbe || status !== 'loading') {
      return;
    }

    const timer = setTimeout(() => {
      setStatus('error');
    }, probeTimeoutMs);

    return () => {
      clearTimeout(timer);
    };
  }, [needsProbe, probeTimeoutMs, status]);

  if (effectiveStatus === 'error') {
    return (
      <div className="vtde-app-iframe vtde-app-iframe--error">
        <p className="vtde-app-iframe__message">
          The local application server did not become ready in time.
        </p>
        <button
          className="vtde-app-iframe__retry"
          onClick={() => {
            setStatus('loading');
            setReloadKey((value) => value + 1);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!needsProbe) {
    return (
      <iframe
        className="vtde-app-iframe vtde-app-iframe--frame"
        src={url}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    );
  }

  return (
    <div className="vtde-app-iframe vtde-app-iframe--container">
      {status === 'loading' && (
        <div className="vtde-app-iframe__loading">
          <div className="vtde-app-iframe__spinner"></div>
          <p className="vtde-app-iframe__loading-text">Starting Local Application Server...</p>
        </div>
      )}
      <iframe
        key={reloadKey}
        className="vtde-app-iframe__frame"
        src={url}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms"
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}
