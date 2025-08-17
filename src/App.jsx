import React, { useEffect, useState } from 'react';

const CLIENT_ID = "SC42NPAvo_Kyx4j0mwywh6qnGqdXMMpl5GYnSfqgxzs";
const REDIRECT_URI = "https://robertomicarelli.github.io/mindmeister-demo/";
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
    try {
      const u = new URL('https://www.mindmeister.com/oauth2/authorize');
      u.searchParams.set('response_type', 'token');
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
      
      window.location.assign(oauthUrl);
    } catch (error) {
      console.error('Errore durante il login:', error);
      alert('Errore durante il login a MindMeister. Controlla la console per dettagli.');
    }
  };

  useEffect(() => {
    try {
      console.log('App loaded, checking for OAuth response...');
      console.log('Current URL:', window.location.href);
      console.log('Hash:', window.location.hash);
      
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
        }
      }
    } catch (error) {
      console.error('Errore durante il parsing del token:', error);
      setStatus('error');
    }
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

  const upload = async () => {
    if (!token) return loginToMindMeister();
    if (!file) return alert('Seleziona un file .md o .opml');
    
    try {
      setStatus('uploading');
      
      // Test del token prima di procedere
      const isTokenValid = await testToken(token);
      if (!isTokenValid) {
        console.log('Token non valido, richiedo nuovo login');
        localStorage.removeItem('mm_token');
        setToken(null);
        return loginToMindMeister();
      }
      
      const createRes = await fetch('https://www.mindmeister.com/api/v2/maps', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Import ' + new Date().toLocaleString(), theme: 'Aquarelle', layout: 'mindmap' })
      });
      
      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error('Create map failed:', createRes.status, errorText);
        throw new Error(`Create map failed: ${createRes.status} - ${errorText}`);
      }
      
      const created = await createRes.json();
      console.log('Map created:', created);
      
      const mapId = created.id || created.map_id;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('format', file.name.toLowerCase().endsWith('.opml') ? 'opml' : 'markdown');
      
      const impRes = await fetch(`https://www.mindmeister.com/api/v2/maps/${mapId}/import`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: fd
      });
      
      if (!impRes.ok) {
        const errorText = await impRes.text();
        console.error('Import failed:', impRes.status, errorText);
        throw new Error(`Import failed: ${impRes.status} - ${errorText}`);
      }
      
      const link = created.web_url || `https://www.mindmeister.com/map/${mapId}`;
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