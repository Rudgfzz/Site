/* ==============================================================
   RIVAGE — comportements
   --------------------------------------------------------------
   Le catalogue, le panier et le paiement restent gérés par
   Shopify. Ce fichier ajoute les animations et le confort de
   navigation. Sans JavaScript, les formulaires Shopify prennent
   le relais et la boutique reste utilisable.

     1. Utilitaires        5. Recherche
     2. Animations         6. Fiche produit
     3. En-tête & menu     7. Rails
     4. Panier             8. Démarrage
   ============================================================== */
(function () {
  'use strict';

  var CFG = window.RIVAGE || {};
  var T = CFG.textes || {};
  var ANIM = CFG.anim || {};

  /* ---------- 1. Utilitaires ---------- */
  var un = function (s, c) { return (c || document).querySelector(s); };
  var tous = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function t(cle, repli) { return T[cle] || repli; }

  /** Formate un montant en centimes selon le format de la boutique. */
  function argent(centimes) {
    var format = CFG.formatMonnaie || '{{ amount_with_comma_separator }} €';
    var valeur = (centimes || 0) / 100;

    function nombre(decimales, milliers, decimal) {
      var fixe = Math.abs(valeur).toFixed(decimales);
      var parts = fixe.split('.');
      var entier = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, milliers);
      return decimales > 0 && parts[1] ? entier + decimal + parts[1] : entier;
    }

    return format.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, cle) {
      switch (cle) {
        case 'amount': return nombre(2, ',', '.');
        case 'amount_no_decimals': return nombre(0, ',', '.');
        case 'amount_with_comma_separator': return nombre(2, ' ', ',');
        case 'amount_no_decimals_with_comma_separator': return nombre(0, ' ', ',');
        case 'amount_with_space_separator': return nombre(2, ' ', ',');
        case 'amount_no_decimals_with_space_separator': return nombre(0, ' ', ',');
        case 'amount_with_apostrophe_separator': return nombre(2, "'", '.');
        default: return nombre(2, ' ', ',');
      }
    });
  }

  var mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function notifier(message) {
    var zone = un('[data-notifications]');
    if (!zone) return;
    var el = document.createElement('div');
    el.className = 'notification';
    el.textContent = message;
    zone.appendChild(el);
    requestAnimationFrame(function () { el.dataset.visible = 'true'; });
    setTimeout(function () {
      el.dataset.visible = 'false';
      setTimeout(function () { el.remove(); }, 400);
    }, 2600);
  }

  /* ---------- 2. Animations ---------- */
  var observateur = null;

  function initAnimations() {
    if (observateur) observateur.disconnect();
    if (mouvementReduit || ANIM.apparition === false) {
      tous('[data-anim]').forEach(function (el) { el.dataset.vu = 'true'; });
      tous('.chapitre, .devoile').forEach(function (el) { el.dataset.vu = 'true'; });
      return;
    }

    observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        entree.target.dataset.vu = 'true';
        observateur.unobserve(entree.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    /* Les éléments d'un même groupe se décalent les uns après les autres. */
    tous('[data-anim-groupe]').forEach(function (groupe) {
      var pas = parseInt(groupe.dataset.animGroupe, 10);
      if (isNaN(pas)) pas = 0;
      tous('[data-anim]', groupe).forEach(function (el, i) {
        el.style.setProperty('--retard', (i * pas) + 'ms');
      });
    });

    tous('[data-anim], .chapitre, .devoile').forEach(function (el) {
      observateur.observe(el);
    });
  }

  function initCurseur() {
    var curseur = un('[data-curseur]');
    if (!curseur || mouvementReduit) return;
    var x = 0, y = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', function (e) { x = e.clientX; y = e.clientY; });
    document.addEventListener('mouseover', function (e) {
      var cible = e.target.closest('a, button, summary, [role="button"]');
      curseur.dataset.actif = String(!!cible);
    });

    (function boucle() {
      /* Interpolation : le curseur suit avec un léger retard. */
      cx += (x - cx) * 0.18;
      cy += (y - cy) * 0.18;
      curseur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(boucle);
    })();
  }

  /* ---------- 3. En-tête, menu, surcouches ---------- */
  function initEntete() {
    var entete = un('[data-entete]');
    if (!entete) return;
    var dernier = window.scrollY;
    var transparentDepart = entete.dataset.transparent === 'true';

    function auDefilement() {
      var y = window.scrollY;

      if (transparentDepart) {
        /* Passé la première hauteur d'écran, l'en-tête reprend un fond. */
        entete.dataset.transparent = String(y < window.innerHeight * 0.72);
      }
      /* On masque l'en-tête quand on descend, on le rend quand on remonte. */
      entete.dataset.cache = String(y > dernier && y > 220 && !un('[data-ouvert="true"]'));
      dernier = y;
    }

    window.addEventListener('scroll', auDefilement, { passive: true });
    auDefilement();
  }

  function ouvrir(el) {
    if (!el) return;
    el.hidden = false;
    requestAnimationFrame(function () { el.dataset.ouvert = 'true'; });
    var voile = un('[data-voile]');
    if (voile) { voile.hidden = false; requestAnimationFrame(function () { voile.dataset.ouvert = 'true'; }); }
    document.body.classList.add('bloque');
  }

  function fermerTout() {
    tous('[data-tiroir], [data-recherche], [data-voile]').forEach(function (el) {
      el.dataset.ouvert = 'false';
      setTimeout(function () { if (el.dataset.ouvert !== 'true') el.hidden = true; }, 550);
    });
    document.body.classList.remove('bloque');
  }

  function initSurcouches() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-ouvrir-panier]')) {
        e.preventDefault();
        chargerPanier();
        return ouvrir(un('[data-tiroir="panier"]'));
      }
      if (e.target.closest('[data-ouvrir-recherche]')) {
        e.preventDefault();
        ouvrir(un('[data-recherche]'));
        var champ = un('[data-recherche-champ]');
        if (champ) setTimeout(function () { champ.focus(); }, 120);
        return;
      }
      if (e.target.closest('[data-fermer]') || e.target.closest('[data-voile]')) {
        return fermerTout();
      }
      var burger = e.target.closest('[data-burger]');
      if (burger) {
        var nav = un('[data-nav]');
        if (!nav) return;
        var ouvertMenu = nav.dataset.ouvert !== 'true';
        nav.dataset.ouvert = String(ouvertMenu);
        burger.setAttribute('aria-expanded', String(ouvertMenu));
        document.body.classList.toggle('bloque', ouvertMenu);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fermerTout();
      /* Raccourci « / » pour ouvrir la recherche, comme sur un moteur. */
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        ouvrir(un('[data-recherche]'));
        var champ = un('[data-recherche-champ]');
        if (champ) champ.focus();
      }
    });
  }

  /* ---------- 4. Panier ---------- */
  function majCompteur(n) {
    tous('[data-compteur-panier]').forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
  }

  function chargerPanier() {
    return fetch(CFG.routes.panier + '.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (panier) {
        majCompteur(panier.item_count);
        rendrePanier(panier);
        return panier;
      })
      .catch(function () { /* hors ligne : le tiroir garde son contenu */ });
  }

  function rendrePanier(panier) {
    var corps = un('[data-panier-corps]');
    var pied = un('[data-panier-pied]');
    if (!corps || !pied) return;

    if (!panier.items || !panier.items.length) {
      corps.innerHTML =
        '<div class="vide">' +
        '<h2 class="titre-petit">' + esc(t('panierVideTitre', 'Votre panier est vide')) + '</h2>' +
        '<p>' + esc(t('panierVideTexte', '')) + '</p>' +
        '<a class="bouton" href="' + esc(CFG.routes.recherche.replace('/search', '/collections/all')) + '">' +
        esc(t('panierVideBouton', 'Parcourir la boutique')) + '</a></div>';
      pied.innerHTML = '';
      return;
    }

    corps.innerHTML = panier.items.map(function (item, i) {
      var image = item.image
        ? '<img src="' + esc(item.image) + '" alt="" width="78" height="104" loading="lazy">'
        : '<span></span>';
      var variante = item.variant_title ? '<p class="ligne-panier__meta">' + esc(item.variant_title) + '</p>' : '';
      return '<div class="ligne-panier">' + image +
        '<div><a class="ligne-panier__nom" href="' + esc(item.url) + '">' + esc(item.product_title) + '</a>' +
        variante +
        '<div class="ligne-panier__bas">' +
        '<span class="quantite">' +
        '<button type="button" data-qte="' + (i + 1) + '" data-delta="-1" aria-label="' + esc(t('diminuer', '-')) + '">−</button>' +
        '<input type="number" value="' + item.quantity + '" min="0" data-ligne="' + (i + 1) + '" aria-label="' + esc(t('quantite', 'Quantité')) + '">' +
        '<button type="button" data-qte="' + (i + 1) + '" data-delta="1" aria-label="' + esc(t('augmenter', '+')) + '">+</button>' +
        '</span><span>' + argent(item.final_line_price) + '</span></div>' +
        '<button class="lien-retirer" type="button" data-qte="' + (i + 1) + '" data-zero="1">' +
        esc(t('retirer', 'Retirer')) + '</button>' +
        '</div></div>';
    }).join('');

    var franco = '';
    if (CFG.seuilFranco > 0) {
      var reste = CFG.seuilFranco - panier.total_price;
      var part = Math.min(100, (panier.total_price / CFG.seuilFranco) * 100);
      franco = '<div class="franco">' +
        (reste > 0
          ? esc(t('francoAvant', '')) + ' <strong>' + argent(reste) + '</strong> ' + esc(t('francoApres', ''))
          : esc(t('francoAtteint', ''))) +
        '<div class="franco__piste"><div class="franco__jauge" style="width:' + part + '%"></div></div></div>';
    }

    pied.innerHTML = franco +
      '<div class="total"><span>' + esc(t('sousTotal', 'Sous-total')) + '</span>' +
      '<strong>' + argent(panier.total_price) + '</strong></div>' +
      '<p class="franco">' + esc(t('taxes', '')) + '</p>' +
      '<a class="bouton bouton--large" href="/checkout">' + esc(t('commander', 'Passer commande')) + '</a>' +
      '<a class="lien" style="display:block;text-align:center;margin-top:16px" href="' +
      esc(CFG.routes.panier) + '">' + esc(t('voirPanier', 'Voir le panier')) + '</a>';
  }

  function changerLigne(ligne, quantite) {
    return fetch(CFG.routes.modifier + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: ligne, quantity: quantite })
    })
      .then(function (r) { return r.json(); })
      .then(function (panier) {
        majCompteur(panier.item_count);
        rendrePanier(panier);
      });
  }

  function initPanier() {
    document.addEventListener('click', function (e) {
      var bouton = e.target.closest('[data-qte]');
      if (!bouton) return;
      var ligne = parseInt(bouton.dataset.qte, 10);
      if (bouton.dataset.zero) return changerLigne(ligne, 0);
      var champ = un('input[data-ligne="' + ligne + '"]');
      var actuel = champ ? parseInt(champ.value, 10) : 1;
      changerLigne(ligne, Math.max(0, actuel + parseInt(bouton.dataset.delta, 10)));
    });

    document.addEventListener('change', function (e) {
      var champ = e.target.closest('input[data-ligne]');
      if (!champ) return;
      changerLigne(parseInt(champ.dataset.ligne, 10), Math.max(0, parseInt(champ.value, 10) || 0));
    });

    /* Ajout au panier sans quitter la page. */
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('form[action*="/cart/add"]');
      if (!form || CFG.panierType === 'page') return;
      e.preventDefault();

      var bouton = form.querySelector('[type="submit"]');
      var libelle = bouton ? bouton.textContent : '';
      if (bouton) { bouton.disabled = true; bouton.textContent = t('ajoutEnCours', '…'); }

      fetch(CFG.routes.ajout + '.js', { method: 'POST', body: new FormData(form) })
        .then(function (r) {
          if (!r.ok) throw new Error('ajout');
          return r.json();
        })
        .then(function () {
          return chargerPanier();
        })
        .then(function () {
          if (CFG.panierType === 'tiroir') ouvrir(un('[data-tiroir="panier"]'));
          else notifier(t('articleAjoute', ''));
        })
        .catch(function () { notifier(t('ajoutImpossible', '')); })
        .finally(function () {
          if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
        });
    });
  }

  /* ---------- 5. Recherche ---------- */
  function initRecherche() {
    var champ = un('[data-recherche-champ]');
    var zone = un('[data-recherche-resultats]');
    if (!champ || !zone) return;
    var attente;

    champ.addEventListener('input', function () {
      clearTimeout(attente);
      var q = champ.value.trim();
      if (q.length < 2) { zone.innerHTML = ''; return; }

      attente = setTimeout(function () {
        var url = CFG.routes.predictif + '?q=' + encodeURIComponent(q) +
          '&resources[type]=product&resources[limit]=6&section_id=recherche-predictive';
        fetch(url)
          .then(function (r) { return r.text(); })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var resultat = doc.querySelector('[data-resultats-predictifs]');
            zone.innerHTML = resultat
              ? resultat.innerHTML
              : '<p class="doux">' + esc(t('aucunResultat', '')) + '</p>';
          })
          .catch(function () { zone.innerHTML = ''; });
      }, 260);
    });
  }

  /* ---------- 6. Fiche produit ---------- */
  function initProduit() {
    var fiche = un('[data-fiche]');
    if (!fiche) return;

    var donnees = un('[data-variantes]');
    if (!donnees) return;
    var produit;
    try { produit = JSON.parse(donnees.textContent); } catch (e) { return; }

    var champId = un('[data-variante-id]', fiche);

    function choix() {
      var valeurs = [];
      tous('[data-option-index]', fiche).forEach(function (b) {
        if (b.getAttribute('aria-pressed') === 'true') {
          valeurs[parseInt(b.dataset.optionIndex, 10)] = b.dataset.valeur;
        }
      });
      return valeurs;
    }

    function trouver(valeurs) {
      return (produit.variants || []).filter(function (v) {
        return valeurs.every(function (val, i) {
          return val == null || v.options[i] === val;
        });
      })[0];
    }

    /* Grise les valeurs qui ne mènent à aucune variante disponible. */
    function majDisponibilites(valeurs) {
      tous('[data-option-index]', fiche).forEach(function (b) {
        var i = parseInt(b.dataset.optionIndex, 10);
        var essai = valeurs.slice();
        essai[i] = b.dataset.valeur;
        var v = trouver(essai);
        b.dataset.indisponible = String(!v || !v.available);
      });
    }

    function majImage(variante) {
      if (!variante || !variante.featured_image) return;
      var vue = un('[data-vue-principale] img', fiche);
      if (!vue) return;
      /* srcset prime sur src : sans le retirer, la photo ne changerait pas. */
      vue.removeAttribute('srcset');
      vue.removeAttribute('sizes');
      vue.src = variante.featured_image.src;
    }

    function appliquer() {
      var valeurs = choix();
      var variante = trouver(valeurs);
      majDisponibilites(valeurs);

      var bouton = un('[data-ajouter]', fiche);
      var prix = un('[data-prix]', fiche);
      var barre = un('[data-prix-barre]', fiche);
      var etat = un('[data-disponibilite]', fiche);

      if (!variante) {
        if (bouton) { bouton.disabled = true; bouton.textContent = t('indisponible', ''); }
        return;
      }

      if (champId) champId.value = variante.id;
      if (prix) prix.textContent = argent(variante.price);
      if (barre) {
        var solde = variante.compare_at_price && variante.compare_at_price > variante.price;
        barre.hidden = !solde;
        if (solde) barre.textContent = argent(variante.compare_at_price);
      }
      if (etat) {
        etat.textContent = variante.available ? t('enStock', '') : t('rupture', '');
        etat.dataset.etat = variante.available ? 'ok' : 'non';
      }
      if (bouton) {
        bouton.disabled = !variante.available;
        bouton.textContent = variante.available ? t('ajouter', '') : t('epuise', '');
      }
      majImage(variante);

      /* L'URL suit la variante choisie, pour que le lien reste partageable. */
      if (history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variante.id);
        history.replaceState({}, '', url.toString());
      }
    }

    fiche.addEventListener('click', function (e) {
      var bouton = e.target.closest('[data-option-index]');
      if (!bouton) return;
      var index = bouton.dataset.optionIndex;
      tous('[data-option-index="' + index + '"]', fiche).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === bouton));
      });
      var nom = un('[data-valeur-choisie="' + index + '"]', fiche);
      if (nom) nom.textContent = bouton.dataset.valeur;
      appliquer();
    });

    /* Quantité */
    fiche.addEventListener('click', function (e) {
      var bouton = e.target.closest('[data-quantite]');
      if (!bouton) return;
      var champ = un('[data-champ-quantite]', fiche);
      if (!champ) return;
      var v = parseInt(champ.value, 10) || 1;
      champ.value = Math.max(1, v + parseInt(bouton.dataset.quantite, 10));
    });

    appliquer();
  }

  /* ---------- 7. Rails ---------- */
  function initRails() {
    tous('[data-rail]').forEach(function (rail) {
      var piste = un('[data-rail-pouce]', rail.parentElement);

      function majPouce() {
        if (!piste) return;
        var max = rail.scrollWidth - rail.clientWidth;
        var part = max > 0 ? rail.scrollLeft / max : 0;
        var visible = rail.clientWidth / rail.scrollWidth;
        piste.style.width = Math.max(8, visible * 100) + '%';
        piste.style.transform = 'translateX(' + (part * (100 / Math.max(visible, .0001) - 100)) + '%)';
      }

      rail.addEventListener('scroll', majPouce, { passive: true });
      majPouce();

      tous('[data-rail-fleche]', rail.parentElement).forEach(function (fleche) {
        fleche.addEventListener('click', function () {
          var pas = rail.clientWidth * 0.8 * parseInt(fleche.dataset.railFleche, 10);
          rail.scrollBy({ left: pas, behavior: mouvementReduit ? 'auto' : 'smooth' });
        });
      });
    });
  }

  /* ---------- 8. Démarrage ---------- */
  function demarrer() {
    initAnimations();
    initCurseur();
    initEntete();
    initSurcouches();
    initPanier();
    initRecherche();
    initProduit();
    initRails();
    chargerPanier();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }

  /* L'éditeur de thème recharge les sections une à une : on relance
     les modules concernés pour que l'aperçu reste fidèle. */
  document.addEventListener('shopify:section:load', function () {
    initAnimations();
    initProduit();
    initRails();
    initEntete();
  });

  window.RIVAGE.api = {
    argent: argent,
    notifier: notifier,
    chargerPanier: chargerPanier,
    ouvrir: ouvrir,
    fermerTout: fermerTout
  };
})();
