# STUDIO — thème de boutique de produits numériques

Site statique complet (HTML / CSS / JavaScript, sans dépendance) pour vendre des
produits numériques liés à la photo mobile : presets, packs photo, LUTs vidéo,
overlays et guides.

## Ouvrir le site

Double-cliquez sur `index.html` — ça suffit, il n'y a rien à installer.

Pour un rendu identique à la production (les liens `?id=` fonctionnent dans les
deux cas), vous pouvez aussi lancer un petit serveur local :

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## Structure

```
index.html              Accueil (hero, sélection, catégories, FAQ, newsletter)
boutique.html           Catalogue avec filtres, recherche et tri
produit.html            Page produit — lit ?id=... dans l'URL
panier.html             Panier persistant
a-propos.html           Page de présentation
contact.html            Formulaire de contact
mentions-legales.html   Mentions légales / CGV / confidentialité (à compléter)
assets/
  css/style.css         Toute la mise en forme
  js/products.js        ← LE CATALOGUE : c'est ici qu'on met ses produits
  js/app.js             Panier, filtres, galerie, menu (à ne pas toucher)
  img/                  Visuels de remplacement (SVG)
```

## Mettre vos propres produits

Tout se passe dans **`assets/js/products.js`**. Chaque produit est un bloc :

```js
{
  id: 'mon-pack',                       // unique, sans espace ni accent
  nom: 'Mon Pack — 30 photos',
  categorie: 'packs',                   // doit exister dans CATEGORIES
  prix: 29,
  prixBarre: 39,                        // facultatif (prix barré)
  image: 'assets/img/mon-pack.jpg',
  galerie: ['assets/img/1.jpg', 'assets/img/2.jpg'],  // facultatif
  accroche: 'Une phrase courte.',
  description: 'Le texte long de la page produit.',
  inclus: ['30 photos JPEG', 'Licence commerciale'],
  specs: { Format: 'JPEG', Poids: '800 Mo' },
  badge: 'Nouveau',                     // facultatif
  vedette: true,                        // affiché sur l'accueil
  lienAchat: 'https://…',               // facultatif — voir ci-dessous
}
```

Les catégories se modifient dans le tableau `CATEGORIES` en haut du même fichier.
Le nom de la boutique, l'e-mail et les réseaux sont dans l'objet `BOUTIQUE` en bas.

### Vos images

Déposez vos fichiers dans `assets/img/` et pointez `image` dessus. Format
conseillé : JPEG ou WebP, ratio 4/3, environ 1600 × 1200 px. Les SVG livrés ne
sont que des visuels de remplacement — supprimez-les une fois remplacés.

## Encaisser les paiements

Le panier fonctionne côté navigateur (stockage local). Un site statique ne peut
pas encaisser seul : il faut un service de paiement. Deux approches :

1. **Bouton direct par produit** — ajoutez `lienAchat: 'https://…'` à un produit.
   Le bouton « Acheter maintenant » renvoie alors vers votre page de paiement
   (Gumroad, Lemon Squeezy, Payhip, Stripe Payment Link…). C'est le plus simple,
   et c'est le mode recommandé pour démarrer.
2. **Panier multi-produits** — dans `assets/js/app.js`, la fonction `initPanier`
   contient le bouton `#commander`. Remplacez la ligne `notifier(...)` par un
   appel à Stripe Checkout ou à votre back-end.

## Formulaires

Le formulaire de contact et l'inscription newsletter affichent un message de
confirmation sans rien envoyer (attribut `data-form-demo`). Pour les rendre
fonctionnels sans serveur, utilisez un service comme Formspree ou Web3Forms :

```html
<form action="https://formspree.io/f/VOTRE_ID" method="POST">
```

…et retirez l'attribut `data-form-demo` du `<form>`.

## Personnaliser l'apparence

Les couleurs, arrondis et ombres sont regroupés en variables au début de
`assets/css/style.css` :

```css
:root {
  --accent: #0b0b0c;   /* couleur des boutons */
  --bg-soft: #fafafa;  /* fond des sections alternées */
  --radius: 14px;      /* arrondi des cartes */
}
```

Le nom « STUDIO » apparaît dans le logo (en-tête et pied de page) de chaque
page HTML, ainsi que dans les balises `<title>`.

## Mettre en ligne

Le site étant entièrement statique, il se publie tel quel :

- **GitHub Pages** — Settings → Pages → Source : votre branche, dossier `/ (root)`.
- **Netlify / Vercel / Cloudflare Pages** — glissez-déposez le dossier, aucune
  commande de build n'est nécessaire.
- **Hébergement classique** — envoyez les fichiers par FTP à la racine.

## Avant la mise en ligne

- [ ] Remplacer les produits de démonstration dans `products.js`
- [ ] Remplacer les images de `assets/img/`
- [ ] Compléter `mentions-legales.html` (les champs entre crochets)
- [ ] Remplacer l'adresse `contact@exemple.fr` dans `contact.html`
- [ ] Brancher la solution de paiement
- [ ] Adapter les chiffres de l'accueil et de la page « À propos »
- [ ] Remplacer ou retirer les avis clients de démonstration
