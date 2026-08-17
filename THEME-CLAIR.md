# Thème clair — guide

Thème Shopify de prêt-à-porter dans un registre clair et aéré : fond blanc
cassé, cartes produits, structure classique de boutique.

Contenu original. Rien n'est repris d'un site tiers : seule l'organisation
générale des pages — qui est commune à des milliers de boutiques — suit les
conventions du secteur.

Deux thèmes coexistent dans ce dépôt. **Celui-ci est `shopify-theme/`,
livré sous le nom `theme-clair.zip`.** L'autre, `theme/` (Rivage, registre
éditorial), reste disponible mais n'est pas celui à importer.

## Installer

1. **Boutique en ligne → Thèmes → Ajouter un thème → Importer**
2. Choisir `theme-clair.zip`
3. **Aperçu**, puis **Publier** quand tout convient

## Enchaînement de la page d'accueil

| # | Section | Rôle |
|---|---|---|
| 1 | Accroche | image, titre, deux boutons, puces et chiffres |
| 2 | Garanties | livraison, retours, tailles, paiement |
| 3 | Produits mis en avant | la sélection de saison |
| 4 | Offre limitée | promotion avec compte à rebours |
| 5 | Nouveautés | les derniers arrivages |
| 6 | Catégories | les six univers en images |
| 7 | Comment ça marche | le parcours d'achat en trois étapes |
| 8 | Avis | à remplacer par de vrais avis clients |
| 9 | Questions fréquentes | livraison, retours, tailles |
| 10 | Guide des tailles | tableau, une ligne par bloc |
| 11 | Journal | derniers articles du blog |
| 12 | Infolettre | inscription |

Chaque section s'ajoute, se supprime et se réordonne au glisser-déposer dans
**Personnaliser**. Les fonds alternés sont déjà calculés pour ne jamais coller
deux sections teintées.

## Ce qui se modifie

- **197 réglages** répartis sur les sections : titres, textes, images, liens,
  nombre de colonnes, icônes, fonds.
- **Réglages du thème** : couleurs (mode clair et mode sombre), polices des
  titres et du texte, casse, graisse, arrondis, format des photos produits,
  seuil de livraison offerte.
- **127 textes d'interface** (« Ajouter au panier », « En stock »…) dans
  **Thèmes → ⋯ → Modifier le contenu par défaut du thème**, en français et en
  anglais.
- La **description d'un produit** se modifie dans **Produits**, dans l'admin :
  c'est une donnée produit, pas du thème.

## À faire avant l'ouverture

1. Relier les six blocs de **Catégories** à vos collections.
2. Choisir les collections des sections **Produits mis en avant** et
   **Nouveautés**.
3. Remplacer les **avis d'exemple** par de vrais avis reçus — publier de faux
   avis est sanctionné par la DGCCRF.
4. Renseigner les mesures réelles du **guide des tailles**.
5. Vérifier que le **prix barré** correspond au prix le plus bas pratiqué
   durant les 30 derniers jours.

## Fichier produits

`produits-shopify.csv` : 12 modèles, 177 variantes taille × couleur, colonnes
officielles Shopify. Prix, SKU, poids et photos restent à renseigner depuis le
fournisseur ; chaque ligne sort en brouillon pour éviter toute publication
accidentelle.

```bash
python3 outils/generer_produits.py > produits-shopify.csv
```

## Correctifs intégrés

Les défauts trouvés pendant la mise au point ont été réinjectés ici :

- toutes les valeurs numériques et de couleur injectées en CSS passent par une
  valeur de repli — un réglage vide sortait à `0` et pouvait annuler un
  interligne ;
- les polices non renseignées ne produisent plus de déclaration CSS invalide ;
- les panneaux fermés (panier, recherche, voile) deviennent réellement
  invisibles au lieu d'être seulement décalés hors écran, ce qui laissait des
  bandes vides sur le côté sur certains navigateurs mobiles.

Largeur de page vérifiée à 390, 768 et 1280 px : aucun débordement horizontal.
