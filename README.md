# ORBIT — boutique high-tech

Site e-commerce statique complet (HTML, CSS, JavaScript), sans dépendance ni
étape de compilation, pour la vente d'appareils mobiles et d'accessoires :
smartphones, tablettes, montres connectées, audio, ordinateurs portables.

Thème sombre par défaut, thème clair au choix, entièrement responsive.

## Ouvrir le site

Double-cliquez sur `index.html`. C'est tout : rien à installer.

Pour un contexte identique à la production :

```bash
python3 -m http.server 8000
# puis http://localhost:8000
```

## Ce que le site sait faire

| Fonction | Détail |
|---|---|
| **Catalogue** | 16 produits, 6 catégories, 4 marques |
| **Variantes** | Coloris (l'image change) et capacité (le prix change) |
| **Filtres à facettes** | Catégorie, marque, coloris, budget, disponibilité — cumulables |
| **Tri** | Pertinence, prix, note, nouveautés |
| **Affichage** | Grille ou liste, mémorisé d'une visite à l'autre |
| **Recherche** | Surcouche instantanée, raccourci `Ctrl/⌘ + K` |
| **Panier** | Tiroir latéral + page dédiée, quantités, persistance |
| **Codes promo** | `ORBIT10`, `BIENVENUE`, `LIVRAISON` |
| **Livraison** | Trois modes, seuil de gratuité avec jauge de progression |
| **Commande** | Tunnel en 3 étapes, validation champ par champ |
| **Confirmation** | Numéro de commande, récapitulatif, adresse, paiement |
| **Suivi** | Chronologie d'acheminement en 5 étapes |
| **Favoris** | Persistants, ajout groupé au panier |
| **Comparateur** | Jusqu'à 4 produits, meilleures valeurs mises en évidence |
| **Avis** | Note moyenne, répartition par étoiles, achats vérifiés |
| **Thème** | Sombre / clair, mémorisé, sans clignotement au chargement |

## Structure

```
index.html               Accueil
boutique.html            Catalogue avec filtres à facettes
produit.html             Fiche produit — lit ?id=... dans l'URL
panier.html              Panier détaillé
commande.html            Tunnel de commande en 3 étapes
confirmation.html        Commande confirmée
suivi.html               Suivi de colis
favoris.html             Produits enregistrés
comparateur.html         Comparaison côte à côte
a-propos.html            Présentation
contact.html             Formulaire de contact
faq.html                 Centre d'aide
livraison-retours.html   Délais, tarifs, retours, garantie
mentions-legales.html    Mentions, CGV, confidentialité, cookies
404.html                 Page introuvable

assets/
  css/style.css          Toute la mise en forme (15 sections commentées)
  js/data.js             ← LE CATALOGUE : c'est ici qu'on met ses produits
  js/app.js              Panier, filtres, comparateur, tunnel de commande
  img/                   42 visuels produits + bandeau + favicon
```

## Mettre vos propres produits

Tout se passe dans **`assets/js/data.js`**.

```js
{
  id: 'mon-produit',            // unique, sans espace ni accent
  nom: 'Mon Produit Pro',
  marque: 'Nova',
  categorie: 'smartphones',     // doit exister dans CATEGORIES
  type: 'phone',                // sert à composer le nom de l'image
  prix: 899,
  prixBarre: 999,               // facultatif — prix de référence barré
  note: 4.6,
  nbAvis: 287,
  stock: 41,                    // 0 = rupture, ≤ 10 = stock faible
  nouveau: true,
  bestseller: false,
  couleurs: ['noir', 'argent'], // clés de l'objet COULEURS
  capacites: [                  // facultatif
    { id: '128', nom: '128 Go', delta: 0 },
    { id: '256', nom: '256 Go', delta: 110 },
  ],
  accroche: 'Une phrase courte.',
  description: 'Le texte long de la fiche produit.',
  pointsForts: ['Argument 1', 'Argument 2'],
  specs: { 'Écran': '6,1″ OLED', 'Poids': '171 g' },
  livraison: 'Expédié sous 24 h',
  garantie: '2 ans constructeur',
  avis: [{ auteur: 'Claire M.', note: 5, date: '2026-08-02',
           titre: 'Parfait', texte: '…', verifie: true }],
}
```

Les autres réglages du même fichier : `COULEURS` (coloris et code hexadécimal),
`CATEGORIES`, `SPECS_COMPARAISON` (lignes du comparateur par catégorie),
`LIVRAISONS`, `CODES_PROMO`, `BOUTIQUE` (nom, e-mail, seuil de livraison
gratuite).

### Les images

Le site compose le chemin de l'image ainsi : `assets/img/{type}-{couleur}.svg`.
Un produit de type `phone` en coloris `titane` affiche donc
`assets/img/phone-titane.svg`.

Pour utiliser vos photos, déposez-les dans `assets/img/` en respectant cette
convention de nommage — par exemple `phone-titane.jpg` — puis remplacez
l'extension dans la fonction `image()` au début de `assets/js/app.js`.
Format conseillé : ratio 4/3, environ 1600 × 1200 px, JPEG ou WebP.

Les sept types disponibles : `phone`, `tablet`, `watch`, `buds`, `laptop`,
`charger`, `case`. Les six coloris : `noir`, `argent`, `bleu`, `titane`,
`vert`, `or`.

## Changer les couleurs du site

Tout est regroupé en variables au début de `assets/css/style.css` :

```css
:root {
  --accent: #6d8cff;      /* couleur principale */
  --accent-2: #b06cff;    /* seconde couleur du dégradé */
  --bg: #08090d;          /* fond (thème sombre) */
  --r: 18px;              /* arrondi des cartes */
}
[data-theme="light"] { /* les mêmes variables pour le thème clair */ }
```

## Encaisser réellement les paiements

Le tunnel de commande est **une simulation** : il valide les champs, calcule
les totaux et génère un numéro, mais aucun paiement n'est effectué et aucune
donnée ne quitte le navigateur.

Un site statique ne peut pas encaisser seul. Trois options :

1. **Stripe Payment Links** — le plus simple : un lien de paiement par produit.
2. **Stripe Checkout** — dans `assets/js/app.js`, remplacez le contenu du
   gestionnaire `form.addEventListener('submit', …)` de `pageCommande()` par un
   appel à votre serveur qui crée la session de paiement.
3. **Migrer vers une plateforme** (Shopify, WooCommerce) en réutilisant ce
   design comme thème.

## Formulaires

Le contact et l'inscription à la lettre d'information affichent une
confirmation sans rien envoyer (attribut `data-demo`). Pour les rendre
fonctionnels sans serveur, utilisez Formspree ou Web3Forms :

```html
<form action="https://formspree.io/f/VOTRE_ID" method="POST">
```

…et retirez l'attribut `data-demo`.

## Mettre en ligne

Le site est entièrement statique, il se publie tel quel :

- **GitHub Pages** — Settings → Pages → branche, dossier `/ (root)`.
- **Netlify / Vercel / Cloudflare Pages** — glisser-déposer, aucun build.
- **Hébergement classique** — envoi par FTP à la racine.

La page `404.html` est reconnue automatiquement par GitHub Pages et Netlify.

## Avant de mettre en ligne

- [ ] Remplacer les 16 produits de démonstration dans `data.js`
- [ ] Remplacer les visuels SVG par vos photos
- [ ] **Remplacer les avis clients** — ils sont fictifs. En France, publier de
      faux avis est sanctionné par la DGCCRF.
- [ ] **Corriger les chiffres inventés** : « 4,7/5 », « 1 sur 3 produits
      écartés », l'équipe et les statistiques de la page À propos
- [ ] Compléter `mentions-legales.html` (champs entre crochets)
- [ ] Vérifier que les prix barrés correspondent bien au prix le plus bas
      pratiqué les 30 derniers jours (obligation légale)
- [ ] Remplacer l'adresse `bonjour@orbit-demo.fr` et le téléphone
- [ ] Brancher une vraie solution de paiement

## Vérifications effectuées

Le site a été testé dans Chromium (Playwright) : **81 tests automatisés
passent, aucune erreur JavaScript ni requête en échec**. Sont couverts le
rendu des 15 pages, les filtres, le tri, les variantes, le panier, les codes
promo, le tunnel de commande complet, le comparateur, les favoris, le suivi,
la bascule de thème, la navigation au clavier et l'affichage mobile
(390 px, sans débordement horizontal).
