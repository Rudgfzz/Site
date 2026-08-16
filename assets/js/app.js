/* ==============================================================
   ORBIT — logique du site
   --------------------------------------------------------------
   Dépend de assets/js/data.js, chargé juste avant.
   Aucune bibliothèque externe.

   Sommaire :
     1. Utilitaires            6. Recherche
     2. État persistant        7. Cartes produit
     3. Thème clair / sombre   8. Contrôleurs de page
     4. Notifications          9. Divers
     5. En-tête & tiroir      10. Démarrage
   ============================================================== */
(function () {
  'use strict';

  /* ---------- 1. Utilitaires ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const euro = (n) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n);

  const dateFr = (iso) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const produitParId = (id) => PRODUITS.find((p) => p.id === id);
  const categorieParId = (id) => CATEGORIES.find((c) => c.id === id);

  const image = (produit, couleur) =>
    `assets/img/${produit.type}-${couleur || produit.couleurs[0]}.svg`;

  /** Prix d'un produit pour une capacité donnée. */
  function prixDe(produit, capaciteId) {
    if (!produit.capacites || !capaciteId) return produit.prix;
    const c = produit.capacites.find((x) => x.id === capaciteId);
    return produit.prix + (c ? c.delta : 0);
  }

  function etoiles(note) {
    const pleines = Math.round(note);
    return '★'.repeat(pleines) + '☆'.repeat(5 - pleines);
  }

  const initiales = (nom) =>
    nom.split(' ').filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();

  function etatStock(produit) {
    if (produit.stock === 0) return { classe: 'stock--non', texte: 'Rupture de stock' };
    if (produit.stock <= 10) return { classe: 'stock--bas', texte: `Plus que ${produit.stock} en stock` };
    return { classe: 'stock--ok', texte: 'En stock' };
  }

  /* ---------- 2. État persistant ---------- */
  const CLES = {
    panier: 'orbit_panier',
    favoris: 'orbit_favoris',
    comparateur: 'orbit_comparateur',
    theme: 'orbit_theme',
    commande: 'orbit_commande',
    promo: 'orbit_promo',
  };

  function lire(cle, defaut) {
    try {
      const brut = localStorage.getItem(cle);
      return brut === null ? defaut : JSON.parse(brut);
    } catch (e) {
      return defaut;
    }
  }

  function ecrire(cle, valeur) {
    try {
      localStorage.setItem(cle, JSON.stringify(valeur));
    } catch (e) {
      /* Navigation privée : l'état reste valable le temps de la session. */
    }
  }

  /* --- Panier --- */
  const cleLigne = (id, couleur, capacite) => `${id}|${couleur || ''}|${capacite || ''}`;

  function panier() {
    return lire(CLES.panier, []).filter((l) => l && produitParId(l.id));
  }

  function majPanier(lignes) {
    ecrire(CLES.panier, lignes);
    rafraichirCompteurs();
    document.dispatchEvent(new CustomEvent('panier:maj'));
  }

  function ajouterAuPanier(id, couleur, capacite, qte = 1, silencieux) {
    const produit = produitParId(id);
    if (!produit) return;
    if (produit.stock === 0) {
      notifier('Ce produit est en rupture de stock', 'err');
      return;
    }
    const lignes = panier();
    const cle = cleLigne(id, couleur, capacite);
    const existante = lignes.find((l) => cleLigne(l.id, l.couleur, l.capacite) === cle);
    if (existante) existante.qte = Math.min(existante.qte + qte, produit.stock);
    else lignes.push({ id, couleur: couleur || produit.couleurs[0], capacite: capacite || null, qte });
    majPanier(lignes);
    if (!silencieux) {
      notifier(`« ${produit.nom} » ajouté au panier`);
      ouvrirTiroir();
    }
  }

  function changerQuantite(cle, delta) {
    const lignes = panier();
    const ligne = lignes.find((l) => cleLigne(l.id, l.couleur, l.capacite) === cle);
    if (!ligne) return;
    const produit = produitParId(ligne.id);
    ligne.qte = Math.max(0, Math.min(ligne.qte + delta, produit.stock || 99));
    majPanier(lignes.filter((l) => l.qte > 0));
  }

  function retirerDuPanier(cle) {
    majPanier(panier().filter((l) => cleLigne(l.id, l.couleur, l.capacite) !== cle));
  }

  const nbArticles = () => panier().reduce((s, l) => s + l.qte, 0);

  const sousTotal = () =>
    panier().reduce((s, l) => s + prixDe(produitParId(l.id), l.capacite) * l.qte, 0);

  /** Calcule le détail chiffré du panier, code promo et livraison compris. */
  function totaux(livraisonId) {
    const st = sousTotal();
    const promo = lire(CLES.promo, null);
    let remise = 0;
    let livraisonOfferte = st >= BOUTIQUE.seuilLivraisonGratuite;

    if (promo && CODES_PROMO[promo]) {
      const regle = CODES_PROMO[promo];
      if (!regle.minimum || st >= regle.minimum) {
        if (regle.type === 'pourcent') remise = st * (regle.valeur / 100);
        else if (regle.type === 'montant') remise = Math.min(regle.valeur, st);
        else if (regle.type === 'livraison') livraisonOfferte = true;
      }
    }

    const mode = LIVRAISONS.find((l) => l.id === livraisonId) || LIVRAISONS[0];
    const port = livraisonOfferte && mode.id === 'standard' ? 0 : mode.prix;

    return {
      sousTotal: st,
      remise,
      port,
      livraisonOfferte,
      promo: promo && CODES_PROMO[promo] ? promo : null,
      total: Math.max(0, st - remise + port),
    };
  }

  /* --- Favoris --- */
  const favoris = () => lire(CLES.favoris, []).filter(produitParId);

  function basculerFavori(id) {
    const liste = favoris();
    const i = liste.indexOf(id);
    if (i >= 0) liste.splice(i, 1);
    else liste.push(id);
    ecrire(CLES.favoris, liste);
    rafraichirCompteurs();
    document.dispatchEvent(new CustomEvent('favoris:maj'));
    notifier(i >= 0 ? 'Retiré des favoris' : 'Ajouté aux favoris');
    return i < 0;
  }

  /* --- Comparateur --- */
  const MAX_COMPARE = 4;
  const comparateur = () => lire(CLES.comparateur, []).filter(produitParId);

  function basculerComparaison(id) {
    const liste = comparateur();
    const i = liste.indexOf(id);
    if (i >= 0) {
      liste.splice(i, 1);
    } else {
      if (liste.length >= MAX_COMPARE) {
        notifier(`Comparaison limitée à ${MAX_COMPARE} produits`, 'err');
        return false;
      }
      liste.push(id);
    }
    ecrire(CLES.comparateur, liste);
    rafraichirCompteurs();
    majBarreComparateur();
    document.dispatchEvent(new CustomEvent('comparateur:maj'));
    return i < 0;
  }

  /* ---------- 3. Thème clair / sombre ---------- */
  function themeInitial() {
    const enregistre = lire(CLES.theme, null);
    if (enregistre === 'clair' || enregistre === 'sombre') return enregistre;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'clair' : 'sombre';
  }

  function appliquerTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'clair' ? 'light' : 'dark');
    ecrire(CLES.theme, theme);
    $$('[data-bascule-theme]').forEach((b) => {
      b.setAttribute('aria-pressed', String(theme === 'clair'));
      b.setAttribute('aria-label', theme === 'clair' ? 'Passer au thème sombre' : 'Passer au thème clair');
    });
  }

  function initTheme() {
    appliquerTheme(themeInitial());
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-bascule-theme]')) return;
      const actuel = document.documentElement.getAttribute('data-theme') === 'light' ? 'clair' : 'sombre';
      appliquerTheme(actuel === 'clair' ? 'sombre' : 'clair');
    });
  }

  /* ---------- 4. Notifications ---------- */
  function notifier(message, type) {
    let zone = $('.toasts');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'toasts';
      zone.setAttribute('role', 'status');
      zone.setAttribute('aria-live', 'polite');
      document.body.appendChild(zone);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML =
      `${icone(type === 'err' ? 'alerte' : 'valide')}<span>${esc(message)}</span>`;
    if (type === 'err') $('svg', toast).style.color = 'var(--danger)';
    zone.appendChild(toast);
    requestAnimationFrame(() => { toast.dataset.show = 'true'; });
    setTimeout(() => {
      toast.dataset.show = 'false';
      setTimeout(() => toast.remove(), 320);
    }, 2800);
  }

  /* ---------- 5. En-tête & tiroir panier ---------- */
  function rafraichirCompteurs() {
    const paires = [
      ['[data-compteur-panier]', nbArticles()],
      ['[data-compteur-favoris]', favoris().length],
      ['[data-compteur-comparateur]', comparateur().length],
    ];
    paires.forEach(([sel, n]) => {
      $$(sel).forEach((el) => {
        el.textContent = n;
        el.hidden = n === 0;
      });
    });
  }

  function initMenu() {
    const burger = $('#burger');
    const nav = $('#nav');
    if (!burger || !nav) return;
    const basculer = (ouvert) => {
      nav.dataset.open = String(ouvert);
      burger.setAttribute('aria-expanded', String(ouvert));
    };
    burger.addEventListener('click', () => basculer(nav.dataset.open !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) basculer(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1000) basculer(false); });
  }

  function ouvrirTiroir() {
    const tiroir = $('#tiroir-panier');
    if (!tiroir) return;
    rendreTiroir();
    tiroir.dataset.open = 'true';
    $('#voile').dataset.open = 'true';
    document.body.classList.add('no-scroll');
    const fermer = $('[data-fermer-tiroir]', tiroir);
    if (fermer) fermer.focus();
  }

  function fermerSurcouches() {
    const tiroir = $('#tiroir-panier');
    const recherche = $('#recherche');
    if (tiroir) tiroir.dataset.open = 'false';
    if (recherche) recherche.dataset.open = 'false';
    const voile = $('#voile');
    if (voile) voile.dataset.open = 'false';
    document.body.classList.remove('no-scroll');
  }

  function rendreTiroir() {
    const corps = $('#tiroir-corps');
    const pied = $('#tiroir-pied');
    if (!corps) return;

    const lignes = panier();
    if (!lignes.length) {
      corps.innerHTML = `
        <div class="vide" style="margin:24px 0;border:0">
          <h3>Votre panier est vide</h3>
          <p>Parcourez le catalogue pour le remplir.</p>
          <a class="btn" href="boutique.html">Voir la boutique</a>
        </div>`;
      pied.innerHTML = '';
      return;
    }

    corps.innerHTML = lignes.map((l) => {
      const p = produitParId(l.id);
      const cle = cleLigne(l.id, l.couleur, l.capacite);
      const cap = p.capacites && l.capacite
        ? p.capacites.find((c) => c.id === l.capacite)
        : null;
      return `
        <div class="ligne" style="grid-template-columns:74px 1fr;gap:14px">
          <a class="ligne__img" style="width:74px" href="produit.html?id=${encodeURIComponent(p.id)}">
            <img src="${image(p, l.couleur)}" alt="${esc(p.nom)}" loading="lazy">
          </a>
          <div>
            <p class="ligne__nom" style="font-size:.93rem">${esc(p.nom)}</p>
            <p class="ligne__meta">${esc(COULEURS[l.couleur]?.nom || '')}${cap ? ' · ' + esc(cap.nom) : ''}</p>
            <div style="display:flex;align-items:center;gap:12px;margin-top:9px">
              <div class="quantite quantite--sm">
                <button type="button" data-qte="-1" data-cle="${esc(cle)}" aria-label="Diminuer">−</button>
                <span>${l.qte}</span>
                <button type="button" data-qte="1" data-cle="${esc(cle)}" aria-label="Augmenter">+</button>
              </div>
              <strong class="prix" style="font-size:.94rem">${euro(prixDe(p, l.capacite) * l.qte)}</strong>
              <button type="button" class="lien-supprimer" data-retirer="${esc(cle)}"
                      style="margin-left:auto">Retirer</button>
            </div>
          </div>
        </div>`;
    }).join('');

    const t = totaux('standard');
    const restant = Math.max(0, BOUTIQUE.seuilLivraisonGratuite - t.sousTotal);
    pied.innerHTML = `
      ${restant > 0 ? `
        <div class="jauge-livraison">
          <div class="piste"><div class="jauge" style="width:${Math.min(100, (t.sousTotal / BOUTIQUE.seuilLivraisonGratuite) * 100)}%"></div></div>
          <p>Plus que <strong>${euro(restant)}</strong> pour la livraison offerte.</p>
        </div>` : `<p class="form-note" style="color:var(--success);margin-bottom:12px">✓ Livraison standard offerte</p>`}
      <div class="recap__total" style="border:0;padding:0;margin:0 0 14px">
        <span>Sous-total</span><span>${euro(t.sousTotal)}</span>
      </div>
      <a class="btn btn--block btn--lg" href="panier.html">Voir le panier</a>
      <a class="btn btn--ghost btn--block" href="commande.html" style="margin-top:9px">Commander</a>`;
  }

  function initTiroir() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-ouvrir-panier]')) { e.preventDefault(); ouvrirTiroir(); return; }
      if (e.target.closest('[data-fermer-tiroir]') || e.target.id === 'voile') fermerSurcouches();
    });
    document.addEventListener('panier:maj', () => {
      if ($('#tiroir-panier')?.dataset.open === 'true') rendreTiroir();
    });
  }

  function majBarreComparateur() {
    const barre = $('#barre-comparateur');
    if (!barre) return;
    const liste = comparateur();
    barre.dataset.visible = String(liste.length > 0);
    const vignettes = $('.barre-comparateur__vignettes', barre);
    if (vignettes) {
      vignettes.innerHTML = liste
        .map((id) => {
          const p = produitParId(id);
          return `<img src="${image(p)}" alt="${esc(p.nom)}" title="${esc(p.nom)}">`;
        })
        .join('');
    }
    const compte = $('[data-compare-texte]', barre);
    if (compte) {
      compte.textContent = `${liste.length} produit${liste.length > 1 ? 's' : ''} à comparer`;
    }
  }

  /* ---------- 6. Recherche ---------- */
  function initRecherche() {
    const boite = $('#recherche');
    if (!boite) return;
    const champ = $('#champ-recherche');
    const sortie = $('#resultats-recherche');

    function ouvrir() {
      boite.dataset.open = 'true';
      $('#voile').dataset.open = 'true';
      document.body.classList.add('no-scroll');
      champ.value = '';
      rendre('');
      setTimeout(() => champ.focus(), 60);
    }

    function rendre(q) {
      const terme = q.trim().toLowerCase();
      let liste;
      if (!terme) {
        liste = PRODUITS.filter((p) => p.bestseller).slice(0, 5);
      } else {
        liste = PRODUITS.filter((p) =>
          [p.nom, p.marque, p.accroche, categorieParId(p.categorie)?.nom]
            .join(' ')
            .toLowerCase()
            .includes(terme)
        ).slice(0, 8);
      }

      if (!liste.length) {
        sortie.innerHTML = `<p class="recherche__vide">Aucun produit ne correspond à « ${esc(q)} ».</p>`;
        return;
      }

      sortie.innerHTML =
        (!terme ? '<p class="recherche__vide" style="padding:10px 12px;text-align:left">Les plus vendus</p>' : '') +
        liste.map((p) => `
          <a class="resultat" href="produit.html?id=${encodeURIComponent(p.id)}">
            <img src="${image(p)}" alt="" loading="lazy">
            <span>
              <span class="resultat__nom">${esc(p.nom)}</span><br>
              <span class="resultat__meta">${esc(p.marque)} · ${esc(categorieParId(p.categorie)?.nom || '')}</span>
            </span>
            <span class="resultat__prix">${euro(p.prix)}</span>
          </a>`).join('');
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-ouvrir-recherche]')) { e.preventDefault(); ouvrir(); }
    });
    champ.addEventListener('input', () => rendre(champ.value));
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ouvrir(); }
      if (e.key === 'Escape') fermerSurcouches();
    });
  }

  /* ---------- 7. Cartes produit ---------- */
  function icone(nom) {
    const t = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    const d = {
      panier: '<path d="M6 7h12l-1.2 12.1A2 2 0 0 1 14.8 21H9.2a2 2 0 0 1-2-1.9L6 7Z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/>',
      coeur: '<path d="M12 20s-7-4.5-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.5 12 20 12 20Z"/>',
      compare: '<path d="M4 7h7M4 17h7M17 4v16M14 8l3-3 3 3M20 16l-3 3-3-3"/>',
      loupe: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
      croix: '<path d="M6 6l12 12M18 6L6 18"/>',
      soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
      lune: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
      valide: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
      alerte: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1"/>',
      camion: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
      bouclier: '<path d="M12 3l7.5 3v6c0 4.4-3.2 7.6-7.5 9-4.3-1.4-7.5-4.6-7.5-9V6L12 3Z"/>',
      retour: '<path d="M9 5L4 10l5 5"/><path d="M4 10h10a6 6 0 0 1 0 12h-3"/>',
      carte: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/>',
      casque: '<path d="M5 16v-4a7 7 0 0 1 14 0v4"/><rect x="3" y="14" width="4" height="6" rx="2"/><rect x="17" y="14" width="4" height="6" rx="2"/>',
      etincelle: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z"/>',
      grille: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
      liste: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      colis: '<path d="M4 8l8-4 8 4v8l-8 4-8-4V8Z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
      horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.4"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/>',
      youtube: '<rect x="3" y="6" width="18" height="12" rx="3.5"/><path d="M11 10l4 2-4 2v-4Z" fill="currentColor" stroke="none"/>',
      x: '<path d="M5 5l14 14M19 5L5 19"/>',
    };
    return `<svg viewBox="0 0 24 24" ${t} aria-hidden="true">${d[nom] || ''}</svg>`;
  }

  function carteProduit(produit) {
    const enFavori = favoris().includes(produit.id);
    const enCompare = comparateur().includes(produit.id);
    const stock = etatStock(produit);
    const cat = categorieParId(produit.categorie);

    const etiquettes = [];
    if (produit.stock === 0) etiquettes.push('<span class="etiquette etiquette--rupture">Rupture</span>');
    else if (produit.prixBarre) {
      const pc = Math.round((1 - produit.prix / produit.prixBarre) * 100);
      etiquettes.push(`<span class="etiquette etiquette--promo">−${pc} %</span>`);
    }
    if (produit.nouveau) etiquettes.push('<span class="etiquette etiquette--neuf">Nouveau</span>');
    if (produit.bestseller) etiquettes.push('<span class="etiquette">Best-seller</span>');

    return `
      <article class="produit" data-produit="${esc(produit.id)}">
        <a class="produit__media" href="produit.html?id=${encodeURIComponent(produit.id)}"
           aria-label="Voir ${esc(produit.nom)}">
          <img src="${image(produit)}" alt="${esc(produit.nom)}" loading="lazy" width="800" height="600">
        </a>
        <div class="etiquettes">${etiquettes.join('')}</div>
        <div class="actions-flottantes">
          <button class="action-ronde" type="button" data-favori="${esc(produit.id)}"
                  aria-pressed="${enFavori}" aria-label="Ajouter ${esc(produit.nom)} aux favoris"
                  title="Favoris">${icone('coeur')}</button>
          <button class="action-ronde" type="button" data-comparer="${esc(produit.id)}"
                  aria-pressed="${enCompare}" aria-label="Comparer ${esc(produit.nom)}"
                  title="Comparer">${icone('compare')}</button>
        </div>
        <div class="produit__corps">
          <p class="produit__marque">${esc(produit.marque)} · ${esc(cat ? cat.nom : '')}</p>
          <h3 class="produit__nom">
            <a href="produit.html?id=${encodeURIComponent(produit.id)}">${esc(produit.nom)}</a>
          </h3>
          <p class="produit__desc">${esc(produit.accroche)}</p>
          <p class="note">
            <span class="etoiles" aria-hidden="true">${etoiles(produit.note)}</span>
            <span>${produit.note.toFixed(1)} · ${produit.nbAvis} avis</span>
          </p>
          <div class="produit__couleurs" aria-hidden="true">
            ${produit.couleurs.map((c) =>
              `<span class="pion" style="background:${COULEURS[c].hex}" title="${esc(COULEURS[c].nom)}"></span>`
            ).join('')}
          </div>
          <p class="stock ${stock.classe}" style="margin-bottom:12px">${stock.texte}</p>
          <div class="produit__pied">
            <span class="prix">
              ${produit.prixBarre ? `<s>${euro(produit.prixBarre)}</s>` : ''}${euro(produit.prix)}
            </span>
            <button class="btn btn--soft btn--sm" type="button"
                    data-ajouter="${esc(produit.id)}"
                    ${produit.stock === 0 ? 'disabled' : ''}>
              ${produit.stock === 0 ? 'Indisponible' : 'Ajouter'}
            </button>
          </div>
        </div>
      </article>`;
  }

  function rendreGrille(cible, liste, messageVide) {
    if (!cible) return;
    cible.innerHTML = liste.length
      ? liste.map(carteProduit).join('')
      : `<div class="vide"><h3>Aucun produit</h3><p>${esc(messageVide || 'Essayez d\'élargir vos critères.')}</p></div>`;
  }

  /* Délégation globale : ajout panier, favoris, comparateur. */
  function initActionsProduit() {
    document.addEventListener('click', (e) => {
      const ajout = e.target.closest('[data-ajouter]');
      if (ajout) {
        e.preventDefault();
        const p = produitParId(ajout.dataset.ajouter);
        ajouterAuPanier(p.id, p.couleurs[0], p.capacites ? p.capacites[0].id : null, 1);
        return;
      }
      const fav = e.target.closest('[data-favori]');
      if (fav) {
        e.preventDefault();
        const actif = basculerFavori(fav.dataset.favori);
        $$(`[data-favori="${CSS.escape(fav.dataset.favori)}"]`).forEach((b) =>
          b.setAttribute('aria-pressed', String(actif)));
        return;
      }
      const cmp = e.target.closest('[data-comparer]');
      if (cmp) {
        e.preventDefault();
        const actif = basculerComparaison(cmp.dataset.comparer);
        if (actif !== false) {
          $$(`[data-comparer="${CSS.escape(cmp.dataset.comparer)}"]`).forEach((b) =>
            b.setAttribute('aria-pressed', String(actif)));
        }
      }
    });
  }

  /* ---------- 8. Contrôleurs de page ---------- */

  /* --- Accueil --- */
  function pageAccueil() {
    const cats = $('#grille-categories');
    if (cats) {
      cats.innerHTML = CATEGORIES.map((c) => {
        const n = PRODUITS.filter((p) => p.categorie === c.id).length;
        return `
          <a class="cat-card reveal" href="boutique.html?categorie=${encodeURIComponent(c.id)}">
            <div>
              <strong>${esc(c.nom)}</strong>
              <span>${n} produit${n > 1 ? 's' : ''}</span>
            </div>
            <img src="assets/img/${c.type}-noir.svg" alt="" loading="lazy">
          </a>`;
      }).join('');
    }

    rendreGrille($('#grille-bestsellers'), PRODUITS.filter((p) => p.bestseller).slice(0, 4));
    rendreGrille($('#grille-nouveautes'), PRODUITS.filter((p) => p.nouveau).slice(0, 4));

    const promo = $('#produit-promo');
    if (promo) {
      const p = PRODUITS.find((x) => x.prixBarre && x.stock > 0);
      if (p) {
        promo.innerHTML = `<img src="${image(p)}" alt="${esc(p.nom)}" loading="lazy">`;
        const lien = $('#lien-promo');
        if (lien) lien.href = `produit.html?id=${encodeURIComponent(p.id)}`;
        const nom = $('#nom-promo');
        if (nom) nom.textContent = p.nom;
        const eco = $('#eco-promo');
        if (eco) eco.textContent = euro(p.prixBarre - p.prix);
      }
    }

    compteARebours();
  }

  function compteARebours() {
    const zone = $('#compte-rebours');
    if (!zone) return;
    // Fin de l'offre : dimanche prochain à minuit.
    const fin = new Date();
    fin.setDate(fin.getDate() + ((7 - fin.getDay()) % 7 || 7));
    fin.setHours(23, 59, 59, 0);

    const unites = [
      ['jours', 86400000],
      ['heures', 3600000],
      ['min', 60000],
      ['sec', 1000],
    ];

    function tic() {
      let reste = Math.max(0, fin - Date.now());
      zone.innerHTML = unites.map(([nom, ms]) => {
        const v = Math.floor(reste / ms);
        reste -= v * ms;
        return `<div><strong>${String(v).padStart(2, '0')}</strong><span>${nom}</span></div>`;
      }).join('');
    }
    tic();
    setInterval(tic, 1000);
  }

  /* --- Boutique --- */
  function pageBoutique() {
    const grille = $('#grille-boutique');
    if (!grille) return;

    const params = new URLSearchParams(location.search);
    const etat = {
      categories: (params.get('categorie') || '').split(',').filter(Boolean),
      marques: (params.get('marque') || '').split(',').filter(Boolean),
      couleurs: (params.get('couleur') || '').split(',').filter(Boolean),
      prixMax: Number(params.get('prixMax')) || null,
      dispo: params.get('dispo') === '1',
      q: params.get('q') || '',
      tri: params.get('tri') || 'pertinence',
      vue: lire('orbit_vue', 'grille'),
      page: 1,
    };
    const PAR_PAGE = 8;

    /* --- Construction des facettes --- */
    const zoneFacettes = $('#facettes');
    const marques = [...new Set(PRODUITS.map((p) => p.marque))].sort();
    const prixMaxCatalogue = Math.max(...PRODUITS.map((p) => p.prix));

    zoneFacettes.innerHTML = `
      <div class="facette">
        <h3>Catégorie</h3>
        <div class="facette__liste">
          ${CATEGORIES.map((c) => `
            <label class="coche">
              <input type="checkbox" data-facette="categories" value="${esc(c.id)}">
              <span>${esc(c.nom)}</span>
              <span class="compte">${PRODUITS.filter((p) => p.categorie === c.id).length}</span>
            </label>`).join('')}
        </div>
      </div>
      <div class="facette">
        <h3>Marque</h3>
        <div class="facette__liste">
          ${marques.map((m) => `
            <label class="coche">
              <input type="checkbox" data-facette="marques" value="${esc(m)}">
              <span>${esc(m)}</span>
              <span class="compte">${PRODUITS.filter((p) => p.marque === m).length}</span>
            </label>`).join('')}
        </div>
      </div>
      <div class="facette">
        <h3>Coloris</h3>
        <div class="pastilles-couleur">
          ${Object.entries(COULEURS).map(([id, c]) => `
            <button class="pastille-couleur" type="button" data-facette-couleur="${esc(id)}"
                    aria-pressed="false" style="background:${c.hex}"
                    title="${esc(c.nom)}" aria-label="${esc(c.nom)}"></button>`).join('')}
        </div>
      </div>
      <div class="facette">
        <h3>Budget maximum</h3>
        <input type="range" id="curseur-prix" min="0" max="${prixMaxCatalogue}" step="50"
               value="${etat.prixMax || prixMaxCatalogue}" style="width:100%;accent-color:var(--accent)">
        <p class="form-note" style="margin-top:8px">Jusqu'à <strong id="valeur-prix"></strong></p>
      </div>
      <div class="facette">
        <h3>Disponibilité</h3>
        <label class="coche">
          <input type="checkbox" id="coche-dispo">
          <span>En stock uniquement</span>
        </label>
      </div>
      <button class="btn btn--ghost btn--block btn--sm" type="button" id="vider-facettes"
              style="margin-top:16px">Tout effacer</button>`;

    /* --- Synchronisation initiale des contrôles --- */
    $$('[data-facette]', zoneFacettes).forEach((input) => {
      input.checked = etat[input.dataset.facette].includes(input.value);
    });
    $$('[data-facette-couleur]', zoneFacettes).forEach((b) => {
      b.setAttribute('aria-pressed', String(etat.couleurs.includes(b.dataset.facetteCouleur)));
    });
    $('#coche-dispo').checked = etat.dispo;
    const curseur = $('#curseur-prix');
    if (etat.prixMax) curseur.value = etat.prixMax;

    const selTri = $('#tri');
    if (selTri) selTri.value = etat.tri;
    const champQ = $('#q');
    if (champQ) champQ.value = etat.q;

    /* --- Filtrage --- */
    function filtrer() {
      let liste = PRODUITS.slice();

      if (etat.categories.length) liste = liste.filter((p) => etat.categories.includes(p.categorie));
      if (etat.marques.length) liste = liste.filter((p) => etat.marques.includes(p.marque));
      if (etat.couleurs.length) liste = liste.filter((p) => p.couleurs.some((c) => etat.couleurs.includes(c)));
      if (etat.prixMax) liste = liste.filter((p) => p.prix <= etat.prixMax);
      if (etat.dispo) liste = liste.filter((p) => p.stock > 0);
      if (etat.q) {
        const t = etat.q.toLowerCase();
        liste = liste.filter((p) => (p.nom + ' ' + p.marque + ' ' + p.accroche).toLowerCase().includes(t));
      }

      switch (etat.tri) {
        case 'prix-asc': liste.sort((a, b) => a.prix - b.prix); break;
        case 'prix-desc': liste.sort((a, b) => b.prix - a.prix); break;
        case 'note': liste.sort((a, b) => b.note - a.note); break;
        case 'nouveaute': liste.sort((a, b) => Number(b.nouveau) - Number(a.nouveau)); break;
        default:
          liste.sort((a, b) => Number(b.bestseller) - Number(a.bestseller) || b.note - a.note);
      }
      return liste;
    }

    function majUrl() {
      const u = new URL(location.href);
      const set = (k, v) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k));
      set('categorie', etat.categories.join(','));
      set('marque', etat.marques.join(','));
      set('couleur', etat.couleurs.join(','));
      set('prixMax', etat.prixMax || '');
      set('dispo', etat.dispo ? '1' : '');
      set('q', etat.q);
      set('tri', etat.tri === 'pertinence' ? '' : etat.tri);
      history.replaceState(null, '', u);
    }

    function rendreJetons(total) {
      const zone = $('#jetons');
      const actifs = [];
      etat.categories.forEach((c) =>
        actifs.push({ type: 'categories', valeur: c, texte: categorieParId(c)?.nom || c }));
      etat.marques.forEach((m) => actifs.push({ type: 'marques', valeur: m, texte: m }));
      etat.couleurs.forEach((c) =>
        actifs.push({ type: 'couleurs', valeur: c, texte: COULEURS[c].nom }));
      if (etat.prixMax) actifs.push({ type: 'prixMax', valeur: '', texte: `≤ ${euro(etat.prixMax)}` });
      if (etat.dispo) actifs.push({ type: 'dispo', valeur: '', texte: 'En stock' });
      if (etat.q) actifs.push({ type: 'q', valeur: '', texte: `« ${etat.q} »` });

      zone.innerHTML = actifs.map((a) =>
        `<button class="jeton" type="button" data-vider="${esc(a.type)}" data-valeur="${esc(a.valeur)}">
           ${esc(a.texte)} <span aria-hidden="true">×</span>
           <span class="sr-only">Retirer ce filtre</span>
         </button>`).join('');

      $('#compteur').textContent =
        total === 0 ? 'Aucun résultat' : `${total} produit${total > 1 ? 's' : ''}`;
    }

    function rendre() {
      const liste = filtrer();
      const visibles = liste.slice(0, etat.page * PAR_PAGE);

      grille.dataset.vue = etat.vue;
      rendreGrille(grille, visibles, 'Aucun produit ne correspond à ces critères.');
      rendreJetons(liste.length);

      const plus = $('#charger-plus');
      if (plus) {
        plus.hidden = visibles.length >= liste.length;
        $('#restants').textContent = `${visibles.length} sur ${liste.length} produits`;
      }
      majUrl();
    }

    /* --- Écouteurs --- */
    zoneFacettes.addEventListener('change', (e) => {
      const f = e.target.closest('[data-facette]');
      if (f) {
        const cle = f.dataset.facette;
        if (f.checked) etat[cle].push(f.value);
        else etat[cle] = etat[cle].filter((v) => v !== f.value);
        etat.page = 1;
        rendre();
      }
      if (e.target.id === 'coche-dispo') { etat.dispo = e.target.checked; etat.page = 1; rendre(); }
    });

    zoneFacettes.addEventListener('click', (e) => {
      const c = e.target.closest('[data-facette-couleur]');
      if (c) {
        const id = c.dataset.facetteCouleur;
        const actif = etat.couleurs.includes(id);
        etat.couleurs = actif ? etat.couleurs.filter((x) => x !== id) : etat.couleurs.concat(id);
        c.setAttribute('aria-pressed', String(!actif));
        etat.page = 1;
        rendre();
      }
      if (e.target.id === 'vider-facettes') {
        etat.categories = []; etat.marques = []; etat.couleurs = [];
        etat.prixMax = null; etat.dispo = false; etat.q = ''; etat.page = 1;
        $$('[data-facette]', zoneFacettes).forEach((i) => { i.checked = false; });
        $$('[data-facette-couleur]', zoneFacettes).forEach((b) => b.setAttribute('aria-pressed', 'false'));
        $('#coche-dispo').checked = false;
        curseur.value = prixMaxCatalogue;
        majValeurPrix();
        if (champQ) champQ.value = '';
        rendre();
      }
    });

    function majValeurPrix() {
      const v = Number(curseur.value);
      $('#valeur-prix').textContent = v >= prixMaxCatalogue ? 'sans limite' : euro(v);
    }
    curseur.addEventListener('input', majValeurPrix);
    curseur.addEventListener('change', () => {
      const v = Number(curseur.value);
      etat.prixMax = v >= prixMaxCatalogue ? null : v;
      etat.page = 1;
      rendre();
    });
    majValeurPrix();

    $('#jetons').addEventListener('click', (e) => {
      const j = e.target.closest('[data-vider]');
      if (!j) return;
      const type = j.dataset.vider;
      if (type === 'prixMax') { etat.prixMax = null; curseur.value = prixMaxCatalogue; majValeurPrix(); }
      else if (type === 'dispo') { etat.dispo = false; $('#coche-dispo').checked = false; }
      else if (type === 'q') { etat.q = ''; if (champQ) champQ.value = ''; }
      else {
        etat[type] = etat[type].filter((v) => v !== j.dataset.valeur);
        const input = $(`[data-facette="${type}"][value="${CSS.escape(j.dataset.valeur)}"]`, zoneFacettes);
        if (input) input.checked = false;
        const pastille = $(`[data-facette-couleur="${CSS.escape(j.dataset.valeur)}"]`, zoneFacettes);
        if (pastille) pastille.setAttribute('aria-pressed', 'false');
      }
      etat.page = 1;
      rendre();
    });

    if (selTri) selTri.addEventListener('change', () => { etat.tri = selTri.value; etat.page = 1; rendre(); });
    if (champQ) {
      champQ.addEventListener('input', () => { etat.q = champQ.value; etat.page = 1; rendre(); });
    }

    $$('[data-vue]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.vue === etat.vue));
      b.addEventListener('click', () => {
        etat.vue = b.dataset.vue;
        ecrire('orbit_vue', etat.vue);
        $$('[data-vue]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.vue === etat.vue)));
        rendre();
      });
    });

    const plus = $('#bouton-plus');
    if (plus) plus.addEventListener('click', () => { etat.page += 1; rendre(); });

    rendre();
  }

  /* --- Fiche produit --- */
  function pageProduit() {
    const zone = $('#fiche-produit');
    if (!zone) return;

    const id = new URLSearchParams(location.search).get('id');
    const p = id ? produitParId(id) : null;

    if (!p) {
      zone.innerHTML = `
        <div class="vide" style="margin:60px 0">
          <h3>Produit introuvable</h3>
          <p>Ce produit n'existe pas ou n'est plus au catalogue.</p>
          <a class="btn" href="boutique.html">Retour à la boutique</a>
        </div>`;
      return;
    }

    document.title = `${p.nom} — ${BOUTIQUE.nom}`;
    const meta = $('meta[name="description"]');
    if (meta) meta.setAttribute('content', p.accroche);
    const fil = $('#fil-produit');
    if (fil) fil.textContent = p.nom;

    let couleur = p.couleurs[0];
    let capacite = p.capacites ? p.capacites[0].id : null;
    let qte = 1;

    const stock = etatStock(p);
    const cat = categorieParId(p.categorie);

    zone.innerHTML = `
      <div class="fiche">
        <div class="galerie">
          <div class="galerie__principale">
            <img id="image-produit" src="${image(p, couleur)}" alt="${esc(p.nom)}" width="800" height="600">
          </div>
          <div class="galerie__vignettes" id="vignettes">
            ${p.couleurs.map((c, i) => `
              <button type="button" data-couleur-vignette="${esc(c)}" aria-current="${i === 0}"
                      aria-label="Voir le coloris ${esc(COULEURS[c].nom)}">
                <img src="${image(p, c)}" alt="" loading="lazy">
              </button>`).join('')}
          </div>
        </div>

        <div class="fiche__info">
          <p class="eyebrow">${esc(p.marque)} · ${esc(cat ? cat.nom : '')}</p>
          <h1>${esc(p.nom)}</h1>
          <p class="lead" style="font-size:1.03rem">${esc(p.accroche)}</p>

          <p class="note" style="margin-bottom:16px">
            <span class="etoiles" aria-hidden="true">${etoiles(p.note)}</span>
            <span>${p.note.toFixed(1)} sur 5 · <a href="#avis" style="text-decoration:underline">${p.nbAvis} avis</a></span>
          </p>

          <div class="fiche__prix">
            <span class="montant" id="prix-affiche">${euro(prixDe(p, capacite))}</span>
            ${p.prixBarre ? `<s id="prix-barre"></s><span class="remise" id="remise"></span>` : ''}
          </div>
          <p class="paiement-3x">ou <strong id="prix-3x">${euro(prixDe(p, capacite) / 3)}</strong> × 3 sans frais</p>

          <div class="option">
            <p class="option__titre">Coloris <span id="nom-couleur">${esc(COULEURS[couleur].nom)}</span></p>
            <div class="choix-couleurs" id="choix-couleurs">
              ${p.couleurs.map((c, i) => `
                <button class="choix-couleur" type="button" data-couleur="${esc(c)}"
                        aria-pressed="${i === 0}" style="background:${COULEURS[c].hex}"
                        aria-label="${esc(COULEURS[c].nom)}" title="${esc(COULEURS[c].nom)}"></button>`).join('')}
            </div>
          </div>

          ${p.capacites ? `
            <div class="option">
              <p class="option__titre">Capacité</p>
              <div class="choix-capacites" id="choix-capacites">
                ${p.capacites.map((c, i) => `
                  <button class="choix-capacite" type="button" data-capacite="${esc(c.id)}"
                          aria-pressed="${i === 0}">
                    ${esc(c.nom)}
                    <small>${c.delta ? '+ ' + euro(c.delta) : 'inclus'}</small>
                  </button>`).join('')}
              </div>
            </div>` : ''}

          <p class="stock ${stock.classe}">${stock.texte}</p>

          <div class="achat">
            <div class="quantite">
              <button type="button" id="qte-moins" aria-label="Diminuer la quantité">−</button>
              <span id="qte-valeur">1</span>
              <button type="button" id="qte-plus" aria-label="Augmenter la quantité">+</button>
            </div>
            <button class="btn btn--lg" type="button" id="ajouter-panier"
                    ${p.stock === 0 ? 'disabled' : ''}>
              ${icone('panier')} ${p.stock === 0 ? 'Indisponible' : 'Ajouter au panier'}
            </button>
            <button class="btn btn--ghost btn--lg" type="button" id="acheter-maintenant"
                    ${p.stock === 0 ? 'disabled' : ''}>Acheter maintenant</button>
          </div>

          <div class="btn-row" style="margin-bottom:8px">
            <button class="btn btn--soft btn--sm" type="button" data-favori="${esc(p.id)}"
                    aria-pressed="${favoris().includes(p.id)}">${icone('coeur')} Favoris</button>
            <button class="btn btn--soft btn--sm" type="button" data-comparer="${esc(p.id)}"
                    aria-pressed="${comparateur().includes(p.id)}">${icone('compare')} Comparer</button>
          </div>

          <ul class="points-forts">
            ${p.pointsForts.map((pf) => `<li>${esc(pf)}</li>`).join('')}
          </ul>

          <div class="services">
            <div class="service">${icone('camion')}<span><strong>${esc(p.livraison)}</strong>Livraison offerte dès ${euro(BOUTIQUE.seuilLivraisonGratuite)}</span></div>
            <div class="service">${icone('retour')}<span><strong>30 jours pour changer d'avis</strong>Retour gratuit</span></div>
            <div class="service">${icone('bouclier')}<span><strong>${esc(p.garantie)}</strong>Extension possible</span></div>
          </div>
        </div>
      </div>`;

    /* --- Onglets --- */
    const onglets = $('#onglets-produit');
    if (onglets) {
      onglets.innerHTML = `
        <div class="onglets" role="tablist">
          <button role="tab" aria-selected="true" aria-controls="panneau-desc" id="tab-desc">Description</button>
          <button role="tab" aria-selected="false" aria-controls="panneau-specs" id="tab-specs">Caractéristiques</button>
          <button role="tab" aria-selected="false" aria-controls="panneau-livraison" id="tab-livraison">Livraison &amp; retours</button>
          <button role="tab" aria-selected="false" aria-controls="panneau-avis" id="tab-avis">Avis (${p.nbAvis})</button>
        </div>

        <div class="panneau" id="panneau-desc" role="tabpanel" aria-labelledby="tab-desc">
          <div class="prose"><p>${esc(p.description)}</p></div>
        </div>

        <div class="panneau" id="panneau-specs" role="tabpanel" aria-labelledby="tab-specs" hidden>
          <table class="tableau-specs"><tbody>
            ${Object.entries(p.specs).map(([k, v]) =>
              `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
          </tbody></table>
        </div>

        <div class="panneau" id="panneau-livraison" role="tabpanel" aria-labelledby="tab-livraison" hidden>
          <div class="prose">
            <h3>Livraison</h3>
            <ul>
              ${LIVRAISONS.map((l) =>
                `<li><strong>${esc(l.nom)}</strong> — ${esc(l.delai)} · ${l.prix === 0 ? 'offerte' : euro(l.prix)}</li>`).join('')}
            </ul>
            <p>La livraison standard est offerte dès ${euro(BOUTIQUE.seuilLivraisonGratuite)} d'achat.</p>
            <h3>Retours</h3>
            <p>Vous disposez de 30 jours à compter de la réception pour renvoyer un produit, dans son emballage d'origine et complet. Le retour est gratuit : une étiquette prépayée est jointe à chaque colis. Le remboursement intervient sous 5 jours ouvrés après réception.</p>
            <h3>Garantie</h3>
            <p>${esc(p.garantie)}, en plus de la garantie légale de conformité de 2 ans et de la garantie contre les vices cachés.</p>
          </div>
        </div>

        <div class="panneau" id="panneau-avis" role="tabpanel" aria-labelledby="tab-avis" hidden>
          <div id="avis"></div>
        </div>`;

      const boutons = $$('[role="tab"]', onglets);
      boutons.forEach((b) => {
        b.addEventListener('click', () => {
          boutons.forEach((x) => {
            x.setAttribute('aria-selected', String(x === b));
            $('#' + x.getAttribute('aria-controls')).hidden = x !== b;
          });
        });
      });

      rendreAvis(p);
    }

    /* --- Produits liés --- */
    let lies = PRODUITS.filter((x) => x.categorie === p.categorie && x.id !== p.id);
    if (lies.length < 4) {
      lies = lies.concat(PRODUITS.filter((x) => x.id !== p.id && !lies.includes(x)));
    }
    rendreGrille($('#grille-lies'), lies.slice(0, 4));

    /* --- Interactions --- */
    function majPrix() {
      const prix = prixDe(p, capacite);
      $('#prix-affiche').textContent = euro(prix);
      $('#prix-3x').textContent = euro(prix / 3);

      /* Le prix de référence suit le supplément de capacité : sans cela,
         choisir une option payante afficherait un prix barré inférieur au
         prix demandé, ce qui est trompeur (et interdit). */
      const prixBarre = $('#prix-barre');
      if (prixBarre && p.prixBarre) {
        const supplement = prix - p.prix;
        const reference = p.prixBarre + supplement;
        prixBarre.textContent = euro(reference);
        $('#remise').textContent = `−${Math.round((1 - prix / reference) * 100)} %`;
      }

      const barre = $('#barre-achat-prix');
      if (barre) barre.textContent = euro(prix * qte);
    }

    function majImage() {
      $('#image-produit').src = image(p, couleur);
      $('#nom-couleur').textContent = COULEURS[couleur].nom;
      $$('[data-couleur-vignette]').forEach((b) =>
        b.setAttribute('aria-current', String(b.dataset.couleurVignette === couleur)));
      $$('[data-couleur]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.couleur === couleur)));
    }

    majPrix();

    zone.addEventListener('click', (e) => {
      const c = e.target.closest('[data-couleur]');
      if (c) { couleur = c.dataset.couleur; majImage(); return; }

      const v = e.target.closest('[data-couleur-vignette]');
      if (v) { couleur = v.dataset.couleurVignette; majImage(); return; }

      const cap = e.target.closest('[data-capacite]');
      if (cap) {
        capacite = cap.dataset.capacite;
        $$('[data-capacite]').forEach((b) =>
          b.setAttribute('aria-pressed', String(b.dataset.capacite === capacite)));
        majPrix();
        return;
      }

      if (e.target.closest('#qte-moins')) { qte = Math.max(1, qte - 1); $('#qte-valeur').textContent = qte; majPrix(); }
      if (e.target.closest('#qte-plus')) { qte = Math.min(p.stock || 99, qte + 1); $('#qte-valeur').textContent = qte; majPrix(); }

      if (e.target.closest('#ajouter-panier')) ajouterAuPanier(p.id, couleur, capacite, qte);
      if (e.target.closest('#acheter-maintenant')) {
        ajouterAuPanier(p.id, couleur, capacite, qte, true);
        location.href = 'commande.html';
      }
    });

    /* --- Barre d'achat collante --- */
    const barre = $('#barre-achat');
    if (barre) {
      barre.innerHTML = `
        <span class="prix" id="barre-achat-prix">${euro(prixDe(p, capacite))}</span>
        <button class="btn" type="button" id="barre-ajouter" ${p.stock === 0 ? 'disabled' : ''}>
          Ajouter au panier
        </button>`;
      $('#barre-ajouter').addEventListener('click', () => ajouterAuPanier(p.id, couleur, capacite, qte));
      const sentinelle = $('#ajouter-panier');
      if (sentinelle && 'IntersectionObserver' in window) {
        new IntersectionObserver(
          ([entree]) => { barre.dataset.visible = String(!entree.isIntersecting); },
          { rootMargin: '-80px 0px 0px 0px' }
        ).observe(sentinelle);
      }
    }
  }

  function rendreAvis(p) {
    const zone = $('#avis');
    if (!zone) return;

    if (!p.avis.length) {
      zone.innerHTML = `
        <div class="vide">
          <h3>Aucun avis pour l'instant</h3>
          <p>Soyez le premier à donner votre avis sur ce produit.</p>
        </div>`;
      return;
    }

    const repartition = [5, 4, 3, 2, 1].map((n) => ({
      note: n,
      nb: p.avis.filter((a) => a.note === n).length,
    }));
    const total = p.avis.length;

    zone.innerHTML = `
      <div class="avis-resume">
        <div class="avis-note">
          <strong>${p.note.toFixed(1)}</strong>
          <span class="etoiles" aria-hidden="true">${etoiles(p.note)}</span>
          <span>${p.nbAvis} avis vérifiés</span>
        </div>
        <div>
          ${repartition.map((r) => `
            <div class="barre-note">
              <span>${r.note} ★</span>
              <span class="piste"><span class="jauge" style="width:${total ? (r.nb / total) * 100 : 0}%"></span></span>
              <span>${r.nb}</span>
            </div>`).join('')}
        </div>
      </div>
      ${p.avis.map((a) => `
        <article class="avis">
          <div class="avis__tete">
            <span class="avatar">${esc(initiales(a.auteur))}</span>
            <span>
              <strong>${esc(a.auteur)}</strong>
              ${a.verifie ? `<br><span class="avis__verifie">✓ Achat vérifié</span>` : ''}
            </span>
            <time datetime="${esc(a.date)}">${dateFr(a.date)}</time>
          </div>
          <p class="etoiles" aria-label="${a.note} sur 5">${etoiles(a.note)}</p>
          <h4 style="margin-bottom:6px">${esc(a.titre)}</h4>
          <p style="color:var(--text-soft);font-size:.94rem;margin:0">${esc(a.texte)}</p>
        </article>`).join('')}`;
  }

  /* --- Panier --- */
  function pagePanier() {
    const zone = $('#zone-panier');
    if (!zone) return;

    function rendre() {
      const lignes = panier();

      if (!lignes.length) {
        zone.innerHTML = `
          <div class="vide" style="margin:20px 0 60px">
            <h3>Votre panier est vide</h3>
            <p>Découvrez les produits les plus demandés du moment.</p>
            <a class="btn" href="boutique.html">Voir la boutique</a>
          </div>
          <section class="section section--tight">
            <h2 style="font-size:1.3rem;margin-bottom:24px">Nos best-sellers</h2>
            <div class="grille-produits" id="suggestions-vides"></div>
          </section>`;
        rendreGrille($('#suggestions-vides'), PRODUITS.filter((p) => p.bestseller).slice(0, 4));
        return;
      }

      const t = totaux('standard');
      const restant = Math.max(0, BOUTIQUE.seuilLivraisonGratuite - t.sousTotal);

      zone.innerHTML = `
        <div class="panier-layout">
          <div>
            ${lignes.map((l) => {
              const p = produitParId(l.id);
              const cle = cleLigne(l.id, l.couleur, l.capacite);
              const cap = p.capacites && l.capacite ? p.capacites.find((c) => c.id === l.capacite) : null;
              return `
                <div class="ligne">
                  <a class="ligne__img" href="produit.html?id=${encodeURIComponent(p.id)}">
                    <img src="${image(p, l.couleur)}" alt="${esc(p.nom)}" loading="lazy">
                  </a>
                  <div>
                    <p class="ligne__nom">
                      <a href="produit.html?id=${encodeURIComponent(p.id)}">${esc(p.nom)}</a>
                    </p>
                    <p class="ligne__meta">
                      ${esc(COULEURS[l.couleur]?.nom || '')}${cap ? ' · ' + esc(cap.nom) : ''}
                      · ${euro(prixDe(p, l.capacite))} l'unité
                    </p>
                    <p class="stock ${etatStock(p).classe}" style="margin-top:6px">${etatStock(p).texte}</p>
                  </div>
                  <div class="ligne__fin">
                    <div class="quantite quantite--sm">
                      <button type="button" data-qte="-1" data-cle="${esc(cle)}" aria-label="Diminuer">−</button>
                      <span>${l.qte}</span>
                      <button type="button" data-qte="1" data-cle="${esc(cle)}" aria-label="Augmenter">+</button>
                    </div>
                    <strong class="prix">${euro(prixDe(p, l.capacite) * l.qte)}</strong>
                    <button type="button" class="lien-supprimer" data-retirer="${esc(cle)}">Retirer</button>
                  </div>
                </div>`;
            }).join('')}

            <div style="margin-top:26px">
              <a class="link-arrow" href="boutique.html">Continuer mes achats</a>
            </div>
          </div>

          <aside class="recap">
            <h2>Récapitulatif</h2>

            <div class="code-promo">
              <label class="sr-only" for="champ-promo">Code de réduction</label>
              <input class="input" id="champ-promo" placeholder="Code promo" value="${esc(t.promo || '')}">
              <button class="btn btn--soft" type="button" id="appliquer-promo">Appliquer</button>
            </div>
            <div id="message-promo"></div>

            <div class="recap__ligne"><span>Sous-total</span><span>${euro(t.sousTotal)}</span></div>
            ${t.remise > 0 ? `<div class="recap__ligne recap__ligne--eco">
              <span>Remise (${esc(t.promo)})</span><span>−${euro(t.remise)}</span></div>` : ''}
            <div class="recap__ligne">
              <span>Livraison standard</span>
              <span>${t.livraisonOfferte ? 'Offerte' : euro(LIVRAISONS[0].prix)}</span>
            </div>

            ${restant > 0 ? `
              <div class="jauge-livraison">
                <div class="piste"><div class="jauge" style="width:${(t.sousTotal / BOUTIQUE.seuilLivraisonGratuite) * 100}%"></div></div>
                <p>Plus que <strong>${euro(restant)}</strong> pour la livraison offerte.</p>
              </div>` : ''}

            <div class="recap__total">
              <span>Total</span>
              <span>${euro(t.total)}<br><small>TVA incluse</small></span>
            </div>

            <a class="btn btn--block btn--lg" href="commande.html" style="margin-top:20px">
              Passer commande
            </a>

            <div class="paiements">
              <span>CB</span><span>VISA</span><span>MASTERCARD</span><span>PAYPAL</span><span>3× SANS FRAIS</span>
            </div>
          </aside>
        </div>

        <section class="section section--tight">
          <h2 style="font-size:1.3rem;margin-bottom:24px">Vous aimerez aussi</h2>
          <div class="grille-produits" id="suggestions"></div>
        </section>`;

      const dejaDedans = lignes.map((l) => l.id);
      rendreGrille(
        $('#suggestions'),
        PRODUITS.filter((p) => !dejaDedans.includes(p.id) && p.stock > 0).slice(0, 4)
      );
    }

    zone.addEventListener('click', (e) => {
      if (e.target.closest('#appliquer-promo')) {
        const code = $('#champ-promo').value.trim().toUpperCase();
        const msg = $('#message-promo');
        const regle = CODES_PROMO[code];
        if (!code) { ecrire(CLES.promo, null); rendre(); return; }
        if (!regle) {
          msg.innerHTML = `<div class="alerte alerte--err">Ce code n'est pas valide.</div>`;
          return;
        }
        if (regle.minimum && sousTotal() < regle.minimum) {
          msg.innerHTML = `<div class="alerte alerte--err">Ce code s'applique dès ${euro(regle.minimum)} d'achat.</div>`;
          return;
        }
        ecrire(CLES.promo, code);
        notifier(`Code appliqué : ${regle.libelle}`);
        rendre();
      }
    });

    document.addEventListener('panier:maj', rendre);
    rendre();
  }

  /* Quantités et suppressions, partout (tiroir comme page panier). */
  function initLignesPanier() {
    document.addEventListener('click', (e) => {
      const q = e.target.closest('[data-qte]');
      if (q) { changerQuantite(q.dataset.cle, Number(q.dataset.qte)); return; }
      const r = e.target.closest('[data-retirer]');
      if (r) { retirerDuPanier(r.dataset.retirer); notifier('Produit retiré du panier'); }
    });
  }

  /* --- Tunnel de commande --- */
  function pageCommande() {
    const form = $('#form-commande');
    if (!form) return;

    if (!panier().length) {
      $('#zone-commande').innerHTML = `
        <div class="vide" style="margin:40px 0">
          <h3>Votre panier est vide</h3>
          <p>Ajoutez un produit avant de passer commande.</p>
          <a class="btn" href="boutique.html">Voir la boutique</a>
        </div>`;
      return;
    }

    let etape = 1;
    let livraison = 'standard';

    const etapes = $$('.etape-tunnel');
    const sections = $$('[data-etape]');

    function afficherEtape(n) {
      etape = n;
      sections.forEach((s) => { s.hidden = Number(s.dataset.etape) !== n; });
      etapes.forEach((e) => {
        const num = Number(e.dataset.numero);
        e.setAttribute('aria-current', num === n ? 'step' : 'false');
        e.dataset.fait = String(num < n);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function champsValides(section) {
      let ok = true;
      $$('[required]', section).forEach((champ) => {
        const valide = champ.checkValidity() && champ.value.trim() !== '';
        champ.setAttribute('aria-invalid', String(!valide));
        const err = champ.parentNode.querySelector('.field-error');
        if (err) err.textContent = valide ? '' : (champ.dataset.erreur || 'Ce champ est obligatoire.');
        if (!valide && ok) { champ.focus(); ok = false; }
        else if (!valide) ok = false;
      });
      return ok;
    }

    function rendreRecap() {
      const t = totaux(livraison);
      const lignes = panier();
      $('#recap-commande').innerHTML = `
        <h2>Votre commande</h2>
        ${lignes.map((l) => {
          const p = produitParId(l.id);
          const cap = p.capacites && l.capacite ? p.capacites.find((c) => c.id === l.capacite) : null;
          return `
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
              <img src="${image(p, l.couleur)}" alt="" width="56" height="42" loading="lazy"
                   style="width:56px;height:42px;object-fit:cover;border-radius:8px;background:#eef0f4">
              <div style="flex:1;min-width:0">
                <p style="margin:0;font-size:.9rem;font-weight:550">${esc(p.nom)}</p>
                <p style="margin:0;font-size:.8rem;color:var(--muted)">
                  ${esc(COULEURS[l.couleur]?.nom || '')}${cap ? ' · ' + esc(cap.nom) : ''} · ×${l.qte}
                </p>
              </div>
              <strong style="font-size:.9rem">${euro(prixDe(p, l.capacite) * l.qte)}</strong>
            </div>`;
        }).join('')}
        <hr style="margin:18px 0">
        <div class="recap__ligne"><span>Sous-total</span><span>${euro(t.sousTotal)}</span></div>
        ${t.remise > 0 ? `<div class="recap__ligne recap__ligne--eco"><span>Remise</span><span>−${euro(t.remise)}</span></div>` : ''}
        <div class="recap__ligne"><span>Livraison</span><span>${t.port === 0 ? 'Offerte' : euro(t.port)}</span></div>
        <div class="recap__total"><span>Total</span><span>${euro(t.total)}<br><small>TVA incluse</small></span></div>`;
    }

    /* Modes de livraison */
    $('#modes-livraison').innerHTML = LIVRAISONS.map((l, i) => `
      <label class="carte-choix">
        <input type="radio" name="livraison" value="${esc(l.id)}" ${i === 0 ? 'checked' : ''}>
        <span style="flex:1">
          <strong>${esc(l.nom)}</strong>
          <span>${esc(l.delai)}${l.note ? ' · ' + esc(l.note) : ''}</span>
        </span>
        <span class="tarif">${l.prix === 0 ? 'Offerte' : euro(l.prix)}</span>
      </label>`).join('');

    form.addEventListener('change', (e) => {
      if (e.target.name === 'livraison') { livraison = e.target.value; rendreRecap(); }
      if (e.target.name === 'paiement') {
        $('#champs-carte').hidden = e.target.value !== 'carte';
        $$('#champs-carte [required]').forEach((c) => { c.disabled = e.target.value !== 'carte'; });
      }
    });

    form.addEventListener('click', (e) => {
      const suivant = e.target.closest('[data-suivant]');
      if (suivant) {
        e.preventDefault();
        const section = sections.find((s) => Number(s.dataset.etape) === etape);
        if (champsValides(section)) afficherEtape(etape + 1);
        return;
      }
      const precedent = e.target.closest('[data-precedent]');
      if (precedent) { e.preventDefault(); afficherEtape(etape - 1); }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const section = sections.find((s) => Number(s.dataset.etape) === etape);
      if (!champsValides(section)) return;

      const donnees = Object.fromEntries(new FormData(form).entries());
      const t = totaux(livraison);
      const numero = 'ORB-' + String(Date.now()).slice(-8);

      ecrire(CLES.commande, {
        numero,
        date: new Date().toISOString(),
        client: { prenom: donnees.prenom, nom: donnees.nom, email: donnees.email },
        adresse: {
          rue: donnees.rue, complement: donnees.complement,
          cp: donnees.cp, ville: donnees.ville, pays: donnees.pays,
        },
        livraison: LIVRAISONS.find((l) => l.id === livraison),
        paiement: donnees.paiement,
        lignes: panier().map((l) => {
          const p = produitParId(l.id);
          return {
            nom: p.nom, image: image(p, l.couleur), qte: l.qte,
            couleur: COULEURS[l.couleur]?.nom || '',
            capacite: p.capacites && l.capacite
              ? p.capacites.find((c) => c.id === l.capacite)?.nom : null,
            total: prixDe(p, l.capacite) * l.qte,
          };
        }),
        totaux: t,
      });

      majPanier([]);
      ecrire(CLES.promo, null);
      location.href = 'confirmation.html';
    });

    rendreRecap();
    afficherEtape(1);
  }

  /* --- Confirmation --- */
  function pageConfirmation() {
    const zone = $('#zone-confirmation');
    if (!zone) return;

    const cmd = lire(CLES.commande, null);
    if (!cmd) {
      zone.innerHTML = `
        <div class="vide" style="margin:40px 0">
          <h3>Aucune commande récente</h3>
          <p>Vous n'avez pas de commande à afficher dans ce navigateur.</p>
          <a class="btn" href="boutique.html">Voir la boutique</a>
        </div>`;
      return;
    }

    const arrivee = new Date();
    arrivee.setDate(arrivee.getDate() + (cmd.livraison.id === 'express' ? 1 : 4));

    zone.innerHTML = `
      <div class="confirmation-hero">
        <div class="pastille-ok">${icone('valide')}</div>
        <h1>Merci ${esc(cmd.client.prenom)} !</h1>
        <p class="lead" style="margin-inline:auto">
          Votre commande <strong>${esc(cmd.numero)}</strong> est confirmée.
          Un e-mail récapitulatif part à l'instant vers ${esc(cmd.client.email)}.
        </p>
        <div class="btn-row" style="justify-content:center;margin-top:24px">
          <a class="btn" href="suivi.html?numero=${encodeURIComponent(cmd.numero)}">Suivre ma commande</a>
          <a class="btn btn--ghost" href="boutique.html">Continuer mes achats</a>
        </div>
      </div>

      <div class="panier-layout" style="padding-top:20px">
        <div>
          <h2 style="font-size:1.2rem">Récapitulatif</h2>
          ${cmd.lignes.map((l) => `
            <div class="ligne">
              <div class="ligne__img"><img src="${esc(l.image)}" alt="" loading="lazy"></div>
              <div>
                <p class="ligne__nom">${esc(l.nom)}</p>
                <p class="ligne__meta">${esc(l.couleur)}${l.capacite ? ' · ' + esc(l.capacite) : ''} · ×${l.qte}</p>
              </div>
              <div class="ligne__fin"><strong class="prix">${euro(l.total)}</strong></div>
            </div>`).join('')}

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-top:34px">
            <div class="carte-info">
              <h3>Adresse de livraison</h3>
              <p>${esc(cmd.client.prenom)} ${esc(cmd.client.nom)}<br>
                 ${esc(cmd.adresse.rue)}${cmd.adresse.complement ? '<br>' + esc(cmd.adresse.complement) : ''}<br>
                 ${esc(cmd.adresse.cp)} ${esc(cmd.adresse.ville)}<br>${esc(cmd.adresse.pays)}</p>
            </div>
            <div class="carte-info">
              <h3>Mode de livraison</h3>
              <p>${esc(cmd.livraison.nom)}<br>${esc(cmd.livraison.delai)}<br>
                 Estimée le ${arrivee.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            <div class="carte-info">
              <h3>Paiement</h3>
              <p>${cmd.paiement === 'carte' ? 'Carte bancaire' : cmd.paiement === 'paypal' ? 'PayPal' : 'Virement'}<br>
                 Total réglé : ${euro(cmd.totaux.total)}</p>
            </div>
          </div>
        </div>

        <aside class="recap">
          <h2>Total</h2>
          <div class="recap__ligne"><span>Sous-total</span><span>${euro(cmd.totaux.sousTotal)}</span></div>
          ${cmd.totaux.remise > 0 ? `<div class="recap__ligne recap__ligne--eco"><span>Remise</span><span>−${euro(cmd.totaux.remise)}</span></div>` : ''}
          <div class="recap__ligne"><span>Livraison</span><span>${cmd.totaux.port === 0 ? 'Offerte' : euro(cmd.totaux.port)}</span></div>
          <div class="recap__total"><span>Payé</span><span>${euro(cmd.totaux.total)}</span></div>
          <p class="form-note" style="margin-top:16px;text-align:center">
            Une facture est jointe à l'e-mail de confirmation.
          </p>
        </aside>
      </div>`;
  }

  /* --- Suivi de commande --- */
  function pageSuivi() {
    const zone = $('#zone-suivi');
    if (!zone) return;
    const form = $('#form-suivi');
    const numeroUrl = new URLSearchParams(location.search).get('numero');

    function afficher(numero) {
      const cmd = lire(CLES.commande, null);
      if (!cmd || cmd.numero !== numero) {
        zone.innerHTML = `<div class="alerte alerte--err">
          Aucune commande ne correspond au numéro « ${esc(numero)} » dans ce navigateur.
        </div>`;
        return;
      }

      const passee = new Date(cmd.date);
      const etapes = [
        { titre: 'Commande confirmée', date: passee, fait: true },
        { titre: 'En préparation', date: new Date(passee.getTime() + 6 * 3600e3), fait: true },
        { titre: 'Expédiée', date: new Date(passee.getTime() + 26 * 3600e3), fait: false, actuel: true },
        { titre: 'En cours de livraison', date: null, fait: false },
        { titre: 'Livrée', date: null, fait: false },
      ];

      zone.innerHTML = `
        <div class="carte-info" style="margin-bottom:30px">
          <h3>Commande ${esc(cmd.numero)}</h3>
          <p>Passée le ${dateFr(cmd.date)} · ${cmd.lignes.length} article${cmd.lignes.length > 1 ? 's' : ''}
             · ${euro(cmd.totaux.total)}</p>
        </div>
        <ol class="suivi-etapes">
          ${etapes.map((e) => `
            <li class="suivi-etape" data-fait="${e.fait}" data-actuel="${!!e.actuel}">
              <strong>${esc(e.titre)}</strong>
              <span>${e.date ? e.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'À venir'}</span>
            </li>`).join('')}
        </ol>`;
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        afficher($('#numero-commande').value.trim().toUpperCase());
      });
    }
    if (numeroUrl) {
      const champ = $('#numero-commande');
      if (champ) champ.value = numeroUrl;
      afficher(numeroUrl);
    }
  }

  /* --- Favoris --- */
  function pageFavoris() {
    const zone = $('#grille-favoris');
    if (!zone) return;
    function rendre() {
      const liste = favoris().map(produitParId);
      rendreGrille(zone, liste, 'Ajoutez des produits à vos favoris en cliquant sur le cœur.');
      const compteur = $('#compteur-favoris-page');
      if (compteur) {
        compteur.textContent = liste.length
          ? `${liste.length} produit${liste.length > 1 ? 's' : ''} enregistré${liste.length > 1 ? 's' : ''}`
          : '';
      }
      const actions = $('#actions-favoris');
      if (actions) actions.hidden = liste.length === 0;
    }
    document.addEventListener('favoris:maj', rendre);
    const vider = $('#vider-favoris');
    if (vider) {
      vider.addEventListener('click', () => {
        ecrire(CLES.favoris, []);
        rafraichirCompteurs();
        rendre();
        notifier('Favoris vidés');
      });
    }
    const toutAjouter = $('#tout-ajouter');
    if (toutAjouter) {
      toutAjouter.addEventListener('click', () => {
        const dispo = favoris().map(produitParId).filter((p) => p.stock > 0);
        dispo.forEach((p) =>
          ajouterAuPanier(p.id, p.couleurs[0], p.capacites ? p.capacites[0].id : null, 1, true));
        notifier(`${dispo.length} produit${dispo.length > 1 ? 's' : ''} ajouté${dispo.length > 1 ? 's' : ''} au panier`);
      });
    }
    rendre();
  }

  /* --- Comparateur --- */
  function pageComparateur() {
    const zone = $('#zone-comparateur');
    if (!zone) return;

    function rendre() {
      const liste = comparateur().map(produitParId);

      if (!liste.length) {
        zone.innerHTML = `
          <div class="vide" style="margin:30px 0">
            <h3>Aucun produit à comparer</h3>
            <p>Ajoutez jusqu'à ${MAX_COMPARE} produits depuis la boutique avec l'icône de comparaison.</p>
            <a class="btn" href="boutique.html">Voir la boutique</a>
          </div>`;
        return;
      }

      /* Les lignes comparées dépendent de la catégorie du premier produit ;
         si les catégories diffèrent, on retombe sur l'union des clés. */
      let cles = SPECS_COMPARAISON[liste[0].categorie] || [];
      const memeCategorie = liste.every((p) => p.categorie === liste[0].categorie);
      if (!memeCategorie) {
        cles = [...new Set(liste.flatMap((p) => Object.keys(p.specs)))];
      }

      const prixMin = Math.min(...liste.map((p) => p.prix));
      const noteMax = Math.max(...liste.map((p) => p.note));

      zone.innerHTML = `
        ${!memeCategorie ? `<div class="alerte alerte--info">
          Vous comparez des produits de catégories différentes : certaines lignes seront vides.
        </div>` : ''}
        <div class="compare-wrap">
          <table class="compare">
            <thead>
              <tr>
                <th></th>
                ${liste.map((p) => `
                  <th class="compare__carte">
                    <a href="produit.html?id=${encodeURIComponent(p.id)}">
                      <img src="${image(p)}" alt="${esc(p.nom)}" loading="lazy">
                      <strong>${esc(p.nom)}</strong>
                    </a>
                    <span class="prix ${p.prix === prixMin ? 'mieux' : ''}">${euro(p.prix)}</span>
                    <div class="btn-row" style="margin-top:12px">
                      <button class="btn btn--soft btn--sm" type="button" data-ajouter="${esc(p.id)}"
                              ${p.stock === 0 ? 'disabled' : ''}>Ajouter</button>
                      <button class="btn btn--ghost btn--sm" type="button" data-retirer-compare="${esc(p.id)}">
                        Retirer
                      </button>
                    </div>
                  </th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Note</th>
                ${liste.map((p) => `
                  <td class="${p.note === noteMax ? 'mieux' : ''}">
                    <span class="etoiles">${etoiles(p.note)}</span> ${p.note.toFixed(1)}
                    <br><span style="color:var(--muted);font-size:.84rem">${p.nbAvis} avis</span>
                  </td>`).join('')}
              </tr>
              <tr>
                <th scope="row">Disponibilité</th>
                ${liste.map((p) => {
                  const s = etatStock(p);
                  return `<td><span class="stock ${s.classe}">${s.texte}</span></td>`;
                }).join('')}
              </tr>
              <tr>
                <th scope="row">Coloris</th>
                ${liste.map((p) => `
                  <td><span style="display:flex;gap:5px">
                    ${p.couleurs.map((c) =>
                      `<span class="pion" style="background:${COULEURS[c].hex}" title="${esc(COULEURS[c].nom)}"></span>`
                    ).join('')}
                  </span></td>`).join('')}
              </tr>
              ${cles.map((cle) => `
                <tr>
                  <th scope="row">${esc(cle)}</th>
                  ${liste.map((p) => `<td>${esc(p.specs[cle] || '—')}</td>`).join('')}
                </tr>`).join('')}
              <tr>
                <th scope="row">Garantie</th>
                ${liste.map((p) => `<td>${esc(p.garantie)}</td>`).join('')}
              </tr>
            </tbody>
          </table>
        </div>

        <div class="btn-row" style="margin-top:26px">
          <button class="btn btn--ghost" type="button" id="vider-comparateur">Vider le comparateur</button>
          <a class="btn btn--soft" href="boutique.html">Ajouter un produit</a>
        </div>`;
    }

    zone.addEventListener('click', (e) => {
      const r = e.target.closest('[data-retirer-compare]');
      if (r) { basculerComparaison(r.dataset.retirerCompare); rendre(); return; }
      if (e.target.closest('#vider-comparateur')) {
        ecrire(CLES.comparateur, []);
        rafraichirCompteurs();
        majBarreComparateur();
        rendre();
      }
    });

    document.addEventListener('comparateur:maj', rendre);
    rendre();
  }

  /* ---------- 9. Divers ---------- */
  function initReveal() {
    const cibles = $$('.reveal');
    if (!cibles.length) return;
    if (!('IntersectionObserver' in window)) {
      cibles.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    cibles.forEach((el) => obs.observe(el));
  }

  function initFormulairesDemo() {
    $$('[data-demo]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = form.dataset.demo || 'Message envoyé, merci !';
        const zone = form.querySelector('[data-message]');
        if (zone) zone.innerHTML = `<div class="alerte alerte--ok">${esc(message)}</div>`;
        else notifier(message);
        form.reset();
      });
    });
  }

  function initAnnee() {
    $$('[data-annee]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- 10. Démarrage ---------- */
  document.documentElement.classList.add('js');
  initTheme();

  function demarrer() {
    rafraichirCompteurs();
    initMenu();
    initTiroir();
    initRecherche();
    initActionsProduit();
    initLignesPanier();
    majBarreComparateur();

    pageAccueil();
    pageBoutique();
    pageProduit();
    pagePanier();
    pageCommande();
    pageConfirmation();
    pageSuivi();
    pageFavoris();
    pageComparateur();

    initReveal();
    initFormulairesDemo();
    initAnnee();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }

  /* Synchronise l'état entre plusieurs onglets ouverts. */
  window.addEventListener('storage', (e) => {
    if (Object.values(CLES).includes(e.key)) {
      rafraichirCompteurs();
      majBarreComparateur();
      document.dispatchEvent(new CustomEvent('panier:maj'));
      document.dispatchEvent(new CustomEvent('favoris:maj'));
      document.dispatchEvent(new CustomEvent('comparateur:maj'));
    }
  });
})();
