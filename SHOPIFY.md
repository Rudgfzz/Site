# Thème Shopify « ORBIT » — guide d'installation

Le dossier `shopify-theme/` contient le design ORBIT converti en thème Shopify
(Liquid). Il s'installe dans une boutique existante : les produits, le panier
et le paiement sont gérés par Shopify, pas par le code.

## 1. Installer

1. Récupérez **`orbit-shopify.zip`** (envoyé dans la conversation, ou
   regénérez-le depuis `shopify-theme/`).
2. Admin Shopify → **Boutique en ligne → Thèmes**.
3. **Ajouter un thème → Importer un thème → Importer depuis un fichier**.
4. Choisissez le ZIP, puis **Aperçu** avant de **Publier**.

Votre thème actuel reste en ligne pendant la prévisualisation.

## 2. Créer les deux pages spéciales

Le comparateur et les favoris sont des pages Shopify utilisant un modèle dédié.

Pour chacune — **Boutique en ligne → Pages → Ajouter une page** :

| Titre | Modèle de page à choisir |
|---|---|
| Comparateur | `page.comparateur` |
| Mes favoris | `page.favoris` |

Puis **Personnaliser → Réglages du thème → Pages spéciales** : sélectionnez ces
deux pages. C'est ce qui relie l'icône ♥ de l'en-tête et la barre de comparaison.

## 3. Activer les filtres de la boutique

La colonne de filtres (marque, coloris, prix, disponibilité) utilise les filtres
natifs de Shopify. Installez l'application **gratuite** « Search & Discovery »
(Apps → rechercher « Search & Discovery »), puis configurez-y vos filtres.

Sans cette application, la colonne affiche simplement la liste des collections —
le site reste parfaitement fonctionnel.

## 4. Menus et collections

**Navigation** : renseignez `main-menu` (en-tête) et `footer` (pied de page).

**Collections** : créez-en une par catégorie (Smartphones, Tablettes, Audio,
Montres, Ordinateurs, Accessoires), puis dans **Personnaliser** :

- section *Liste de catégories* → un bloc par collection ;
- section *Produits mis en avant* → la collection à afficher en accueil ;
- section *Offre en avant* → le produit en promotion.

## 5. Enrichir les fiches produit (facultatif)

La fiche affiche une accroche, des points forts et un tableau de
caractéristiques si vous créez ces **métachamps**.

**Paramètres → Métachamps et métaobjets → Produits → Ajouter une définition** :

| Nom | Espace de noms et clé | Type |
|---|---|---|
| Accroche | `custom.accroche` | Texte sur une ligne |
| Points forts | `custom.points_forts` | Texte sur une ligne — **liste de valeurs** |
| Caractéristiques | `custom.caracteristiques` | Texte sur une ligne — **liste de valeurs** |
| Garantie | `custom.garantie` | Texte sur une ligne |

Pour les caractéristiques, une valeur par ligne au format `Clé : valeur`, avec
des espaces autour des deux-points :

```
Écran : 6,7″ OLED LTPO, 120 Hz
Processeur : Octa-cœur 3 nm
Autonomie : Jusqu'à 29 h
Poids : 187 g
```

Ces mêmes caractéristiques alimentent automatiquement le **comparateur**.

**Étiquettes produit** : ajoutez le tag `nouveau` ou `best-seller` à un produit
pour afficher la pastille correspondante sur sa carte.

**Note et avis** : le thème lit les métachamps standards
`reviews.rating` et `reviews.rating_count`, alimentés par la plupart des
applications d'avis (dont Shopify Product Reviews et Judge.me).

## 6. Personnaliser l'apparence

**Personnaliser → Réglages du thème** :

- *Thème clair / sombre* — le thème par défaut ; le visiteur peut basculer, son
  choix est mémorisé.
- *Couleurs* — les deux couleurs du dégradé, séparément pour le mode sombre et
  le mode clair.
- *Mise en forme* — arrondi des cartes, format des images produit.
- *Page produit* — mention « 3× sans frais », bouton de paiement accéléré, et
  les trois services affichés sous le bouton d'achat.
- *Panier* — seuil de livraison offerte (la jauge de progression en découle).

## 7. Ce que contient le thème

```
layout/theme.liquid            Ossature + surcouches (tiroir, recherche)
templates/*.json               Assemblage des sections par type de page
templates/page.favoris.json    Modèle de la page Favoris
templates/page.comparateur.json Modèle de la page Comparateur
templates/customers/*.liquid   Connexion, compte, commandes, adresses
sections/                      27 sections
snippets/                      Carte produit, prix, icônes, pastilles, pagination
assets/theme.css               Le design ORBIT (1 980 lignes)
assets/theme.js                Tiroir panier, recherche, favoris, comparateur
config/settings_schema.json    Réglages du thème
locales/fr.default.json        Traductions (français par défaut, anglais fourni)
```

Le panier s'ouvre en tiroir sans rechargement (API panier de Shopify), la
recherche utilise la recherche prédictive, et **tout continue de fonctionner
sans JavaScript** : les formulaires classiques prennent le relais.

## 8. Avant de publier

- [ ] Remplacer les avis de démonstration (texte « À REMPLACER ») par de vrais
      avis, ou supprimer la section. Publier de faux avis est sanctionné.
- [ ] Vérifier les prix barrés : le prix de référence doit être le plus bas
      pratiqué les 30 derniers jours.
- [ ] Renseigner vos pages légales (Paramètres → Politiques).
- [ ] Créer les deux pages spéciales et les sélectionner dans les réglages.
- [ ] Tester une commande réelle en mode test (Paramètres → Paiements).

## Vérifications effectuées

- **`@shopify/theme-check`** (outil officiel Shopify) : **0 erreur,
  0 avertissement** sur 27 sections et 6 snippets.
- Syntaxe JavaScript validée (`theme.js` et les 4 scripts en ligne).
- JSON, schémas de section et références `render`/`section` vérifiés.

Ces contrôles sont statiques : je n'ai pas pu téléverser le thème dans une
boutique réelle. Prévisualisez avant de publier.
