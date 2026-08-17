# Rivage — thème Shopify

Thème éditorial pour une boutique de prêt-à-porter : images pleine largeur,
chapitres numérotés, titres géants, animations au défilement.

Écrit de zéro. Aucun élément n'est repris d'un site tiers : les textes, la
mise en page et le code sont originaux.

## 1. Installer

1. Admin Shopify → **Boutique en ligne → Thèmes**
2. **Ajouter un thème → Importer un thème → Importer depuis un fichier**
3. Choisissez `rivage.zip`, puis **Aperçu** avant de **Publier**

Votre thème actuel reste en ligne tant que vous ne publiez pas.

## 2. Tout est modifiable, et voici où

Le thème ne contient **aucune couleur, taille ou police écrite en dur** : la
feuille de style lit des variables que les réglages alimentent. Changer un
réglage change réellement le rendu partout.

### Réglages généraux — Personnaliser → Réglages du thème

| Groupe | Ce que vous pilotez |
|---|---|
| Identité | logo (image ou texte), largeur, favicon, image de partage |
| Couleurs | 3 fonds, 3 couleurs de texte, accent, filets et leur opacité |
| Typographie | police des titres et du texte, taille des titres géants, graisse, interligne, espacement des lettres, casse |
| Animations | apparitions, durée, décalage, distance, zoom des images, titres ligne à ligne, seconde photo au survol, curseur agrandi |
| Mise en page | largeur du contenu, marges, espace entre sections, arrondis, format et cadrage des photos produits |
| Panier | tiroir / page / rien, seuil de livraison offerte, note de commande |
| Réseaux sociaux | Instagram, TikTok, Pinterest, Facebook |

### Sections — Personnaliser → page d'accueil

Chacune s'ajoute, se supprime et se réordonne au glisser-déposer :

- **Chapitre plein écran** — image, numéro, surtitre, titre sur deux lignes, texte, deux boutons, hauteur, voile, position du contenu
- **Mosaïque de catégories** — une tuile par bloc, quatre formats au choix, reliée à une collection
- **Rail de produits** — collection, nombre, vignettes larges, barre de progression, fond
- **Manifeste** — lignes de texte en blocs + chiffres d'appui en regard
- **Duo d'images** — deux visuels désaxés et un texte, inversables
- **Journal** — derniers articles d'un blog
- **Infolettre** — titre, texte, bouton, mention
- **Bandeau défilant** — mentions en blocs, vitesse, trois styles

### Textes de l'interface

Les 108 mots d'interface (« Ajouter au panier », « En stock », « Votre panier
est vide »…) se modifient dans **Thèmes → ⋯ → Modifier le contenu par défaut
du thème**, en français comme en anglais.

### Fiche produit

La colonne d'achat reste collée pendant que la galerie défile. Les blocs
d'information sous le bouton sont libres : **Description**, **Texte libre**
(livraison, retours…) et **Métachamp produit** pour afficher une donnée
propre à chaque article (composition, entretien).

La description du produit, elle, se modifie dans **Produits** dans l'admin :
c'est une donnée produit, pas du thème.

## 3. Animations

Elles sont toutes désactivables individuellement. Le thème respecte par
ailleurs la préférence système « réduire les animations » : les visiteurs qui
l'ont activée voient une page fixe, sans réglage de votre part.

## 4. Fichier produits

`produits-shopify.csv` reste valable avec ce thème : 12 modèles, 177
variantes taille × couleur, colonnes officielles Shopify. Prix, SKU, poids et
photos sont à renseigner depuis votre fournisseur — chaque ligne est en
brouillon pour éviter toute publication accidentelle.

Régénérer après modification de la liste :

```bash
python3 outils/generer_produits.py > produits-shopify.csv
```

## 5. Photos

Le thème affiche les visuels produits en portrait 2:3 par défaut (réglable).
Prévoyez au moins 1200 px de large et un cadrage constant d'un article à
l'autre : c'est ce qui tient la grille.

Pour les chapitres pleine largeur, comptez 2000 px minimum, et cochez
« image prioritaire » uniquement sur le premier chapitre de la page.

N'utilisez que des photos dont vous détenez les droits.
