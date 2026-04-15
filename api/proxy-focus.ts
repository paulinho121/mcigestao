export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const token = url.searchParams.get('token');

  if (!path || !token) {
    return new Response(JSON.stringify({ error: 'Missing path or token' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const focusUrl = `https://api.focusnfe.com.br${path}`;
  
  try {
    const response = await fetch(focusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(token + ':')}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.text();
    return new Response(data, { 
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Focus Proxy Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
