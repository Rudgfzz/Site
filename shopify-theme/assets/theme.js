/* ==============================================================
   ORBIT — thème Shopify
   --------------------------------------------------------------
   Le panier, les variantes et le paiement sont gérés par Shopify.
   Ce fichier n'ajoute que du confort : tiroir panier, recherche
   instantanée, favoris, comparateur, bascule de thème.
   Sans JavaScript, les formulaires classiques prennent le relais.

   Sommaire :
     1. Utilitaires        5. Recherche prédictive
     2. Thème & menu       6. Favoris & comparateur
     3. Notifications      7. Page produit
     4. Panier (AJAX)      8. Collection & démarrage
   ============================================================== */
(function () {
  'use strict';

  var CFG = window.ORBIT || {};
  /* Textes modifiables depuis Thèmes → Modifier le contenu par défaut. */
  var T = CFG.textes || {};
  function t(cle, repli) { return T[cle] || repli; }
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };

  document.documentElement.classList.add('js');

  /* ---------- 1. Utilitaires ---------- */
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Formate un montant en centimes selon le format monétaire de la boutique. */
  function argent(centimes) {
    var format = CFG.moneyFormat || '{{ amount_with_comma_separator }} €';
    var valeur = (centimes || 0) / 100;

    function nombre(decimales, separateurMilliers, separateurDecimal) {
      var fixe = Math.abs(valeur).toFixed(decimales);
      var parties = fixe.split('.');
      var entier = parties[0].replace(/\B(?=(\d{3})+(?!\d))/g, separateurMilliers);
      return decimales > 0 && parties[1]
        ? entier + separateurDecimal + parties[1]
        : entier;
    }

    return format.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, cle) {
      switch (cle) {
        case 'amount': return nombre(2, ',', ',');
        case 'amount_no_decimals': return nombre(0, ',', ',');
        case 'amount_with_comma_separator': return nombre(2, ' ', ',');
        case 'amount_no_decimals_with_comma_separator': return nombre(0, ' ', ',');
        case 'amount_with_space_separator': return nombre(2, ' ', ',');
        case 'amount_no_decimals_with_space_separator': return nombre(0, ' ', ',');
        case 'amount_with_apostrophe_separator': return nombre(2, "'", '.');
        default: return nombre(2, ' ', ',');
      }
    });
  }

  function icone(nom) {
    var t = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    var d = {
      valide: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
      alerte: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1"/>',
      coeur: '<path d="M12 20s-7-4.5-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.5 12 20 12 20Z"/>',
      compare: '<path d="M4 7h7M4 17h7M17 4v16M14 8l3-3 3 3M20 16l-3 3-3-3"/>'
    };
    return '<svg viewBox="0 0 24 24" ' + t + ' aria-hidden="true">' + (d[nom] || '') + '</svg>';
  }

  function lire(cle, defaut) {
    try {
      var brut = localStorage.getItem(cle);
      return brut === null ? defaut : JSON.parse(brut);
    } catch (e) { return defaut; }
  }

  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) { /* mode privé */ }
  }

  /* ---------- 2. Thème & menu ---------- */
  function initTheme() {
    function appliquer(theme) {
      document.documentElement.setAttribute('data-theme', theme === 'clair' ? 'light' : 'dark');
      ecrire('orbit_theme', theme);
      $$('[data-bascule-theme]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(theme === 'clair'));
        b.setAttribute('aria-label', theme === 'clair' ? 'Passer au thème sombre' : 'Passer au thème clair');
      });
    }
    appliquer(document.documentElement.getAttribute('data-theme') === 'light' ? 'clair' : 'sombre');

    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-bascule-theme]')) return;
      var actuel = document.documentElement.getAttribute('data-theme') === 'light' ? 'clair' : 'sombre';
      appliquer(actuel === 'clair' ? 'sombre' : 'clair');
    });
  }

  function initMenu() {
    var burger = $('#burger');
    var nav = $('#nav');
    if (!burger || !nav) return;
    function basculer(ouvert) {
      nav.dataset.open = String(ouvert);
      burger.setAttribute('aria-expanded', String(ouvert));
    }
    burger.addEventListener('click', function () { basculer(nav.dataset.open !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) basculer(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 1000) basculer(false); });
  }

  /* ---------- 3. Notifications ---------- */
  var minuteur;
  function notifier(message, type) {
    var zone = $('.toasts');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'toasts';
      zone.setAttribute('role', 'status');
      zone.setAttribute('aria-live', 'polite');
      document.body.appendChild(zone);
    }
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = icone(type === 'err' ? 'alerte' : 'valide') + '<span>' + esc(message) + '</span>';
    if (type === 'err') toast.querySelector('svg').style.color = 'var(--danger)';
    zone.appendChild(toast);
    requestAnimationFrame(function () { toast.dataset.show = 'true'; });
    clearTimeout(minuteur);
    setTimeout(function () {
      toast.dataset.show = 'false';
      setTimeout(function () { toast.remove(); }, 320);
    }, 2800);
  }

  /* ---------- 4. Panier (AJAX) ---------- */
  function fermerSurcouches() {
    ['#tiroir-panier', '#recherche'].forEach(function (s) {
      var el = $(s);
      if (el) el.dataset.open = 'false';
    });
    var voile = $('#voile');
    if (voile) voile.dataset.open = 'false';
    document.body.classList.remove('no-scroll');
  }

  function ouvrirTiroir() {
    var tiroir = $('#tiroir-panier');
    if (!tiroir) return;
    tiroir.dataset.open = 'true';
    $('#voile').dataset.open = 'true';
    document.body.classList.add('no-scroll');
    chargerPanier();
    var f = $('[data-fermer-tiroir]', tiroir);
    if (f) f.focus();
  }

  function majCompteurPanier(nb) {
    $$('[data-compteur-panier]').forEach(function (el) {
      el.textContent = nb;
      el.hidden = nb === 0;
    });
  }

  function chargerPanier() {
    return fetch(CFG.routes.cart + '.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (panier) {
        majCompteurPanier(panier.item_count);
        rendreTiroir(panier);
        return panier;
      })
      .catch(function () { /* hors ligne : le tiroir garde son contenu */ });
  }

  function rendreTiroir(panier) {
    var corps = $('#tiroir-corps');
    var pied = $('#tiroir-pied');
    if (!corps) return;

    if (!panier.items.length) {
      corps.innerHTML =
        '<div class="vide" style="margin:24px 0;border:0">' +
        '<h3>' + esc(t('panierVideTitre', 'Votre panier est vide')) + '</h3>' +
        '<p>' + esc(t('panierVideTexte', 'Parcourez le catalogue pour le remplir.')) + '</p>' +
        '<a class="btn" href="/collections/all">' +
        esc(t('panierVideBouton', 'Voir la boutique')) + '</a></div>';
      pied.innerHTML = '';
      return;
    }

    corps.innerHTML = panier.items.map(function (item) {
      var visuel = item.image
        ? '<img src="' + esc(item.image) + '" alt="' + esc(item.product_title) + '" loading="lazy">'
        : '';
      var options = item.options_with_values
        ? item.options_with_values.map(function (o) { return esc(o.value); }).join(' · ')
        : '';
      return '' +
        '<div class="ligne" style="grid-template-columns:74px 1fr;gap:14px">' +
          '<a class="ligne__img" style="width:74px" href="' + esc(item.url) + '">' + visuel + '</a>' +
          '<div>' +
            '<p class="ligne__nom" style="font-size:.93rem">' + esc(item.product_title) + '</p>' +
            (options ? '<p class="ligne__meta">' + options + '</p>' : '') +
            '<div style="display:flex;align-items:center;gap:12px;margin-top:9px">' +
              '<div class="quantite quantite--sm">' +
                '<button type="button" data-ligne="' + item.key + '" data-delta="-1" aria-label="' +
                  esc(t('diminuer', 'Diminuer la quantité')) + '">−</button>' +
                '<span>' + item.quantity + '</span>' +
                '<button type="button" data-ligne="' + item.key + '" data-delta="1" aria-label="' +
                  esc(t('augmenter', 'Augmenter la quantité')) + '">+</button>' +
              '</div>' +
              '<strong class="prix" style="font-size:.94rem">' + argent(item.final_line_price) + '</strong>' +
              '<button type="button" class="lien-supprimer" data-ligne="' + item.key + '" data-vider="1" ' +
                      'style="margin-left:auto">' + esc(t('retirer', 'Retirer')) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    var seuil = CFG.seuilLivraisonGratuite || 0;
    var restant = Math.max(0, seuil - panier.total_price);
    var jauge = '';
    if (seuil > 0) {
      jauge = restant > 0
        ? '<div class="jauge-livraison"><div class="piste"><div class="jauge" style="width:' +
          Math.min(100, (panier.total_price / seuil) * 100) + '%"></div></div>' +
          '<p>' + esc(t('resteAvant', 'Plus que')) + ' <strong>' + argent(restant) + '</strong> ' +
          esc(t('resteApres', 'pour la livraison offerte.')) + '</p></div>'
        : '<p class="form-note" style="color:var(--success);margin-bottom:12px">✓ ' +
          esc(t('livraisonOfferte', 'Livraison offerte')) + '</p>';
    }

    pied.innerHTML = jauge +
      '<div class="recap__total" style="border:0;padding:0;margin:0 0 14px">' +
        '<span>' + esc(t('sousTotal', 'Sous-total')) + '</span><span>' +
        argent(panier.total_price) + '</span></div>' +
      '<a class="btn btn--block btn--lg" href="' + CFG.routes.cart + '">' +
      esc(t('voirPanier', 'Voir le panier')) + '</a>' +
      '<form action="' + CFG.routes.cart + '" method="post" style="margin-top:9px">' +
        '<button class="btn btn--ghost btn--block" type="submit" name="checkout">' +
        esc(t('commander', 'Commander')) + '</button>' +
      '</form>';
  }

  function ajouterAuPanier(variantId, quantite, bouton) {
    if (bouton) bouton.setAttribute('aria-disabled', 'true');
    return fetch(CFG.routes.cart_add + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: variantId, quantity: quantite || 1 }] })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          notifier(res.data.description || res.data.message || 'Ajout impossible', 'err');
          return;
        }
        notifier('« ' + (res.data.items ? res.data.items[0].product_title : '') + ' » ' +
                 t('ajouteAuPanier', 'ajouté au panier'));
        return chargerPanier().then(ouvrirTiroir);
      })
      .catch(function () { notifier(t('ajoutImpossible', 'Ajout impossible, réessayez'), 'err'); })
      .then(function () { if (bouton) bouton.removeAttribute('aria-disabled'); });
  }

  function changerLigne(cle, quantite) {
    return fetch(CFG.routes.cart_change + '.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: cle, quantity: quantite })
    })
      .then(function (r) { return r.json(); })
      .then(function (panier) {
        majCompteurPanier(panier.item_count);
        rendreTiroir(panier);
        if (document.body.classList.contains('template-cart')) window.location.reload();
      });
  }

  function initPanier() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-ouvrir-panier]')) { e.preventDefault(); ouvrirTiroir(); return; }
      if (e.target.closest('[data-fermer-tiroir]') || e.target.id === 'voile') { fermerSurcouches(); return; }

      var ligne = e.target.closest('[data-ligne]');
      if (ligne) {
        e.preventDefault();
        var cle = ligne.dataset.ligne;
        if (ligne.dataset.vider) { changerLigne(cle, 0); return; }
        var span = ligne.parentNode.querySelector('span');
        var actuel = parseInt(span ? span.textContent : '1', 10) || 1;
        changerLigne(cle, Math.max(0, actuel + Number(ligne.dataset.delta)));
      }
    });

    /* Ajout depuis une carte produit ou la fiche, sans rechargement. */
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('form[action*="/cart/add"]');
      if (!form) return;
      var champ = form.querySelector('[name="id"]');
      if (!champ || !champ.value) return;
      e.preventDefault();
      var qteChamp = form.querySelector('[name="quantity"]');
      ajouterAuPanier(
        Number(champ.value),
        qteChamp ? Number(qteChamp.value) || 1 : 1,
        form.querySelector('[type="submit"]')
      );
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fermerSurcouches();
    });
  }

  /* ---------- 5. Recherche prédictive ---------- */
  function initRecherche() {
    var boite = $('#recherche');
    if (!boite) return;
    var champ = $('#champ-recherche');
    var sortie = $('#resultats-recherche');
    var dernier = 0;

    function ouvrir() {
      boite.dataset.open = 'true';
      $('#voile').dataset.open = 'true';
      document.body.classList.add('no-scroll');
      champ.value = '';
      sortie.innerHTML = '<p class="recherche__vide">Tapez pour rechercher un produit.</p>';
      setTimeout(function () { champ.focus(); }, 60);
    }

    function chercher(q) {
      var jeton = ++dernier;
      if (!q.trim()) {
        sortie.innerHTML = '<p class="recherche__vide">Tapez pour rechercher un produit.</p>';
        return;
      }
      var url = CFG.routes.predictive + '?q=' + encodeURIComponent(q) +
        '&resources[type]=product&resources[limit]=8&section_id=recherche-predictive';
      fetch(url.replace('&section_id=recherche-predictive', ''), { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (jeton !== dernier) return;
          var produits = (data.resources && data.resources.results && data.resources.results.products) || [];
          if (!produits.length) {
            sortie.innerHTML = '<p class="recherche__vide">Aucun produit ne correspond à « ' + esc(q) + ' ».</p>';
            return;
          }
          sortie.innerHTML = produits.map(function (p) {
            var img = p.featured_image && p.featured_image.url
              ? '<img src="' + esc(p.featured_image.url) + '" alt="" loading="lazy">'
              : '<img src="" alt="">';
            return '<a class="resultat" href="' + esc(p.url) + '">' + img +
              '<span><span class="resultat__nom">' + esc(p.title) + '</span><br>' +
              '<span class="resultat__meta">' + esc(p.vendor || '') + '</span></span>' +
              '<span class="resultat__prix">' + esc(p.price ? argent(p.price) : '') + '</span></a>';
          }).join('');
        })
        .catch(function () {
          if (jeton !== dernier) return;
          sortie.innerHTML = '<p class="recherche__vide">Recherche indisponible. ' +
            '<a href="' + CFG.routes.search + '?q=' + encodeURIComponent(q) + '" style="text-decoration:underline">' +
            'Voir tous les résultats</a></p>';
        });
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-ouvrir-recherche]')) { e.preventDefault(); ouvrir(); }
    });

    var attente;
    champ.addEventListener('input', function () {
      clearTimeout(attente);
      var v = champ.value;
      attente = setTimeout(function () { chercher(v); }, 220);
    });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ouvrir(); }
    });
  }

  /* ---------- 6. Favoris & comparateur ---------- */
  var MAX_COMPARE = 4;
  var favoris = function () { return lire('orbit_favoris', []); };
  var comparateur = function () { return lire('orbit_comparateur', []); };

  function majCompteurs() {
    $$('[data-compteur-favoris]').forEach(function (el) {
      el.textContent = favoris().length;
      el.hidden = favoris().length === 0;
    });
    $$('[data-compteur-comparateur]').forEach(function (el) {
      el.textContent = comparateur().length;
      el.hidden = comparateur().length === 0;
    });
  }

  /** Récupère la fiche JSON d'un produit à partir de son identifiant d'URL. */
  function chargerProduit(handle) {
    return fetch('/products/' + handle + '.js', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function majBarreComparateur() {
    var barre = $('#barre-comparateur');
    if (!barre) return;
    var liste = comparateur();
    barre.dataset.visible = String(liste.length > 0);
    var texte = $('[data-compare-texte]', barre);
    if (texte) texte.textContent = liste.length + ' produit' + (liste.length > 1 ? 's' : '') + ' à comparer';

    var vignettes = $('.barre-comparateur__vignettes', barre);
    if (!vignettes) return;
    Promise.all(liste.map(chargerProduit)).then(function (produits) {
      vignettes.innerHTML = produits.filter(Boolean).map(function (p) {
        return '<img src="' + esc(p.featured_image || '') + '" alt="' + esc(p.title) + '" title="' + esc(p.title) + '">';
      }).join('');
    });
  }

  function initFavorisComparateur() {
    majCompteurs();
    majBarreComparateur();

    document.addEventListener('click', function (e) {
      var fav = e.target.closest('[data-favori]');
      if (fav) {
        e.preventDefault();
        var handle = fav.dataset.favori;
        var liste = favoris();
        var i = liste.indexOf(handle);
        if (i >= 0) liste.splice(i, 1); else liste.push(handle);
        ecrire('orbit_favoris', liste);
        majCompteurs();
        $$('[data-favori="' + handle + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(i < 0));
        });
        notifier(i >= 0 ? t('favoriRetire', 'Retiré des favoris')
                        : t('favoriAjoute', 'Ajouté aux favoris'));
        document.dispatchEvent(new CustomEvent('favoris:maj'));
        return;
      }

      var cmp = e.target.closest('[data-comparer]');
      if (cmp) {
        e.preventDefault();
        var h = cmp.dataset.comparer;
        var l = comparateur();
        var j = l.indexOf(h);
        if (j >= 0) {
          l.splice(j, 1);
        } else {
          if (l.length >= MAX_COMPARE) {
            notifier(t('comparaisonLimite', 'Comparaison limitée à 4 produits'), 'err');
            return;
          }
          l.push(h);
        }
        ecrire('orbit_comparateur', l);
        majCompteurs();
        majBarreComparateur();
        $$('[data-comparer="' + h + '"]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(j < 0));
        });
        document.dispatchEvent(new CustomEvent('comparateur:maj'));
      }
    });

    /* Marque l'état initial des boutons présents sur la page. */
    $$('[data-favori]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(favoris().indexOf(b.dataset.favori) >= 0));
    });
    $$('[data-comparer]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(comparateur().indexOf(b.dataset.comparer) >= 0));
    });
  }

  /* ---------- 7. Page produit ---------- */
  function initProduit() {
    var fiche = $('#fiche-produit');
    if (!fiche) return;

    var donnees = $('#donnees-produit');
    var produit = donnees ? JSON.parse(donnees.textContent) : null;
    if (!produit) return;

    var champId = $('#variante-id');
    var qte = 1;

    /* Valeur retenue pour chaque option, d'après l'état des boutons. */
    function choixCourants() {
      return $$('[data-option-index]', fiche).reduce(function (acc, el) {
        if (el.getAttribute('aria-pressed') === 'true' || el.checked || el.tagName === 'SELECT') {
          acc[Number(el.dataset.optionIndex)] = el.tagName === 'SELECT' ? el.value : el.dataset.valeur;
        }
        return acc;
      }, {});
    }

    function varianteCourante() {
      var choix = choixCourants();
      return produit.variants.filter(function (v) {
        return Object.keys(choix).every(function (i) { return v.options[i] === choix[i]; });
      })[0];
    }

    function majVariante() {
      var v = varianteCourante();
      var bouton = $('#ajouter-panier');

      if (!v) {
        if (bouton) { bouton.disabled = true; bouton.textContent = 'Combinaison indisponible'; }
        return;
      }

      champId.value = v.id;

      var prix = $('#prix-affiche');
      if (prix) prix.textContent = argent(v.price);
      var troisFois = $('#prix-3x');
      if (troisFois) troisFois.textContent = argent(Math.round(v.price / 3));

      /* Le prix de référence suit la variante : sans cela, choisir une
         option plus chère afficherait un prix barré inférieur au prix demandé. */
      var barre = $('#prix-barre');
      var remise = $('#remise');
      if (barre && remise) {
        var afficher = v.compare_at_price && v.compare_at_price > v.price;
        barre.hidden = !afficher;
        remise.hidden = !afficher;
        if (afficher) {
          barre.textContent = argent(v.compare_at_price);
          remise.textContent = '−' + Math.round((1 - v.price / v.compare_at_price) * 100) + ' %';
        }
      }

      var stock = $('#etat-stock');
      if (stock) {
        stock.className = 'stock ' + (v.available ? 'stock--ok' : 'stock--non');
        stock.textContent = v.available ? t('enStock', 'En stock') : t('rupture', 'Rupture de stock');
      }

      if (bouton) {
        bouton.disabled = !v.available;
        bouton.textContent = v.available ? 'Ajouter au panier' : 'Épuisé';
      }

      var prixBarreAchat = $('#barre-achat-prix');
      if (prixBarreAchat) prixBarreAchat.textContent = argent(v.price * qte);

      changerImage(imageDeVariante(v));

      marquerIndisponibles();

      /* Reflète la variante dans l'URL, pour un lien partageable. */
      var url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url);
    }

    /* Grise les valeurs d'option qui ne mènent à aucune variante en stock,
       compte tenu des autres choix en cours. */
    function marquerIndisponibles() {
      var courant = choixCourants();

      $$('[data-option-index][data-valeur]', fiche).forEach(function (bouton) {
        var idx = Number(bouton.dataset.optionIndex);
        var essai = Object.assign({}, courant);
        essai[idx] = bouton.dataset.valeur;

        var possible = produit.variants.some(function (variante) {
          if (!variante.available) return false;
          return Object.keys(essai).every(function (i) {
            return variante.options[i] === essai[i];
          });
        });

        bouton.dataset.indispo = String(!possible);
      });
    }

    function changerImage(src) {
      var principale = $('#image-produit');
      if (!principale || !src) return;

      /* Le navigateur privilégie srcset sur src : sans le vider, la photo
         d'origine resterait affichée malgré le changement de src. */
      principale.removeAttribute('srcset');
      principale.removeAttribute('sizes');
      principale.src = src;

      /* La vignette correspondante est mise en avant. On compare sans les
         paramètres d'URL, que Shopify fait varier selon la largeur. */
      var base = sansParametres(src);
      $$('[data-image-vignette]').forEach(function (b) {
        b.setAttribute('aria-current', String(sansParametres(b.dataset.imageVignette) === base));
      });
    }

    /* Retire la query string d'une URL d'image Shopify. */
    function sansParametres(url) {
      return String(url || '').split('?')[0].replace(/^https?:/, '');
    }

    /* Photo à afficher pour une variante donnée :
         1. l'image assignée à la variante dans l'admin ;
         2. à défaut, un média dont le texte alternatif contient la valeur
            choisie (« Deep Blue », « Silver »…). */
    function imageDeVariante(variante) {
      if (variante.featured_image && variante.featured_image.src) {
        return variante.featured_image.src;
      }

      var choix = choixCourants();
      var valeurs = Object.keys(choix)
        .map(function (i) { return String(choix[i] || '').toLowerCase().trim(); })
        .filter(Boolean);
      if (!valeurs.length) return null;

      var medias = produit.media || produit.images || [];
      for (var i = 0; i < medias.length; i++) {
        var m = medias[i];
        var alt = String((m && m.alt) || '').toLowerCase();
        if (!alt) continue;
        for (var j = 0; j < valeurs.length; j++) {
          if (alt.indexOf(valeurs[j]) !== -1) {
            return m.src || (m.preview_image && m.preview_image.src) || null;
          }
        }
      }
      return null;
    }

    fiche.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-option-index][data-valeur]');
      if (opt) {
        var idx = opt.dataset.optionIndex;
        $$('[data-option-index="' + idx + '"][data-valeur]', fiche).forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === opt));
        });
        var nom = $('#nom-option-' + idx);
        if (nom) nom.textContent = opt.dataset.valeur;
        majVariante();
        return;
      }

      var vignette = e.target.closest('[data-image-vignette]');
      if (vignette) { changerImage(vignette.dataset.imageVignette); return; }

      if (e.target.closest('#qte-moins')) {
        qte = Math.max(1, qte - 1);
        $('#qte-valeur').value = qte;
        majVariante();
      }
      if (e.target.closest('#qte-plus')) {
        qte += 1;
        $('#qte-valeur').value = qte;
        majVariante();
      }
    });

    fiche.addEventListener('change', function (e) {
      if (e.target.matches('[data-option-index]')) majVariante();
      if (e.target.id === 'qte-valeur') {
        qte = Math.max(1, parseInt(e.target.value, 10) || 1);
        e.target.value = qte;
        majVariante();
      }
    });

    /* Onglets */
    var onglets = $$('[role="tab"]');
    onglets.forEach(function (b) {
      b.addEventListener('click', function () {
        onglets.forEach(function (x) {
          x.setAttribute('aria-selected', String(x === b));
          var panneau = document.getElementById(x.getAttribute('aria-controls'));
          if (panneau) panneau.hidden = x !== b;
        });
      });
    });

    /* Barre d'achat collante */
    var barre = $('#barre-achat');
    var ancre = $('#ajouter-panier');
    if (barre && ancre && 'IntersectionObserver' in window) {
      var v0 = produit.variants[0];
      barre.innerHTML =
        '<span class="prix" id="barre-achat-prix">' + argent(v0.price) + '</span>' +
        '<button class="btn" type="button" id="barre-ajouter">Ajouter au panier</button>';
      $('#barre-ajouter').addEventListener('click', function () {
        ajouterAuPanier(Number(champId.value), qte, $('#barre-ajouter'));
      });
      new IntersectionObserver(function (entrees) {
        barre.dataset.visible = String(!entrees[0].isIntersecting);
      }, { rootMargin: '-80px 0px 0px 0px' }).observe(ancre);
    }

    majVariante();
  }

  /* ---------- 8. Collection & démarrage ---------- */
  function initCollection() {
    var grille = $('#grille-boutique');
    if (!grille) return;

    var vue = lire('orbit_vue', 'grille');
    grille.dataset.vue = vue;
    $$('[data-vue]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.vue === vue));
      b.addEventListener('click', function () {
        vue = b.dataset.vue;
        ecrire('orbit_vue', vue);
        grille.dataset.vue = vue;
        $$('[data-vue]').forEach(function (x) {
          x.setAttribute('aria-pressed', String(x.dataset.vue === vue));
        });
      });
    });

    /* Le tri et les filtres natifs sont de vrais formulaires GET :
       ils fonctionnent sans JavaScript, on se contente de les soumettre. */
    var tri = $('#tri');
    if (tri) {
      tri.addEventListener('change', function () {
        var form = tri.closest('form');
        if (form) form.submit();
      });
    }
    $$('[data-filtre-auto]').forEach(function (champ) {
      champ.addEventListener('change', function () {
        var form = champ.closest('form');
        if (form) form.submit();
      });
    });
  }

  function initReveal() {
    var cibles = $$('.reveal');
    if (!cibles.length) return;
    if (!('IntersectionObserver' in window)) {
      cibles.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    cibles.forEach(function (el) { obs.observe(el); });
  }

  var minuteries = [];

  /* Convertit « 2026-09-15 23:59 » en date. Safari refuse l'espace comme
     séparateur, d'où le T ajouté avant l'analyse. */
  function lireEcheance(texte) {
    if (!texte) return null;
    var d = new Date(String(texte).trim().replace(' ', 'T'));
    return isNaN(d) ? null : d;
  }

  function initCompteARebours() {
    /* Les minuteries précédentes sont coupées : sans cela, une modification
       dans l'éditeur de thème en empilerait une nouvelle à chaque rechargement
       de section, et le décompte sauterait des secondes. */
    minuteries.forEach(clearInterval);
    minuteries = [];

    var zones = $$('[data-compte-a-rebours]');
    var ancienne = $('#compte-rebours');
    if (ancienne) zones.push(ancienne);
    zones.forEach(function (zone) {
      var cible = lireEcheance(zone.dataset.fin);
      if (!cible) {
        /* Sans échéance valide, on vise la fin de la semaine en cours. */
        cible = new Date();
        cible.setDate(cible.getDate() + ((7 - cible.getDay()) % 7 || 7));
        cible.setHours(23, 59, 59, 0);
      }

      var unites = [['jours', 86400000], ['heures', 3600000], ['minutes', 60000], ['secondes', 1000]];
      var libelles = {
        jours: t('decompteJours', 'jours'),
        heures: t('decompteHeures', 'heures'),
        minutes: t('decompteMinutes', 'min'),
        secondes: t('decompteSecondes', 'sec')
      };
      var structure = zone.querySelector('[data-unite]');

      function tic() {
        var reste = cible - Date.now();

        if (reste <= 0) {
          zone.dataset.fini = 'true';
          zone.innerHTML = '<p class="decompte__fini">' +
            esc(zone.dataset.finiTexte || t('offreTerminee', 'Cette offre est terminée.')) + '</p>';
          return true;
        }

        unites.forEach(function (u) {
          var v = Math.floor(reste / u[1]);
          reste -= v * u[1];
          var valeur = String(v).padStart(2, '0');
          if (structure) {
            var champ = zone.querySelector('[data-unite="' + u[0] + '"]');
            if (champ) champ.textContent = valeur;
          }
        });

        if (!structure) {
          var restant = cible - Date.now();
          zone.innerHTML = unites.map(function (u) {
            var v = Math.floor(restant / u[1]);
            restant -= v * u[1];
            return '<div><strong>' + String(v).padStart(2, '0') + '</strong>' +
                   '<span>' + esc(libelles[u[0]]) + '</span></div>';
          }).join('');
        }
        return false;
      }

      if (tic()) return;
      var id = setInterval(function () { if (tic()) clearInterval(id); }, 1000);
      minuteries.push(id);
    });
  }

  function demarrer() {
    initTheme();
    initMenu();
    initPanier();
    initRecherche();
    initFavorisComparateur();
    initProduit();
    initCollection();
    initReveal();
    initCompteARebours();
    chargerPanier();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }

  /* Recharge les modules après une modification dans l'éditeur de thème. */
  document.addEventListener('shopify:section:load', function () {
    initProduit();
    initCollection();
    initReveal();
    initCompteARebours();
    majCompteurs();
  });

  /* Expose le strict nécessaire aux pages Favoris et Comparateur. */
  window.ORBIT.api = {
    argent: argent,
    notifier: notifier,
    chargerProduit: chargerProduit,
    favoris: favoris,
    comparateur: comparateur,
    ecrire: ecrire,
    ajouterAuPanier: ajouterAuPanier,
    majCompteurs: majCompteurs,
    majBarreComparateur: majBarreComparateur
  };
})();
