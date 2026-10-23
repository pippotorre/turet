/* Turet — traduzioni (italiano, inglese, francese) e scelta della lingua.
 * Per aggiungere una lingua: copia il blocco `it`, traduci i valori e aggiungi il codice in LANGS.
 * Le chiavi con {segnaposto} vanno mantenute uguali in tutte le lingue (lo controlla test/i18n.test.js). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.I18n = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LANGS = { it: 'Italiano', en: 'English', fr: 'Français' };
  const DEFAULT_LANG = 'en';           // se la lingua del telefono non è tra quelle supportate

  const DICT = {
    it: {
      'doc.title': 'Turet — la fontanella più vicina',
      'doc.description': 'Trova il turet, la fontanella torinese a testa di toro, più vicino a te e raggiungilo a piedi.',
      'noscript': 'Per usare la mappa serve JavaScript.',
      'map.label': 'Mappa dei turet',
      'lang.label': 'Lingua',
      'tagline': 'Il turet più vicino, a due passi.',
      'about.summary': 'Che cos’è un turet?',
      'about.text': 'Il turet è la fontanella torinese in ghisa con la testa di toro: l’acqua è potabile e gratuita.',
      'find': 'Trova il turet più vicino',
      'refresh': 'Aggiorna la mia posizione',
      'searching': 'Cerco…',
      'status.locating': 'Cerco la tua posizione…',
      'status.searching': 'Cerco i turet vicino a te…',
      'net.offline': 'Il dispositivo è offline: attiva il Wi‑Fi o i dati mobili per cercare il turet più vicino.',
      'extend': 'Cerca più lontano (fino a {d})',
      'status.routing': 'Calcolo il percorso a piedi…',
      'status.routeFail': 'Il percorso stradale non è disponibile: ti mostro la linea d’aria. Puoi proseguire con la tua app di mappe.',
      'status.none': 'Non trovo turet entro {d} da qui. I turet sono le fontanelle di Torino.',
      'status.noneManual': 'Se non sei a Torino, puoi guardare il centro città oppure toccare la mappa per cambiare punto.',
      'status.offline': 'Sei offline: uso gli ultimi dati salvati per questa zona.',
      'status.loadFail': 'Non riesco a caricare i turet ({why}). Riprova tra poco.',
      'why.unreachable': 'servizio non raggiungibile',
      'why.http': 'il servizio ha risposto con l’errore {code}',
      'why.timeout': 'il servizio non risponde',
      'why.offline': 'sei offline',
      'geo.denied': 'Non posso usare la tua posizione perché l’accesso è stato negato. Puoi riattivarlo dalle impostazioni del browser, oppure toccare la mappa per indicare dove sei.',
      'geo.timeout': 'La posizione ci mette troppo. Riprova all’aperto oppure tocca la mappa per indicare dove sei.',
      'geo.unavailable': 'Non riesco a rilevare la posizione. Tocca la mappa per indicare dove sei.',
      'geo.unsupported': 'Il tuo browser non fornisce la posizione. Tocca la mappa per indicare dove sei.',
      'manual.tap': 'Tocca la mappa per indicare dove sei.',
      'manual.torino': 'Vai al centro di Torino',
      'card.nearest': 'Il più vicino',
      'card.route': '· circa {t} a piedi',
      'card.air': 'in linea d’aria · circa {t} a piedi',
      'open.google': 'Apri in Google Maps',
      'open.apple': 'Apri in Mappe di Apple',
      'steps.summary': 'Indicazioni passo passo',
      'others': 'Altri turet vicini',
      'others.note': 'Distanze in linea d’aria; il percorso a piedi può essere un po’ più lungo.',
      'pin.alt': '{name}, a {d}',
      'credits.map': 'Mappe e posizione dei turet: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contributori di OpenStreetMap</a>. Percorsi: <a href="https://routing.openstreetmap.de/" target="_blank" rel="noopener">routing.openstreetmap.de</a>.',
      'credits.privacyLink': 'Informativa sulla privacy',
      'credits.privacy': 'La tua posizione resta sul telefono: ai servizi di dati va solo un punto arrotondato (circa 100 m) per cercare i turet e, quando disegni il percorso, le due coordinate del tragitto.',
      'install': 'Installa l’app',
      'install.ios': 'Installa l’app (Condividi → Aggiungi alla schermata Home)',
      'name.default': 'Turet',
      'on': ' su {name}',
      'onto': ' su {name}',
      'side.left': 'a sinistra', 'side.right': 'a destra',
      'side.slight left': 'leggermente a sinistra', 'side.slight right': 'leggermente a destra',
      'side.sharp left': 'decisamente a sinistra', 'side.sharp right': 'decisamente a destra',
      'step.depart': 'Parti{on}',
      'step.turn': 'Svolta {side}{onto}',
      'step.uturn': 'Inverti la marcia{on}',
      'step.endroad': 'Alla fine della strada svolta {side}{onto}',
      'step.fork.left': 'Al bivio tieni la sinistra{on}',
      'step.fork.right': 'Al bivio tieni la destra{on}',
      'step.merge': 'Immettiti{on}',
      'step.roundabout': 'Alla rotonda prendi la {ord} uscita{on}',
      'step.roundaboutTurn': 'Alla rotonda svolta {side}{onto}',
      'step.continue': 'Prosegui{on}',
      'step.straight': 'Prosegui dritto{on}',
      'step.arrive': 'Sei arrivato al turet',
      'step.arrive.left': ' (sul lato sinistro)',
      'step.arrive.right': ' (sul lato destro)',
    },
    en: {
      'doc.title': 'Turet — the nearest drinking fountain',
      'doc.description': 'Find the nearest turet, Turin’s bull’s-head drinking fountain, and walk to it.',
      'noscript': 'JavaScript is required to use the map.',
      'map.label': 'Map of turets',
      'lang.label': 'Language',
      'tagline': 'The nearest turet, a few steps away.',
      'about.summary': 'What is a turet?',
      'about.text': 'A turet is Turin’s cast-iron drinking fountain with a bull’s head: the water is drinkable and free.',
      'find': 'Find the nearest turet',
      'refresh': 'Update my location',
      'searching': 'Searching…',
      'status.locating': 'Finding your location…',
      'status.searching': 'Looking for turets near you…',
      'net.offline': 'Your device is offline: turn on Wi‑Fi or mobile data to find the nearest turet.',
      'extend': 'Search further (up to {d})',
      'status.routing': 'Calculating the walking route…',
      'status.routeFail': 'The walking route isn’t available: showing the straight line. You can continue in your maps app.',
      'status.none': 'I can’t find any turet within {d}. Turets are Turin’s drinking fountains.',
      'status.noneManual': 'If you’re not in Turin, you can look at the city centre or tap the map to pick another spot.',
      'status.offline': 'You’re offline: using the last data saved for this area.',
      'status.loadFail': 'I can’t load the turets ({why}). Please try again shortly.',
      'why.unreachable': 'service unreachable',
      'why.http': 'the service replied with error {code}',
      'why.timeout': 'the service is not responding',
      'why.offline': 'you’re offline',
      'geo.denied': 'I can’t use your location because access was denied. You can re-enable it in your browser settings, or tap the map to say where you are.',
      'geo.timeout': 'Locating is taking too long. Try again outdoors or tap the map to say where you are.',
      'geo.unavailable': 'I can’t detect your location. Tap the map to say where you are.',
      'geo.unsupported': 'Your browser doesn’t provide location. Tap the map to say where you are.',
      'manual.tap': 'Tap the map to say where you are.',
      'manual.torino': 'Go to central Turin',
      'card.nearest': 'Nearest',
      'card.route': '· about {t} on foot',
      'card.air': 'as the crow flies · about {t} on foot',
      'open.google': 'Open in Google Maps',
      'open.apple': 'Open in Apple Maps',
      'steps.summary': 'Step-by-step directions',
      'others': 'Other turets nearby',
      'others.note': 'Straight-line distances; the walking route may be a little longer.',
      'pin.alt': '{name}, {d} away',
      'credits.map': 'Maps and turet locations: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>. Routes: <a href="https://routing.openstreetmap.de/" target="_blank" rel="noopener">routing.openstreetmap.de</a>.',
      'credits.privacyLink': 'Privacy policy',
      'credits.privacy': 'Your location stays on your phone: only a rounded point (about 100 m) is sent to the data service to look for turets and, when a route is drawn, the two coordinates of the trip.',
      'install': 'Install the app',
      'install.ios': 'Install the app (Share → Add to Home Screen)',
      'name.default': 'Turet',
      'on': ' on {name}',
      'onto': ' onto {name}',
      'side.left': 'left', 'side.right': 'right',
      'side.slight left': 'slightly left', 'side.slight right': 'slightly right',
      'side.sharp left': 'sharp left', 'side.sharp right': 'sharp right',
      'step.depart': 'Head out{on}',
      'step.turn': 'Turn {side}{onto}',
      'step.uturn': 'Make a U-turn{on}',
      'step.endroad': 'At the end of the road, turn {side}{onto}',
      'step.fork.left': 'At the fork, keep left{on}',
      'step.fork.right': 'At the fork, keep right{on}',
      'step.merge': 'Merge{on}',
      'step.roundabout': 'At the roundabout, take the {ord} exit{on}',
      'step.roundaboutTurn': 'At the roundabout, turn {side}{onto}',
      'step.continue': 'Continue{on}',
      'step.straight': 'Continue straight{on}',
      'step.arrive': 'You have arrived at the turet',
      'step.arrive.left': ' (on your left)',
      'step.arrive.right': ' (on your right)',
    },
    fr: {
      'doc.title': 'Turet — la fontaine la plus proche',
      'doc.description': 'Trouvez le turet, la fontaine turinoise à tête de taureau, le plus proche et rejoignez-le à pied.',
      'noscript': 'JavaScript est nécessaire pour utiliser la carte.',
      'map.label': 'Carte des turets',
      'lang.label': 'Langue',
      'tagline': 'Le turet le plus proche, à deux pas.',
      'about.summary': 'Qu’est-ce qu’un turet ?',
      'about.text': 'Le turet est la fontaine turinoise en fonte ornée d’une tête de taureau : l’eau est potable et gratuite.',
      'find': 'Trouver le turet le plus proche',
      'refresh': 'Actualiser ma position',
      'searching': 'Recherche…',
      'status.locating': 'Recherche de votre position…',
      'status.searching': 'Recherche de turets près de vous…',
      'net.offline': 'Votre appareil est hors ligne : activez le Wi‑Fi ou les données mobiles pour trouver le turet le plus proche.',
      'extend': 'Chercher plus loin (jusqu’à {d})',
      'status.routing': 'Calcul de l’itinéraire à pied…',
      'status.routeFail': 'L’itinéraire n’est pas disponible : je montre la ligne droite. Vous pouvez continuer avec votre application de cartes.',
      'status.none': 'Je ne trouve aucun turet dans un rayon de {d}. Les turets sont les fontaines de Turin.',
      'status.noneManual': 'Si vous n’êtes pas à Turin, regardez le centre-ville ou touchez la carte pour changer de point.',
      'status.offline': 'Vous êtes hors ligne : j’utilise les dernières données enregistrées pour cette zone.',
      'status.loadFail': 'Impossible de charger les turets ({why}). Réessayez dans un instant.',
      'why.unreachable': 'service injoignable',
      'why.http': 'le service a répondu avec l’erreur {code}',
      'why.timeout': 'le service ne répond pas',
      'why.offline': 'vous êtes hors ligne',
      'geo.denied': 'Je ne peux pas utiliser votre position car l’accès a été refusé. Vous pouvez le réactiver dans les paramètres du navigateur, ou toucher la carte pour indiquer où vous êtes.',
      'geo.timeout': 'La localisation prend trop de temps. Réessayez en extérieur ou touchez la carte pour indiquer où vous êtes.',
      'geo.unavailable': 'Impossible de détecter votre position. Touchez la carte pour indiquer où vous êtes.',
      'geo.unsupported': 'Votre navigateur ne fournit pas la position. Touchez la carte pour indiquer où vous êtes.',
      'manual.tap': 'Touchez la carte pour indiquer où vous êtes.',
      'manual.torino': 'Aller au centre de Turin',
      'card.nearest': 'Le plus proche',
      'card.route': '· environ {t} à pied',
      'card.air': 'à vol d’oiseau · environ {t} à pied',
      'open.google': 'Ouvrir dans Google Maps',
      'open.apple': 'Ouvrir dans Plans',
      'steps.summary': 'Itinéraire pas à pas',
      'others': 'Autres turets à proximité',
      'others.note': 'Distances à vol d’oiseau ; l’itinéraire à pied peut être un peu plus long.',
      'pin.alt': '{name}, à {d}',
      'credits.map': 'Cartes et emplacement des turets : © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">contributeurs d’OpenStreetMap</a>. Itinéraires : <a href="https://routing.openstreetmap.de/" target="_blank" rel="noopener">routing.openstreetmap.de</a>.',
      'credits.privacyLink': 'Politique de confidentialité',
      'credits.privacy': 'Votre position reste sur votre téléphone : seul un point arrondi (environ 100 m) est envoyé au service de données pour chercher les turets et, lors du tracé de l’itinéraire, les deux coordonnées du trajet.',
      'install': 'Installer l’application',
      'install.ios': 'Installer l’application (Partager → Sur l’écran d’accueil)',
      'name.default': 'Turet',
      'on': ' sur {name}',
      'onto': ' sur {name}',
      'side.left': 'à gauche', 'side.right': 'à droite',
      'side.slight left': 'légèrement à gauche', 'side.slight right': 'légèrement à droite',
      'side.sharp left': 'franchement à gauche', 'side.sharp right': 'franchement à droite',
      'step.depart': 'Partez{on}',
      'step.turn': 'Tournez {side}{onto}',
      'step.uturn': 'Faites demi-tour{on}',
      'step.endroad': 'Au bout de la route, tournez {side}{onto}',
      'step.fork.left': 'À l’embranchement, serrez à gauche{on}',
      'step.fork.right': 'À l’embranchement, serrez à droite{on}',
      'step.merge': 'Insérez-vous{on}',
      'step.roundabout': 'Au rond-point, prenez la {ord} sortie{on}',
      'step.roundaboutTurn': 'Au rond-point, tournez {side}{onto}',
      'step.continue': 'Continuez{on}',
      'step.straight': 'Continuez tout droit{on}',
      'step.arrive': 'Vous êtes arrivé au turet',
      'step.arrive.left': ' (sur votre gauche)',
      'step.arrive.right': ' (sur votre droite)',
    },
  };

  let lang = 'it';

  function t(key, params) {
    const s = DICT[lang][key] !== undefined ? DICT[lang][key] : (DICT.it[key] !== undefined ? DICT.it[key] : key);
    return s.replace(/\{(\w+)\}/g, (m, k) => (params && k in params ? params[k] : m));
  }

  function ordinal(n) {
    n = Number(n) || 1;
    if (lang === 'it') return n + 'ª';
    if (lang === 'fr') return n === 1 ? '1re' : n + 'e';
    const v = n % 100;
    return n + (v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th');
  }

  /** Separatore decimale della lingua corrente. */
  const decimal = () => (lang === 'en' ? '.' : ',');

  /** Sceglie la lingua da una lista (es. navigator.languages), con ripiego su inglese. */
  function detect(list) {
    for (const l of list || []) {
      const code = String(l || '').toLowerCase().slice(0, 2);
      if (DICT[code]) return code;
    }
    return DEFAULT_LANG;
  }

  function setLang(code) { lang = DICT[code] ? code : DEFAULT_LANG; return lang; }
  const getLang = () => lang;

  return { LANGS, DEFAULT_LANG, DICT, t, ordinal, decimal, detect, setLang, getLang };
});
