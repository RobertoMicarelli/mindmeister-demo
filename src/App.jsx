import React, { useEffect, useState } from 'react';

const CLIENT_ID = "SC42NPAvo_Kyx4j0mwywh6qnGqdXMMpl5GYnSfqgxzs";
const CLIENT_SECRET = "PNvybtsb36E8ugzey9yL_SHneGmfrOL0lh7WEbdrb7M";
const REDIRECT_URI = "https://robertomicarelli.github.io/mindmeister-demo/";

// API Keys per autenticazione alternativa
const API_SHARED_KEY = "546bdb3aea72993ec65a74b80dc713abb9cd272da75006364ced7b4e20ad6038eb5e0b1937ba629293038ad02c81144e9b79861166932067db6e84964d49eeca";
const API_SECRET_KEY = "e51a3f4edff253b58d16fcc07d734c56fecde4ca41d25b32d80eafdf8073fc7a20ffc00caa42ea927f8f4f59c61e844fabcbe69eff763c1f90bb8720fa1ed60b";

// Per test locale, usa: "http://localhost:3000/"
// SCOPES rimossi completamente - causavano errori OAuth

export default function App(){
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('idle');
  const [mapUrl, setMapUrl] = useState(null);
  const [embedUrl, setEmbedUrl] = useState(null);


  const loginToMindMeister = () => {
    // Temporaneamente riabilitato per test
    try {
      const u = new URL('https://www.mindmeister.com/oauth2/authorize');
      u.searchParams.set('response_type', 'code');
      u.searchParams.set('client_id', CLIENT_ID);
      u.searchParams.set('redirect_uri', REDIRECT_URI);
      // Scope rimosso completamente - causava errori OAuth
      u.searchParams.set('state', crypto.randomUUID());
      
      const oauthUrl = u.toString();
      console.log('OAuth URL:', oauthUrl);
      console.log('Client ID:', CLIENT_ID);
      console.log('Redirect URI:', REDIRECT_URI);
      
      // Verifica che l'URL non contenga scope
      if (oauthUrl.includes('scope=')) {
        console.error('ERRORE: URL contiene ancora scope!');
        alert('Errore: URL OAuth contiene ancora scope. Controlla il codice.');
        return;
      }
      
      console.log('Usando Authorization Code Flow con client_secret');
      
      window.location.assign(oauthUrl);
    } catch (error) {
      console.error('Errore durante il login:', error);
      alert('Errore durante il login a MindMeister. Controlla la console per dettagli.');
    }
  };

  useEffect(() => {
    const handleOAuth = async () => {
      try {
      console.log('App loaded, checking for OAuth response...');
      console.log('Current URL:', window.location.href);
      console.log('Hash:', window.location.hash);
      console.log('Search params:', window.location.search);
      
      // Controlla se abbiamo un code nei parametri query (Authorization Code Flow)
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get('code');
      
      if (authCode) {
        console.log('Authorization code ricevuto:', authCode);
        setStatus('uploading');
        
        // Prova l'exchange del code per token
        const success = await exchangeCodeForToken(authCode);
        if (!success) {
          console.log('Exchange fallito, provando a ricaricare la pagina...');
          // Se l'exchange fallisce, ricarica la pagina per provare di nuovo
          window.location.reload();
        }
        return;
      }
      
      // Controlla se abbiamo un token nell'hash (Implicit Flow)
      const hash = new URLSearchParams(window.location.hash.replace('#',''));
      const t = hash.get('access_token');
      const error = hash.get('error');
      const errorDescription = hash.get('error_description');
      const state = hash.get('state');
      
      console.log('OAuth parameters:', { 
        hasToken: !!t, 
        error, 
        errorDescription, 
        state,
        hashLength: window.location.hash.length 
      });
      
      if (error) {
        console.error('OAuth Error:', error, errorDescription);
        alert(`Errore OAuth: ${error}\n${errorDescription || ''}\n\nProva a ricaricare la pagina o ricollegare l'account.`);
        setStatus('error');
        return;
      }
      
      if (t) {
        console.log('Token ricevuto con successo, length:', t.length);
        setToken(t);
        localStorage.setItem('mm_token', t);
        window.history.replaceState({}, '', window.location.pathname);
        setStatus('idle');
      } else {
        const saved = localStorage.getItem('mm_token');
        if (saved) {
          console.log('Token recuperato da localStorage, length:', saved.length);
          setToken(saved);
        } else {
          console.log('Nessun token trovato');
          
          // Controlla se siamo tornati dalla pagina di autorizzazione
          if (window.location.search.includes('error=') || window.location.search.includes('state=')) {
            console.log('Ritorno da pagina di autorizzazione senza token');
            // Pulisci l'URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }
      } catch (error) {
        console.error('Errore durante il parsing del token:', error);
        setStatus('error');
      }
    };
    
    handleOAuth();
  }, []);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(md|opml)$/i.test(f.name)) return alert('Accetto solo .md o .opml');
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!/\.(md|opml)$/i.test(f.name)) return alert('Accetto solo .md o .opml');
    setFile(f);
  };

  const testApiKeyAuth = async () => {
    try {
      console.log('Testing API Key authentication...');
      
      // Prova diversi endpoint e metodi di autenticazione
      const endpoints = [
        {
          url: 'https://www.mindmeister.com/api/v2/user',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${API_SHARED_KEY}` }
        },
        {
          url: 'https://www.mindmeister.com/api/v2/user',
          method: 'GET',
          headers: { 'X-API-Key': API_SHARED_KEY }
        },
        {
          url: 'https://www.mindmeister.com/api/v2/user',
          method: 'GET',
          headers: { 'Authorization': `APIKey ${API_SHARED_KEY}` }
        },
        {
          url: 'https://www.mindmeister.com/api/v2/maps',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${API_SHARED_KEY}` }
        },
        {
          url: 'https://www.mindmeister.com/api/v2/maps',
          method: 'GET',
          headers: { 'X-API-Key': API_SHARED_KEY }
        },
        {
          url: 'https://www.mindmeister.com/api/v1/user',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${API_SHARED_KEY}` }
        },
        {
          url: 'https://www.mindmeister.com/api/v1/maps',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${API_SHARED_KEY}` }
        },
        {
          url: 'https://www.mindmeister.com/api/user',
          method: 'GET',
          headers: { 'Authorization': `Bearer ${API_SHARED_KEY}` }
        },
        {
          url: 'https://www.mindmeister.com/api/v2/user',
          method: 'GET',
          headers: { 
            'Authorization': `Basic ${btoa(`${API_SHARED_KEY}:${API_SECRET_KEY}`)}`
          }
        },
        {
          url: 'https://www.mindmeister.com/api/v2/maps',
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_SHARED_KEY}`
          },
          body: JSON.stringify({ 
            name: 'Test Map', 
            theme: 'Aquarelle', 
            layout: 'mindmap' 
          })
        }
      ];
      
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        console.log(`Testing endpoint ${i + 1}:`, endpoint.url, endpoint.method);
        
        try {
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: endpoint.headers,
            body: endpoint.body
          });
          
          console.log(`Endpoint ${i + 1} response status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Endpoint ${i + 1} successful:`, data);
            alert(`API Key authentication successful!\nEndpoint: ${endpoint.url}\nMethod: ${endpoint.method}\nHeaders: ${JSON.stringify(endpoint.headers)}`);
            return true;
          } else {
            const errorText = await response.text();
            console.log(`Endpoint ${i + 1} failed:`, response.status, errorText.substring(0, 200));
          }
        } catch (error) {
          console.log(`Endpoint ${i + 1} error:`, error.message);
        }
      }
      
      console.error('All API Key authentication attempts failed');
      alert('API Key authentication failed. Check console for details.\n\nProva ora l\'OAuth che dovrebbe funzionare!');
      return false;
      
    } catch (error) {
      console.error('Errore durante test API Key:', error);
      alert('Errore durante test API Key: ' + error.message);
      return false;
    }
  };

  const exchangeCodeForToken = async (code) => {
    try {
      console.log('Exchanging code for token...');
      console.log('Code:', code);
      console.log('Client ID:', CLIENT_ID);
      console.log('Client Secret:', CLIENT_SECRET ? 'Presente' : 'Mancante');
      console.log('Redirect URI:', REDIRECT_URI);
      
      // Exchange del code per token usando client_secret
      const tokenUrl = 'https://www.mindmeister.com/oauth2/token';
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
      });
      
      console.log('Token URL:', tokenUrl);
      console.log('Request body:', body.toString());
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body
      });
      
      console.log('Token exchange response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const tokenData = await response.json();
        console.log('Token exchange successful:', tokenData);
        
        if (tokenData.access_token) {
          console.log('Access token ricevuto, length:', tokenData.access_token.length);
          setToken(tokenData.access_token);
          localStorage.setItem('mm_token', tokenData.access_token);
          window.history.replaceState({}, '', window.location.pathname);
          setStatus('idle');
          alert('OAuth completato con successo! Token salvato.');
          return true;
        } else {
          console.error('Token response non contiene access_token:', tokenData);
          alert('Errore: Response non contiene access_token');
          return false;
        }
      } else {
        const errorText = await response.text();
        console.error('Token exchange failed:', response.status, errorText);
        
        // Prova a parsare l'errore JSON se possibile
        try {
          const errorJson = JSON.parse(errorText);
          alert(`Errore exchange token: ${response.status}\n${errorJson.error || ''}\n${errorJson.error_description || ''}`);
        } catch {
          alert(`Errore exchange token: ${response.status}\n${errorText.substring(0, 200)}`);
        }
        return false;
      }
    } catch (error) {
      console.error('Errore durante exchange token:', error);
      alert('Errore durante exchange del code per token: ' + error.message);
      return false;
    }
  };

  const testToken = async (tokenToTest) => {
    try {
      console.log('Testing token validity...');
      const response = await fetch('https://www.mindmeister.com/api/v2/user', {
        headers: { 'Authorization': 'Bearer ' + tokenToTest }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('Token valido, user:', userData.name || userData.email);
        return true;
      } else {
        console.log('Token non valido, status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Errore test token:', error);
      return false;
    }
  };

  const uploadWithApiKeys = async () => {
    if (!file) {
      alert('Seleziona un file .md o .opml');
      return;
    }
    
    try {
      setStatus('uploading');
      console.log('Upload con API Keys iniziato...');
      console.log('File:', file.name);
      
      // Prova diversi endpoint e metodi per le API Keys
      const endpoints = [
        {
          url: 'https://www.mindmeister.com/api/v2/maps',
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_SHARED_KEY}`
          },
          body: JSON.stringify({ 
            name: 'Import ' + new Date().toLocaleString(), 
            theme: 'Aquarelle', 
            layout: 'mindmap' 
          })
        },
        {
          url: 'https://www.mindmeister.com/api/v2/maps',
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': API_SHARED_KEY
          },
          body: JSON.stringify({ 
            name: 'Import ' + new Date().toLocaleString(), 
            theme: 'Aquarelle', 
            layout: 'mindmap' 
          })
        }
      ];
      
      let mapId = null;
      let successfulEndpoint = null;
      
      for (let i = 0; i < endpoints.length; i++) {
        const endpoint = endpoints[i];
        console.log(`Tentativo ${i + 1}:`, endpoint.url, endpoint.method);
        
        try {
          const response = await fetch(endpoint.url, {
            method: endpoint.method,
            headers: endpoint.headers,
            body: endpoint.body
          });
          
          console.log(`Tentativo ${i + 1} response status:`, response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Tentativo ${i + 1} successful:`, data);
            mapId = data.id || data.map_id;
            successfulEndpoint = endpoint;
            break;
          } else {
            const errorText = await response.text();
            console.log(`Tentativo ${i + 1} failed:`, response.status, errorText.substring(0, 200));
          }
        } catch (error) {
          console.log(`Tentativo ${i + 1} error:`, error.message);
        }
      }
      
      if (!mapId) {
        throw new Error('Impossibile creare mappa con API Keys');
      }
      
      console.log('Mappa creata con successo, ID:', mapId);
      
      // Ora importa il file nella mappa
      const fd = new FormData();
      fd.append('file', file);
      fd.append('format', file.name.toLowerCase().endsWith('.opml') ? 'opml' : 'markdown');
      
      const importResponse = await fetch(`https://www.mindmeister.com/api/v2/maps/${mapId}/import`, {
        method: 'POST',
        headers: { 
          'Authorization': successfulEndpoint.headers.Authorization || `X-API-Key: ${API_SHARED_KEY}`
        },
        body: fd
      });
      
      if (!importResponse.ok) {
        const errorText = await importResponse.text();
        throw new Error(`Import failed: ${importResponse.status} - ${errorText}`);
      }
      
      const link = `https://www.mindmeister.com/map/${mapId}`;
      console.log('Success! Map URL:', link);
      
      setMapUrl(link);
      setEmbedUrl(`https://www.mindmeister.com/maps/${mapId}/embed`);
      setStatus('done');
      alert('Upload completato con successo usando API Keys!');
      
    } catch (error) {
      console.error('Upload API Keys error:', error);
      setStatus('error');
      alert(`Errore durante upload con API Keys: ${error.message}`);
    }
  };

  const upload = async () => {
    console.log('Upload iniziato...');
    console.log('Token presente:', !!token);
    console.log('File presente:', !!file);
    console.log('File name:', file?.name);
    
    if (!token) {
      console.log('Nessun token, avvio login OAuth...');
      return loginToMindMeister();
    }
    if (!file) {
      console.log('Nessun file selezionato');
      return alert('Seleziona un file .md o .opml');
    }
    
    try {
      setStatus('uploading');
      console.log('Inizio upload con token:', token.substring(0, 20) + '...');
      
      // Test del token prima di procedere
      const isTokenValid = await testToken(token);
      if (!isTokenValid) {
        console.log('Token non valido, richiedo nuovo login');
        localStorage.removeItem('mm_token');
        setToken(null);
        return loginToMindMeister();
      }
      
      console.log('Token valido, creo mappa...');
      const createRes = await fetch('https://www.mindmeister.com/api/v2/maps', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Import ' + new Date().toLocaleString(), theme: 'Aquarelle', layout: 'mindmap' })
      });
      
      console.log('Create map response status:', createRes.status);
      
      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error('Create map failed:', createRes.status, errorText);
        throw new Error(`Create map failed: ${createRes.status} - ${errorText}`);
      }
      
      const created = await createRes.json();
      console.log('Map created successfully:', created);
      
      const mapId = created.id || created.map_id;
      console.log('Map ID:', mapId);
      
      const fd = new FormData();
      fd.append('file', file);
      fd.append('format', file.name.toLowerCase().endsWith('.opml') ? 'opml' : 'markdown');
      
      console.log('Uploading file:', file.name, 'format:', file.name.toLowerCase().endsWith('.opml') ? 'opml' : 'markdown');
      
      const impRes = await fetch(`https://www.mindmeister.com/api/v2/maps/${mapId}/import`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
      });
      
      console.log('Import response status:', impRes.status);
      
      if (!impRes.ok) {
        const errorText = await impRes.text();
        console.error('Import failed:', impRes.status, errorText);
        throw new Error(`Import failed: ${impRes.status} - ${errorText}`);
      }
      
      const link = created.web_url || `https://www.mindmeister.com/map/${mapId}`;
      console.log('Success! Map URL:', link);
      
      setMapUrl(link);
      setEmbedUrl(`https://www.mindmeister.com/maps/${mapId}/embed`);
      setStatus('done');
    } catch (err) {
      console.error('Upload error:', err);
      setStatus('error');
      alert(`Errore durante l'upload: ${err.message}`);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>MindMeister Import • Demo</h1>
        <p className="lead">Upload <strong>.md</strong>/<strong>.opml</strong>, OAuth e apertura mappa su MindMeister.</p>
        <div
          className={['drop', drag ? 'drag' : ''].join(' ')}
          onDragOver={(e)=>{e.preventDefault(); setDrag(true)}}
          onDragLeave={()=>setDrag(false)}
          onDrop={onDrop}
        >
          <input id="file" className="hidden" type="file" accept=".md,.opml" onChange={onPick} />
          <label htmlFor="file" className="button" style={{display:'inline-block'}}>Seleziona file</label>
          <div className="meta">{file ? <>File: <strong>{file.name}</strong></> : 'oppure trascina qui il file'}</div>
        </div>

        <div className="row">
          <button className="button blue" onClick={loginToMindMeister}>
            {token ? 'Ricollega' : 'Collega'} MindMeister
          </button>
          <button className="button" onClick={upload} disabled={!token}>
            Carica su MindMeister
          </button>
        </div>
        
        <div className="row">
          <button className="button green" onClick={testApiKeyAuth}>
            Test API Keys
          </button>
          <button className="button orange" onClick={uploadWithApiKeys}>
            Carica con API Keys
          </button>
          <button className="button red" onClick={() => {
            const u = new URL('https://www.mindmeister.com/oauth2/authorize');
            u.searchParams.set('response_type', 'code');
            u.searchParams.set('client_id', CLIENT_ID);
            u.searchParams.set('redirect_uri', REDIRECT_URI);
            u.searchParams.set('state', crypto.randomUUID());
            console.log('OAuth URL generato:', u.toString());
            alert('OAuth URL: ' + u.toString() + '\n\nCopia questo URL e aprilo in una nuova tab per testare.');
          }}>
            Test OAuth URL
          </button>
        </div>
        
        <div className="row">
          <button className="button purple" onClick={() => {
            console.log('=== STATO APP ===');
            console.log('Token presente:', !!token);
            console.log('Token length:', token?.length);
            console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'null');
            console.log('File presente:', !!file);
            console.log('File name:', file?.name);
            console.log('Status:', status);
            console.log('localStorage token:', localStorage.getItem('mm_token'));
            alert(`Stato App:\nToken: ${!!token}\nFile: ${!!file}\nStatus: ${status}\n\nVedi console per dettagli`);
          }}>
            Stato App
          </button>
          <button className="button gray" onClick={() => {
            localStorage.removeItem('mm_token');
            setToken(null);
            setStatus('idle');
            console.log('localStorage pulito, token rimosso');
            alert('localStorage pulito! Token rimosso. Puoi ripartire da zero.');
          }}>
            Pulisci Token
          </button>
        </div>

        <div className="status">
          {status==='uploading' && <span style={{color:'var(--orange-700)'}}>Upload/import in corso…</span>}
          {status==='error' && <span style={{color:'#dc2626'}}>Errore. Vedi console.</span>}
          {status==='done' && <span style={{color:'var(--blue-700)'}}>Fatto! Apri la mappa.</span>}
        </div>

        {mapUrl && (
          <div>
            <a className="link" href={mapUrl} target="_blank" rel="noreferrer">Apri mappa su MindMeister</a>
            <iframe className="viewer" src={embedUrl} title="MindMeister Viewer" />
          </div>
        )}
      </div>
    </div>
  );
}