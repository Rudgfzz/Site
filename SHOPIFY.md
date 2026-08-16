# Thème Shopify « Studio » — guide d'installation

Le dossier `shopify-theme/` contient un thème Shopify complet, reprenant le
design du site statique. Il s'installe dans une boutique Shopify existante et
se pilote entièrement depuis l'admin : les produits, le panier et le paiement
sont gérés par Shopify, pas par le code.

## 1. Installer le thème

1. Récupérez le fichier **`studio-shopify.zip`** (à la racine du dépôt).
2. Dans votre admin Shopify : **Boutique en ligne → Thèmes**.
3. Bouton **Ajouter un thème → Importer un thème → Importer depuis un fichier**.
4. Choisissez le ZIP, patientez pendant l'analyse.
5. Le thème apparaît dans la bibliothèque. Cliquez sur **Aperçu** pour le voir
   avant de le publier, puis sur **Publier** quand il vous convient.

> Ne publiez pas tout de suite : prévisualisez, configurez, publiez ensuite.
> Votre thème actuel reste en ligne pendant ce temps.

## 2. Configurer le menu et les collections

Le thème s'appuie sur vos menus et vos collections Shopify.

**Menus** (Boutique en ligne → Navigation) :
- `main-menu` — le menu principal de l'en-tête.
- `footer` — les liens du pied de page.

**Collections** (Produits → Collections) : créez-en une par catégorie, par
exemple *Presets*, *Packs photo*, *LUTs vidéo*, *Overlays*, *Guides*.

Ensuite, dans **Personnaliser** :
- section *Produits mis en avant* → choisissez la collection à afficher en
  page d'accueil ;
- section *Liste de catégories* → ajoutez un bloc par collection ;
- section *Page collection* → réglage « Menu des catégories » pour les
  pastilles de filtres au-dessus de la grille.

## 3. Livrer les fichiers numériques

Shopify ne livre pas de fichiers tout seul. Installez l'application gratuite
**Shopify Digital Downloads** (Apps → rechercher « Digital Downloads »), puis :

1. Ouvrez un produit → **Plus d'actions → Add digital attachment**.
2. Envoyez le fichier ZIP du pack.
3. Décochez **Suivre la quantité** et **Ceci est un produit physique** dans la
   fiche produit — sans quoi Shopify réclamera une adresse de livraison.

L'acheteur reçoit alors son lien de téléchargement automatiquement après
paiement.

## 4. Enrichir les fiches produit (facultatif)

La page produit affiche automatiquement une accroche, une liste « Ce qui est
inclus » et un tableau « Caractéristiques » si vous créez ces **métachamps**.

Dans **Paramètres → Métachamps et métaobjets → Produits → Ajouter une
définition** :

| Nom | Espace de noms et clé | Type |
|---|---|---|
| Accroche | `custom.accroche` | Texte sur une ligne |
| Ce qui est inclus | `custom.inclus` | Texte sur une ligne — **liste de valeurs** |
| Caractéristiques | `custom.caracteristiques` | Texte sur une ligne — **liste de valeurs** |
| Masquer la quantité | `custom.masquer_quantite` | Vrai ou faux |

Pour les caractéristiques, saisissez une valeur par ligne au format
`Clé : valeur`, avec des espaces autour des deux-points :

```
Format : .DNG et .XMP
Compatibilité : Lightroom mobile et desktop
Poids : 48 Mo
Licence : Usage personnel et commercial
```

Les produits sans métachamps s'affichent normalement, avec leur seule
description.

## 5. Personnaliser l'apparence

**Personnaliser → Réglages du thème** :

- *Identité* — logo et favicon.
- *Couleurs* — fond, texte, bordures, couleur des boutons.
- *Mise en forme* — arrondi des cartes, format des images produit
  (carré, 4:3 ou 3:4).
- *Réassurance* — les trois arguments sous le bouton d'achat.
- *Réseaux sociaux* — liens affichés dans le pied de page.

Chaque section de la page d'accueil se réorganise par glisser-déposer et
s'ajoute via **Ajouter une section** : bandeau, arguments, produits mis en
avant, catégories, étapes, image et texte, avis, FAQ, newsletter.

## 6. Ce que contient le thème

```
layout/theme.liquid          Ossature commune à toutes les pages
templates/*.json             Assemblage des sections par type de page
templates/customers/*.liquid Connexion, compte, commandes, adresses
sections/                    22 sections, toutes personnalisables
snippets/                    Carte produit, prix, icônes, pagination
assets/theme.css             Le design
assets/theme.js              Menu mobile, galerie, quantités
config/settings_schema.json  Les réglages du thème
locales/fr.default.json      Traductions (français par défaut, anglais fourni)
```

Pages couvertes : accueil, collection, produit, panier, recherche, liste des
catégories, page libre, contact, blog, article, 404, mot de passe, et les
pages de compte client.

## 7. Avant de publier

- [ ] Remplacer les avis clients de démonstration par de vrais avis — ou
      supprimer la section. En France, publier de faux avis est sanctionné.
- [ ] Corriger les chiffres du bandeau d'accueil (« 180+ fichiers »,
      « 4,9/5 »…) : ce sont des exemples, pas vos statistiques.
- [ ] Vérifier les textes de réassurance sous le bouton d'achat.
- [ ] Renseigner vos pages légales (Paramètres → Politiques) : CGV, mentions,
      confidentialité, remboursement.
- [ ] Tester une commande réelle en mode test (Paramètres → Paiements).
- [ ] Vérifier que le fichier numérique arrive bien après paiement.

## 8. Modifier le code plus tard

Boutique en ligne → Thèmes → **⋯ → Modifier le code**. Vous y retrouvez
l'arborescence ci-dessus. Les fichiers les plus utiles :
`assets/theme.css` pour le design, `sections/main-product.liquid` pour la page
produit.

Pour travailler depuis votre ordinateur avec rechargement automatique :

```bash
npm install -g @shopify/cli
shopify theme dev --store votre-boutique.myshopify.com
```

## Vérification effectuée

Le thème passe **`@shopify/theme-check`**, l'outil de validation officiel
Shopify, sans aucune erreur ni avertissement (38 fichiers Liquid, 16 fichiers
JSON, 22 sections, 7 snippets).
