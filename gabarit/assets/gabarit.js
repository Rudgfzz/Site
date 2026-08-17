/* ==============================================================
   GABARIT — comportements
   --------------------------------------------------------------
   La particularité du thème : le visiteur donne sa taille une
   fois, et le catalogue lui répond. Chaque vignette sait si la
   pièce existe dans cette taille ; il peut masquer le reste.

   Le catalogue, le panier et le paiement restent gérés par
   Shopify. Sans JavaScript, la boutique reste utilisable : les
   formulaires classiques prennent le relais.

     1. Utilitaires     5. Panier
     2. Taille          6. Recherche
     3. Animations      7. Fiche produit
     4. En-tête         8. Démarrage
   ============================================================== */
(function () {
  'use strict';

  var CFG = window.GABARIT || {};
  var T = CFG.textes || {};
  var TAILLE = CFG.taille || {};
  var ANIM = CFG.anim || {};
  var CLE = 'gabarit_taille';
  var CLE_FILTRE = 'gabarit_filtre_taille';

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

  function t(cle, repli) { return T[cle] || repli || ''; }

  function lire(cle, defaut) {
    try {
      var v = localStorage.getItem(cle);
      return v === null ? defaut : JSON.parse(v);
    } catch (e) { return defaut; }
  }

  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) { /* navigation privée */ }
  }

  function argent(centimes) {
    var format = CFG.monnaie || '{{ amount_with_comma_separator }} €';
    var valeur = (centimes || 0) / 100;
    function nombre(dec, mille, virgule) {
      var fixe = Math.abs(valeur).toFixed(dec);
      var p = fixe.split('.');
      var entier = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, mille);
      return dec > 0 && p[1] ? entier + virgule + p[1] : entier;
    }
    return format.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, cle) {
      switch (cle) {
        case 'amount': return nombre(2, ',', '.');
        case 'amount_no_decimals': return nombre(0, ',', '.');
        case 'amount_no_decimals_with_comma_separator': return nombre(0, ' ', ',');
        case 'amount_with_apostrophe_separator': return nombre(2, "'", '.');
        default: return nombre(2, ' ', ',');
      }
    });
  }

  var sansMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function notifier(message) {
    var zone = un('[data-notifications]');
    if (!zone || !message) return;
    var el = document.createElement('div');
    el.className = 'notification';
    el.textContent = message;
    zone.appendChild(el);
    requestAnimationFrame(function () { el.dataset.visible = 'true'; });
    setTimeout(function () {
      el.dataset.visible = 'false';
      setTimeout(function () { el.remove(); }, 350);
    }, 2500);
  }

  /* ---------- 2. Taille ---------- */
  var maTaille = lire(CLE, '');
  var filtreTaille = lire(CLE_FILTRE, false);

  function normaliser(v) {
    return String(v == null ? '' : v).trim().toLowerCase();
  }

  /**
   * Applique la taille retenue à toutes les vignettes présentes.
   * Chaque vignette expose ses tailles disponibles et épuisées via
   * des attributs posés par le Liquid : aucune requête n'est nécessaire.
   */
  function appliquerTaille() {
    var choisie = normaliser(maTaille);

    tous('[data-jeton-taille]').forEach(function (jeton) {
      jeton.dataset.vide = String(!maTaille);
      var valeur = un('[data-jeton-valeur]', jeton);
      if (valeur) valeur.textContent = maTaille || t('aucune', '—');
    });

    tous('.piece').forEach(function (piece) {
      var dispo = (piece.dataset.tailles || '').split('|').filter(Boolean).map(normaliser);
      var epuisees = (piece.dataset.taillesEpuisees || '').split('|').filter(Boolean).map(normaliser);

      /* La mention se pose sur la vue elle-même : « attr() » ne lit que
         les attributs de l'élément qui porte le pseudo-élément. Posée
         sur la carte, elle laisserait une bande vide sous la photo. */
      var vue = piece.querySelector('.piece__vue');

      if (!choisie || !dispo.length) {
        piece.removeAttribute('data-ma-taille');
        if (vue) vue.removeAttribute('data-mention');
      } else if (dispo.indexOf(choisie) === -1) {
        /* La taille n'est pas proposée sur cet article. */
        piece.dataset.maTaille = 'non';
        if (vue) vue.dataset.mention = t('nonProposee', '');
      } else if (epuisees.indexOf(choisie) !== -1) {
        piece.dataset.maTaille = 'non';
        if (vue) vue.dataset.mention = t('indispo', '');
      } else {
        piece.dataset.maTaille = 'oui';
        if (vue) vue.removeAttribute('data-mention');
      }

      tous('.piece__taille', piece).forEach(function (marque) {
        marque.dataset.mienne = String(choisie !== '' && normaliser(marque.dataset.valeur) === choisie);
      });
    });

    tous('.grille').forEach(function (grille) {
      grille.dataset.filtre = String(!!(filtreTaille && choisie));
    });

    tous('[data-bascule-filtre]').forEach(function (c) { c.checked = !!filtreTaille; });
    tous('[data-taille-valeur]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(normaliser(b.dataset.tailleValeur) === choisie));
    });

    document.documentElement.dataset.tailleChoisie = maTaille || '';
  }

  function definirTaille(valeur, silencieux) {
    maTaille = valeur || '';
    ecrire(CLE, maTaille);
    appliquerTaille();
    majFicheTaille();
    if (!silencieux && maTaille) notifier(t('reglee', '') + ' · ' + maTaille);
  }

  function ouvrirPanneauTaille() {
    var p = un('[data-panneau-taille]');
    if (!p) return;
    p.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { p.dataset.ouvert = 'true'; });
    });
  }

  function fermerPanneauTaille() {
    var p = un('[data-panneau-taille]');
    if (!p) return;
    p.dataset.ouvert = 'false';
    setTimeout(function () { if (p.dataset.ouvert !== 'true') p.hidden = true; }, 400);
    ecrire('gabarit_taille_vue', true);
  }

  function initTaille() {
    if (!TAILLE.active) return;
    appliquerTaille();

    document.addEventListener('click', function (e) {
      var choix = e.target.closest('[data-taille-valeur]');
      if (choix) {
        definirTaille(choix.dataset.tailleValeur);
        if (choix.closest('[data-panneau-taille]')) fermerPanneauTaille();
        return;
      }
      if (e.target.closest('[data-ouvrir-taille]')) {
        e.preventDefault();
        return ouvrirPanneauTaille();
      }
      if (e.target.closest('[data-fermer-taille]')) return fermerPanneauTaille();
      if (e.target.closest('[data-effacer-taille]')) {
        definirTaille('', true);
        return notifier(t('aucune', ''));
      }
    });

    document.addEventListener('change', function (e) {
      var bascule = e.target.closest('[data-bascule-filtre]');
      if (!bascule) return;
      filtreTaille = bascule.checked;
      ecrire(CLE_FILTRE, filtreTaille);
      appliquerTaille();
    });

    /* Invitation à la première visite seulement, et jamais en plein
       tunnel : on ne coupe pas quelqu'un qui est en train d'acheter. */
    if (TAILLE.invite && !maTaille && !lire('gabarit_taille_vue', false)) {
      var page = document.body.className;
      if (page.indexOf('modele-cart') === -1 && page.indexOf('modele-checkout') === -1) {
        setTimeout(ouvrirPanneauTaille, TAILLE.delai || 4000);
      }
    }
  }

  /* Sur la fiche produit, présélectionne la taille du visiteur. */
  function majFicheTaille() {
    var fiche = un('[data-fiche]');
    if (!fiche || !maTaille) return;
    var nomOption = normaliser(TAILLE.option);

    tous('[data-option-nom]', fiche).forEach(function (groupe) {
      if (normaliser(groupe.dataset.optionNom).indexOf(nomOption) === -1) return;
      tous('[data-valeur]', groupe).forEach(function (b) {
        b.dataset.mienne = String(normaliser(b.dataset.valeur) === normaliser(maTaille));
      });
    });

    tous('[data-cote-taille]', fiche).forEach(function (ligne) {
      ligne.dataset.mienne = String(normaliser(ligne.dataset.coteTaille) === normaliser(maTaille));
    });
  }

  /* ---------- 3. Animations ---------- */
  var observateur = null;

  function initAnimations() {
    if (observateur) observateur.disconnect();

    var sujets = tous('[data-anim], [data-filet], [data-reperes]');
    if (sansMouvement || ANIM.apparition === false) {
      sujets.forEach(function (el) { el.dataset.vu = 'true'; });
      return;
    }

    observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.dataset.vu = 'true';
        observateur.unobserve(e.target);
        if (e.target.hasAttribute('data-chiffre')) animerChiffre(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    tous('[data-groupe]').forEach(function (groupe) {
      var pas = parseInt(groupe.dataset.groupe, 10) || 0;
      tous('[data-anim]', groupe).forEach(function (el, i) {
        el.style.setProperty('--retard', (i * pas) + 'ms');
      });
    });

    sujets.concat(tous('[data-chiffre]')).forEach(function (el) { observateur.observe(el); });
  }

  /** Fait défiler un nombre jusqu'à sa valeur : une cote qui se mesure. */
  function animerChiffre(el) {
    if (sansMouvement || ANIM.chiffres === false) return;
    var cible = parseFloat(el.dataset.chiffre);
    if (isNaN(cible)) return;
    var suffixe = el.dataset.chiffreSuffixe || '';
    var debut = performance.now();
    var duree = 900;

    function pas(maintenant) {
      var avance = Math.min(1, (maintenant - debut) / duree);
      var adouci = 1 - Math.pow(1 - avance, 3);
      el.textContent = Math.round(cible * adouci) + suffixe;
      if (avance < 1) requestAnimationFrame(pas);
    }
    requestAnimationFrame(pas);
  }

  /* ---------- 4. En-tête & surcouches ---------- */
  function afficher(el) {
    if (!el) return;
    el.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.dataset.ouvert = 'true'; });
    });
  }

  function fermerTout() {
    tous('[data-tiroir], [data-recherche], [data-voile]').forEach(function (el) {
      el.dataset.ouvert = 'false';
      setTimeout(function () { if (el.dataset.ouvert !== 'true') el.hidden = true; }, 520);
    });
    document.body.classList.remove('bloque');
  }

  function initSurcouches() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-ouvrir-panier]')) {
        e.preventDefault();
        chargerPanier();
        afficher(un('[data-tiroir]'));
        afficher(un('[data-voile]'));
        document.body.classList.add('bloque');
        return;
      }
      if (e.target.closest('[data-ouvrir-recherche]')) {
        e.preventDefault();
        afficher(un('[data-recherche]'));
        afficher(un('[data-voile]'));
        var champ = un('[data-champ-recherche]');
        if (champ) setTimeout(function () { champ.focus(); }, 120);
        return;
      }
      if (e.target.closest('[data-fermer]') || e.target.closest('[data-voile]')) return fermerTout();

      var burger = e.target.closest('[data-burger]');
      if (burger) {
        var menu = un('[data-menu]');
        if (!menu) return;
        var ouvert = menu.dataset.ouvert !== 'true';
        menu.dataset.ouvert = String(ouvert);
        burger.setAttribute('aria-expanded', String(ouvert));
        document.body.classList.toggle('bloque', ouvert);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { fermerTout(); fermerPanneauTaille(); }
    });
  }

  /* ---------- 5. Panier ---------- */
  function majCompteur(n) {
    tous('[data-compteur]').forEach(function (el) {
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
      .catch(function () { /* hors ligne */ });
  }

  function rendrePanier(panier) {
    var corps = un('[data-panier-corps]');
    var pied = un('[data-panier-pied]');
    if (!corps || !pied) return;

    if (!panier.items || !panier.items.length) {
      corps.innerHTML = '<div class="rien"><h2 class="titre-m">' + esc(t('videTitre', '')) + '</h2>' +
        '<p>' + esc(t('videTexte', '')) + '</p>' +
        '<a class="bouton" href="' + esc(CFG.routes.catalogue) + '">' + esc(t('videBouton', '')) + '</a></div>';
      pied.innerHTML = '';
      return;
    }

    corps.innerHTML = panier.items.map(function (item, i) {
      var image = item.image ? '<img src="' + esc(item.image) + '" alt="" width="70" height="93" loading="lazy">' : '<span></span>';
      var variante = item.variant_title ? '<p class="ligne__meta">' + esc(item.variant_title) + '</p>' : '';
      return '<div class="ligne">' + image + '<div>' +
        '<a class="ligne__nom" href="' + esc(item.url) + '">' + esc(item.product_title) + '</a>' + variante +
        '<div class="ligne__bas"><span class="quantite">' +
        '<button type="button" data-ligne="' + (i + 1) + '" data-delta="-1" aria-label="−">−</button>' +
        '<input type="number" value="' + item.quantity + '" min="0" data-champ-ligne="' + (i + 1) + '" aria-label="' + esc(t('quantite', 'Quantité')) + '">' +
        '<button type="button" data-ligne="' + (i + 1) + '" data-delta="1" aria-label="+">+</button>' +
        '</span><span>' + argent(item.final_line_price) + '</span></div>' +
        '<button class="retirer" type="button" data-ligne="' + (i + 1) + '" data-zero="1">' + esc(t('retirer', '')) + '</button>' +
        '</div></div>';
    }).join('');

    var franco = '';
    if (CFG.franco > 0) {
      var reste = CFG.franco - panier.total_price;
      var part = Math.min(100, (panier.total_price / CFG.franco) * 100);
      franco = '<div class="franco">' +
        (reste > 0 ? esc(t('francoAvant', '')) + ' ' + argent(reste) + ' ' + esc(t('francoApres', ''))
                   : esc(t('francoOk', ''))) +
        '<div class="franco__piste"><div class="franco__jauge" style="width:' + part + '%"></div></div></div>';
    }

    pied.innerHTML = franco +
      '<div class="total"><span>' + esc(t('sousTotal', '')) + '</span><strong>' + argent(panier.total_price) + '</strong></div>' +
      '<p class="franco">' + esc(t('taxes', '')) + '</p>' +
      '<a class="bouton bouton--large" href="/checkout">' + esc(t('commander', '')) + '</a>' +
      '<p style="text-align:center;margin:14px 0 0"><a class="lien-souligne" href="' + esc(CFG.routes.panier) + '">' +
      esc(t('voir', '')) + '</a></p>';
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
      var b = e.target.closest('[data-ligne]');
      if (!b) return;
      var ligne = parseInt(b.dataset.ligne, 10);
      if (b.dataset.zero) return changerLigne(ligne, 0);
      var champ = un('[data-champ-ligne="' + ligne + '"]');
      var actuel = champ ? parseInt(champ.value, 10) : 1;
      changerLigne(ligne, Math.max(0, actuel + parseInt(b.dataset.delta, 10)));
    });

    document.addEventListener('change', function (e) {
      var champ = e.target.closest('[data-champ-ligne]');
      if (!champ) return;
      changerLigne(parseInt(champ.dataset.champLigne, 10), Math.max(0, parseInt(champ.value, 10) || 0));
    });

    document.addEventListener('submit', function (e) {
      var form = e.target.closest('form[action*="/cart/add"]');
      if (!form || CFG.panierType === 'page') return;
      e.preventDefault();

      var bouton = form.querySelector('[type="submit"]');
      var libelle = bouton ? bouton.textContent : '';
      if (bouton) { bouton.disabled = true; bouton.textContent = t('ajout', '…'); }

      fetch(CFG.routes.ajout + '.js', { method: 'POST', body: new FormData(form) })
        .then(function (r) { if (!r.ok) throw new Error('ajout'); return r.json(); })
        .then(function () { return chargerPanier(); })
        .then(function () {
          if (CFG.panierType === 'tiroir') {
            afficher(un('[data-tiroir]'));
            afficher(un('[data-voile]'));
            document.body.classList.add('bloque');
          } else {
            notifier(t('ajoute', ''));
          }
        })
        .catch(function () { notifier(t('echec', '')); })
        .finally(function () {
          if (bouton) { bouton.disabled = false; bouton.textContent = libelle; }
        });
    });
  }

  /* ---------- 6. Recherche ---------- */
  function initRecherche() {
    var champ = un('[data-champ-recherche]');
    var zone = un('[data-resultats]');
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
            var bloc = doc.querySelector('[data-resultats-predictifs]');
            zone.innerHTML = bloc ? bloc.innerHTML
              : '<p class="douce">' + esc(t('aucunResultat', '')) + '</p>';
            appliquerTaille();
          })
          .catch(function () { zone.innerHTML = ''; });
      }, 250);
    });
  }

  /* ---------- 7. Fiche produit ---------- */
  function initFiche() {
    var fiche = un('[data-fiche]');
    if (!fiche) return;
    var source = un('[data-variantes]', fiche);
    if (!source) return;

    var produit;
    try { produit = JSON.parse(source.textContent); } catch (e) { return; }
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
        return valeurs.every(function (val, i) { return val == null || v.options[i] === val; });
      })[0];
    }

    function appliquer() {
      var valeurs = choix();
      var variante = trouver(valeurs);

      tous('[data-option-index]', fiche).forEach(function (b) {
        var i = parseInt(b.dataset.optionIndex, 10);
        var essai = valeurs.slice();
        essai[i] = b.dataset.valeur;
        var v = trouver(essai);
        b.dataset.indisponible = String(!v || !v.available);
      });

      var bouton = un('[data-ajouter]', fiche);
      var prix = un('[data-prix]', fiche);
      var barre = un('[data-prix-barre]', fiche);
      var etat = un('[data-etat]', fiche);

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

      if (variante.featured_image && variante.featured_image.src) {
        var vue = un('[data-vue-principale] img', fiche);
        if (vue) {
          /* srcset prime sur src : sans le retirer, la photo ne changerait pas. */
          vue.removeAttribute('srcset');
          vue.removeAttribute('sizes');
          vue.src = variante.featured_image.src;
        }
      }

      if (history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variante.id);
        history.replaceState({}, '', url.toString());
      }
    }

    fiche.addEventListener('click', function (e) {
      var b = e.target.closest('[data-option-index]');
      if (b) {
        var index = b.dataset.optionIndex;
        tous('[data-option-index="' + index + '"]', fiche).forEach(function (autre) {
          autre.setAttribute('aria-pressed', String(autre === b));
        });
        var nom = un('[data-choisie="' + index + '"]', fiche);
        if (nom) nom.textContent = b.dataset.valeur;

        /* Choisir une taille sur la fiche vaut réglage global. */
        var groupe = b.closest('[data-option-nom]');
        if (groupe && TAILLE.active &&
            normaliser(groupe.dataset.optionNom).indexOf(normaliser(TAILLE.option)) !== -1) {
          definirTaille(b.dataset.valeur, true);
        }
        return appliquer();
      }

      var q = e.target.closest('[data-quantite]');
      if (q) {
        var champ = un('[data-champ-quantite]', fiche);
        if (!champ) return;
        var v = parseInt(champ.value, 10) || 1;
        champ.value = Math.max(1, v + parseInt(q.dataset.quantite, 10));
      }
    });

    appliquer();
    majFicheTaille();
  }

  /* ---------- 8. Démarrage ---------- */
  function demarrer() {
    initAnimations();
    initSurcouches();
    initTaille();
    initPanier();
    initRecherche();
    initFiche();
    chargerPanier();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }

  document.addEventListener('shopify:section:load', function () {
    initAnimations();
    initFiche();
    appliquerTaille();
  });

  window.GABARIT.api = {
    argent: argent,
    notifier: notifier,
    definirTaille: definirTaille,
    chargerPanier: chargerPanier
  };
})();
