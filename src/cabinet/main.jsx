import '@fontsource-variable/roboto-condensed';
import './styles.css';

const mode = import.meta.env.VITE_APP_MODE || 'preview';
const boot = mode === 'preview'
  ? import('./preview').then(module => module.startPreview())
  : mode === 'telegram'
    ? import('./telegram/main').then(module => module.startTelegram())
    : import('./auth/live').then(module => module.startLive());
boot.catch(() => { document.getElementById('root').textContent = 'Ilovani ochib bo‘lmadi. Sahifani yangilab, qayta urinib ko‘ring.'; });
