const BASE_URL = 'https://app.omegapayments.com.br/api/v1';

function credentials() {
  const publicKey = process.env.OMEGAPAY_PUBLIC_KEY?.trim();
  const secretKey = process.env.OMEGAPAY_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) throw new Error('Credenciais da OmegaPay não configuradas.');
  return { publicKey, secretKey };
}

export async function createPixCharge(payload) {
  const { publicKey, secretKey } = credentials();
  const response = await fetch(`${BASE_URL}/gateway/pix/receive`, {
    method: 'POST',
    headers: {
      'x-public-key': publicKey,
      'x-secret-key': secretKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `OmegaPay HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}
