import { useEffect, useState } from 'react';

function HealthCheck() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch((err) => console.error('Error fetching health:', err));
  }, []);

  return <div>{status ? JSON.stringify(status) : 'Checking health...'}</div>;
}

export default HealthCheck;
