import { useEffect, useState } from 'react';

export default function HealthCheck() {
  const [status, setStatus] = useState<{ status: string } | null>(null);

  useEffect(() => {
    setStatus({ status: 'OK' });
  }, []);

  return <div>{status ? status.status : 'Loading...'}</div>;
}
