/* =============================================================
   STUDIO — thème Shopify
   Interactions légères uniquement. Le panier, les variantes et le
   paiement sont gérés par Shopify via des formulaires classiques :
   le site reste fonctionnel même si ce fichier ne se charge pas.
   ============================================================= */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* Active les effets qui dépendent du JS (apparition au défilement).
     Sans cette classe, le contenu reste visible. */
  document.documentElement.classList.add('js');

  /* ---------- Menu mobile ---------- */
  function initMenu() {
    var burger = $('#burger');
    var nav = $('#nav');
    if (!burger || !nav) return;

    function basculer(ouvert) {
      nav.dataset.open = String(ouvert);
      burger.setAttribute('aria-expanded', String(ouvert));
    }

    burger.addEventListener('click', function () {
      basculer(nav.dataset.open !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) basculer(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') basculer(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) basculer(false);
    });
  }

  /* ---------- Galerie produit ---------- */
  function initGalerie() {
    var miniatures = $('#miniatures');
    var principale = $('#image-principale');
    if (!miniatures || !principale) return;

    miniatures.addEventListener('click', function (e) {
      var b = e.target.closest('[data-src]');
      if (!b) return;
      principale.src = b.dataset.src;
      if (b.dataset.srcset) principale.srcset = b.dataset.srcset;
      principale.alt = b.dataset.alt || principale.alt;
      $$('[data-src]', miniatures).forEach(function (x) {
        x.setAttribute('aria-current', String(x === b));
      });
    });
  }

  /* ---------- Champs quantité ---------- */
  function initQuantites() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-qty-moins], [data-qty-plus]');
      if (!btn) return;
      var champ = $('input', btn.parentNode);
      if (!champ) return;

      var min = parseInt(champ.min, 10) || 1;
      var valeur = parseInt(champ.value, 10) || min;
      valeur += btn.hasAttribute('data-qty-plus') ? 1 : -1;
      champ.value = Math.max(min, valeur);
      champ.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /* ---------- Tri de collection ---------- */
  function initTri() {
    var tri = $('#tri');
    if (!tri || tri.dataset.lie === 'true') return;
    tri.dataset.lie = 'true';
    tri.addEventListener('change', function () {
      var form = tri.closest('form');
      if (form) form.submit();
    });
  }

  /* ---------- Panier : recalcul à la modification ---------- */
  function initPanier() {
    var form = $('#form-panier');
    if (!form) return;
    // Toute modification de quantité renvoie le formulaire à Shopify,
    // qui recalcule les totaux. Le bouton « Mettre à jour » reste
    // disponible pour les navigateurs sans JavaScript.
    $$('[data-cart-qty]', form).forEach(function (champ) {
      champ.addEventListener('change', function () { form.submit(); });
    });
  }

  /* ---------- Apparition au défilement ---------- */
  function initReveal() {
    var cibles = $$('.reveal');
    if (!cibles.length) return;
    if (!('IntersectionObserver' in window)) {
      cibles.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var obs = new IntersectionObserver(
      function (entrees) {
        entrees.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    cibles.forEach(function (el) { obs.observe(el); });
  }

  function demarrer() {
    initMenu();
    initGalerie();
    initQuantites();
    initTri();
    initPanier();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }

  /* Réinitialise après une modification dans l'éditeur de thème Shopify. */
  document.addEventListener('shopify:section:load', demarrer);
})();
