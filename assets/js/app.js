/* =============================================================
   STUDIO — logique du site
   Dépend de assets/js/products.js (chargé avant ce fichier).
   Aucune bibliothèque externe.
   ============================================================= */
(function () {
  'use strict';

  /* Active les effets qui dépendent du JS (apparition au défilement).
     Sans cette classe, le contenu reste simplement visible. */
  document.documentElement.classList.add('js');

  /* ---------- Utilitaires ---------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const echapper = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const prix = (n) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);

  const nomCategorie = (id) => {
    const c = CATEGORIES.find((c) => c.id === id);
    return c ? c.nom : id;
  };

  const trouverProduit = (id) => PRODUITS.find((p) => p.id === id);

  /* ---------- Panier (localStorage) ---------- */
  const CLE_PANIER = 'studio_panier';

  function lirePanier() {
    try {
      const brut = JSON.parse(localStorage.getItem(CLE_PANIER) || '[]');
      if (!Array.isArray(brut)) return [];
      // On ne garde que les lignes dont le produit existe encore au catalogue.
      return brut
        .filter((l) => l && trouverProduit(l.id))
        .map((l) => ({ id: l.id, qte: Math.max(1, parseInt(l.qte, 10) || 1) }));
    } catch (e) {
      return [];
    }
  }

  function ecrirePanier(lignes) {
    try {
      localStorage.setItem(CLE_PANIER, JSON.stringify(lignes));
    } catch (e) {
      /* mode privé : le panier reste valable le temps de la session */
    }
    majCompteur();
    document.dispatchEvent(new CustomEvent('panier:maj'));
  }

  function ajouterAuPanier(id, qte = 1) {
    const lignes = lirePanier();
    const ligne = lignes.find((l) => l.id === id);
    if (ligne) ligne.qte += qte;
    else lignes.push({ id, qte });
    ecrirePanier(lignes);
    const p = trouverProduit(id);
    notifier(p ? `« ${p.nom} » ajouté au panier` : 'Ajouté au panier');
  }

  function majQuantite(id, qte) {
    let lignes = lirePanier();
    if (qte <= 0) lignes = lignes.filter((l) => l.id !== id);
    else {
      const ligne = lignes.find((l) => l.id === id);
      if (ligne) ligne.qte = qte;
    }
    ecrirePanier(lignes);
  }

  function retirerDuPanier(id) {
    ecrirePanier(lirePanier().filter((l) => l.id !== id));
  }

  const totalArticles = () => lirePanier().reduce((s, l) => s + l.qte, 0);
  const totalPrix = () =>
    lirePanier().reduce((s, l) => {
      const p = trouverProduit(l.id);
      return s + (p ? p.prix * l.qte : 0);
    }, 0);

  function majCompteur() {
    const n = totalArticles();
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  /* ---------- Notification ---------- */
  let minuteurToast;
  function notifier(message) {
    let toast = $('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.dataset.show = 'true';
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => { toast.dataset.show = 'false'; }, 2600);
  }

  /* ---------- Carte produit ---------- */
  function carteProduit(p) {
    const badge = p.badge
      ? `<span class="badge">${echapper(p.badge)}</span>`
      : '';
    const barre = p.prixBarre ? `<s>${prix(p.prixBarre)}</s>` : '';
    return `
      <article class="card">
        <a class="card__media" href="produit.html?id=${encodeURIComponent(p.id)}"
           aria-label="Voir ${echapper(p.nom)}">
          <img src="${echapper(p.image)}" alt="${echapper(p.nom)}" loading="lazy" width="800" height="600">
          ${badge}
        </a>
        <div class="card__body">
          <p class="card__cat">${echapper(nomCategorie(p.categorie))}</p>
          <h3 class="card__title">
            <a href="produit.html?id=${encodeURIComponent(p.id)}">${echapper(p.nom)}</a>
          </h3>
          <p class="card__desc">${echapper(p.accroche)}</p>
          <div class="card__foot">
            <span class="price">${barre}${prix(p.prix)}</span>
            <button class="btn btn--soft btn--sm" data-ajouter="${echapper(p.id)}">Ajouter</button>
          </div>
        </div>
      </article>`;
  }

  function rendreGrille(conteneur, liste, messageVide = 'Aucun produit ne correspond.') {
    if (!conteneur) return;
    conteneur.innerHTML = liste.length
      ? liste.map(carteProduit).join('')
      : `<p class="empty-state">${echapper(messageVide)}</p>`;
  }

  /* Délégation : un seul écouteur pour tous les boutons « Ajouter » */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ajouter]');
    if (!btn) return;
    e.preventDefault();
    ajouterAuPanier(btn.dataset.ajouter, parseInt(btn.dataset.qte, 10) || 1);
  });

  /* ---------- Page d'accueil ---------- */
  function initAccueil() {
    const grille = $('#grille-vedettes');
    if (!grille) return;
    const vedettes = PRODUITS.filter((p) => p.vedette);
    rendreGrille(grille, (vedettes.length ? vedettes : PRODUITS).slice(0, 4));

    const cats = $('#grille-categories');
    if (cats) {
      cats.innerHTML = CATEGORIES.map((c) => {
        const n = PRODUITS.filter((p) => p.categorie === c.id).length;
        return `<a class="cat-card" href="boutique.html?categorie=${encodeURIComponent(c.id)}">
                  ${echapper(c.nom)}
                  <span>${n} produit${n > 1 ? 's' : ''}</span>
                </a>`;
      }).join('');
    }
  }

  /* ---------- Page boutique ---------- */
  function initBoutique() {
    const grille = $('#grille-boutique');
    if (!grille) return;

    const chips    = $('#filtres-categories');
    const recherche = $('#recherche');
    const tri      = $('#tri');
    const compteur = $('#compteur-resultats');

    const params = new URLSearchParams(location.search);
    let categorieActive = params.get('categorie') || 'tous';
    if (categorieActive !== 'tous' && !CATEGORIES.some((c) => c.id === categorieActive)) {
      categorieActive = 'tous';
    }

    if (chips) {
      const boutons = [{ id: 'tous', nom: 'Tout' }].concat(CATEGORIES);
      chips.innerHTML = boutons
        .map(
          (c) =>
            `<button class="chip" type="button" data-cat="${echapper(c.id)}"
               aria-pressed="${c.id === categorieActive}">${echapper(c.nom)}</button>`
        )
        .join('');
      chips.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        categorieActive = b.dataset.cat;
        $$('[data-cat]', chips).forEach((x) =>
          x.setAttribute('aria-pressed', String(x.dataset.cat === categorieActive))
        );
        const url = new URL(location.href);
        if (categorieActive === 'tous') url.searchParams.delete('categorie');
        else url.searchParams.set('categorie', categorieActive);
        history.replaceState(null, '', url);
        appliquer();
      });
    }

    function appliquer() {
      const q = (recherche?.value || '').trim().toLowerCase();
      let liste = PRODUITS.filter((p) => {
        const okCat = categorieActive === 'tous' || p.categorie === categorieActive;
        const okQ =
          !q ||
          p.nom.toLowerCase().includes(q) ||
          p.accroche.toLowerCase().includes(q) ||
          nomCategorie(p.categorie).toLowerCase().includes(q);
        return okCat && okQ;
      });

      switch (tri?.value) {
        case 'prix-asc':  liste = liste.slice().sort((a, b) => a.prix - b.prix); break;
        case 'prix-desc': liste = liste.slice().sort((a, b) => b.prix - a.prix); break;
        case 'nom':       liste = liste.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr')); break;
        default: break; /* ordre du catalogue */
      }

      rendreGrille(grille, liste);
      if (compteur) {
        compteur.textContent =
          liste.length === 0
            ? 'Aucun résultat'
            : `${liste.length} produit${liste.length > 1 ? 's' : ''}`;
      }
    }

    recherche?.addEventListener('input', appliquer);
    tri?.addEventListener('change', appliquer);
    appliquer();
  }

  /* ---------- Page produit ---------- */
  function initProduit() {
    const zone = $('#zone-produit');
    if (!zone) return;

    const id = new URLSearchParams(location.search).get('id');
    const p = id ? trouverProduit(id) : null;

    if (!p) {
      zone.innerHTML = `
        <div class="empty-state" style="margin:60px 0">
          <h1 style="font-size:1.3rem">Produit introuvable</h1>
          <p>Ce produit n'existe pas ou n'est plus disponible.</p>
          <a class="btn" href="boutique.html">Retour à la boutique</a>
        </div>`;
      return;
    }

    document.title = `${p.nom} — ${BOUTIQUE.nom}`;
    const meta = $('meta[name="description"]');
    if (meta) meta.setAttribute('content', p.accroche);

    const fil = $('#fil-ariane-produit');
    if (fil) fil.textContent = p.nom;

    const images = (p.galerie && p.galerie.length ? p.galerie : [p.image]);
    const barre = p.prixBarre ? `<s>${prix(p.prixBarre)}</s>` : '';

    const inclus = (p.inclus || [])
      .map((i) => `<li>${echapper(i)}</li>`)
      .join('');

    const specs = Object.entries(p.specs || {})
      .map(([k, v]) => `<tr><th scope="row">${echapper(k)}</th><td>${echapper(v)}</td></tr>`)
      .join('');

    const boutonAchat = p.lienAchat
      ? `<a class="btn btn--lg" href="${echapper(p.lienAchat)}" target="_blank" rel="noopener">Acheter maintenant</a>`
      : `<button class="btn btn--lg" data-ajouter="${echapper(p.id)}">Ajouter au panier</button>`;

    zone.innerHTML = `
      <div class="product">
        <div class="product__media">
          <div class="gallery__main">
            <img id="image-principale" src="${echapper(images[0])}" alt="${echapper(p.nom)}" width="800" height="600">
          </div>
          ${
            images.length > 1
              ? `<div class="gallery__thumbs" id="miniatures">
                   ${images
                     .map(
                       (src, i) =>
                         `<button type="button" data-src="${echapper(src)}" aria-current="${i === 0}">
                            <img src="${echapper(src)}" alt="Aperçu ${i + 1} de ${echapper(p.nom)}" loading="lazy">
                          </button>`
                     )
                     .join('')}
                 </div>`
              : ''
          }
        </div>

        <div class="product__info">
          <p class="eyebrow">${echapper(nomCategorie(p.categorie))}</p>
          <h1>${echapper(p.nom)}</h1>
          <p class="lead" style="font-size:1.02rem">${echapper(p.accroche)}</p>
          <p class="product__price">${prix(p.prix)} ${barre}</p>

          <div class="product__actions">
            ${boutonAchat}
            <a class="btn btn--ghost btn--lg" href="panier.html">Voir le panier</a>
          </div>

          <p style="color:var(--text-soft);font-size:.95rem">${echapper(p.description)}</p>

          ${inclus ? `<h2 style="font-size:1.05rem;margin-top:28px">Ce qui est inclus</h2>
                      <ul class="list-check">${inclus}</ul>` : ''}

          ${specs ? `<h2 style="font-size:1.05rem">Caractéristiques</h2>
                     <table class="specs"><tbody>${specs}</tbody></table>` : ''}

          <div class="reassurance">
            <div>${icone('download')}<span>Téléchargement immédiat après paiement</span></div>
            <div>${icone('shield')}<span>Paiement sécurisé</span></div>
            <div>${icone('refresh')}<span>Mises à jour incluses</span></div>
          </div>
        </div>
      </div>`;

    const miniatures = $('#miniatures');
    if (miniatures) {
      miniatures.addEventListener('click', (e) => {
        const b = e.target.closest('[data-src]');
        if (!b) return;
        $('#image-principale').src = b.dataset.src;
        $$('[data-src]', miniatures).forEach((x) =>
          x.setAttribute('aria-current', String(x === b))
        );
      });
    }

    // Produits similaires
    const similaires = $('#grille-similaires');
    if (similaires) {
      let liste = PRODUITS.filter((x) => x.categorie === p.categorie && x.id !== p.id);
      if (liste.length < 3) {
        liste = liste.concat(
          PRODUITS.filter((x) => x.id !== p.id && !liste.includes(x))
        );
      }
      rendreGrille(similaires, liste.slice(0, 4));
    }
  }

  /* ---------- Page panier ---------- */
  function initPanier() {
    const zone = $('#zone-panier');
    if (!zone) return;

    function rendre() {
      const lignes = lirePanier();

      if (!lignes.length) {
        zone.innerHTML = `
          <div class="empty-state" style="margin:20px 0 60px">
            <h2 style="font-size:1.2rem;color:var(--text)">Votre panier est vide</h2>
            <p>Parcourez le catalogue pour y ajouter des produits.</p>
            <a class="btn" href="boutique.html">Découvrir la boutique</a>
          </div>`;
        return;
      }

      const articles = lignes
        .map((l) => {
          const p = trouverProduit(l.id);
          return `
            <div class="cart-line">
              <a class="cart-line__img" href="produit.html?id=${encodeURIComponent(p.id)}">
                <img src="${echapper(p.image)}" alt="${echapper(p.nom)}" loading="lazy">
              </a>
              <div>
                <p class="cart-line__name">
                  <a href="produit.html?id=${encodeURIComponent(p.id)}">${echapper(p.nom)}</a>
                </p>
                <p class="cart-line__meta">${echapper(nomCategorie(p.categorie))} · ${prix(p.prix)} l'unité</p>
              </div>
              <div class="cart-line__end">
                <div class="qty">
                  <button type="button" data-moins="${echapper(p.id)}" aria-label="Retirer un exemplaire">−</button>
                  <span>${l.qte}</span>
                  <button type="button" data-plus="${echapper(p.id)}" aria-label="Ajouter un exemplaire">+</button>
                </div>
                <strong class="price">${prix(p.prix * l.qte)}</strong>
                <button type="button" class="link-danger" data-retirer="${echapper(p.id)}">Retirer</button>
              </div>
            </div>`;
        })
        .join('');

      const total = totalPrix();

      zone.innerHTML = `
        <div class="cart-layout">
          <div>${articles}</div>
          <aside class="summary">
            <h2>Récapitulatif</h2>
            <div class="summary__row"><span>Sous-total</span><span>${prix(total)}</span></div>
            <div class="summary__row"><span>Livraison</span><span>Téléchargement — gratuit</span></div>
            <div class="summary__total"><span>Total</span><span>${prix(total)}</span></div>
            <button class="btn btn--block btn--lg" id="commander" style="margin-top:20px">Passer commande</button>
            <p class="form-note" style="margin-top:14px;text-align:center">
              Paiement sécurisé · Accès aux fichiers immédiat
            </p>
          </aside>
        </div>`;
    }

    zone.addEventListener('click', (e) => {
      const plus    = e.target.closest('[data-plus]');
      const moins   = e.target.closest('[data-moins]');
      const retirer = e.target.closest('[data-retirer]');
      const cmd     = e.target.closest('#commander');

      if (plus || moins) {
        const id = (plus || moins).dataset[plus ? 'plus' : 'moins'];
        const ligne = lirePanier().find((l) => l.id === id);
        if (ligne) majQuantite(id, ligne.qte + (plus ? 1 : -1));
      } else if (retirer) {
        retirerDuPanier(retirer.dataset.retirer);
      } else if (cmd) {
        notifier('Branchez ici votre solution de paiement (Stripe, Gumroad…)');
      }
    });

    document.addEventListener('panier:maj', rendre);
    rendre();
  }

  /* ---------- Icônes ---------- */
  function icone(nom) {
    const traits = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
    const chemins = {
      download: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/>',
      shield:   '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z"/>',
      refresh:  '<path d="M4 12a8 8 0 0113.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 01-13.7 5.7L4 16M4 20v-4h4"/>',
      bolt:     '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
      device:   '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
      heart:    '<path d="M12 20s-7-4.4-7-9a4 4 0 017-2.6A4 4 0 0119 11c0 4.6-7 9-7 9z"/>',
    };
    return `<svg viewBox="0 0 24 24" ${traits} aria-hidden="true">${chemins[nom] || ''}</svg>`;
  }

  /* ---------- Menu mobile ---------- */
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') basculer(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 860) basculer(false); });
  }

  /* ---------- Apparition au défilement ---------- */
  function initReveal() {
    const cibles = $$('.reveal');
    if (!cibles.length) return;
    if (!('IntersectionObserver' in window)) {
      cibles.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    cibles.forEach((el) => obs.observe(el));
  }

  /* ---------- Formulaires de démonstration ---------- */
  function initFormulaires() {
    $$('[data-form-demo]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = form.dataset.formDemo || 'Message envoyé, merci !';
        const zone = $('[data-form-message]', form);
        if (zone) {
          zone.innerHTML = `<div class="alert alert--ok">${echapper(message)}</div>`;
        } else {
          notifier(message);
        }
        form.reset();
      });
    });
  }

  /* ---------- Divers ---------- */
  function initAnnee() {
    $$('[data-annee]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Démarrage ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    majCompteur();
    initMenu();
    initAccueil();
    initBoutique();
    initProduit();
    initPanier();
    initReveal();
    initFormulaires();
    initAnnee();
  });

  // Synchronise le panier entre plusieurs onglets ouverts.
  window.addEventListener('storage', (e) => {
    if (e.key === CLE_PANIER) {
      majCompteur();
      document.dispatchEvent(new CustomEvent('panier:maj'));
    }
  });
})();
