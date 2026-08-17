# Gabarit — thème Shopify

Thème de prêt-à-porter construit autour d'une idée : **la taille d'abord**.

Le visiteur indique sa taille une fois. Le catalogue lui répond ensuite,
pièce par pièce : disponible dans sa taille, épuisée, ou non proposée. Il peut
masquer d'un geste tout ce qui ne le concerne pas.

L'identité visuelle découle du concept : la boutique a l'allure d'un plan de
coupe — papier, quadrillage, filets fins, repères en croix, cotes chiffrées,
chiffres à chasse fixe.

Écrit de zéro. Contenu et code originaux.

## Installer

1. **Boutique en ligne → Thèmes → Ajouter un thème → Importer**
2. Choisir `gabarit.zip`
3. **Aperçu**, puis **Publier**

## Faire fonctionner « la taille d'abord »

Un seul réglage compte, dans **Personnaliser → Réglages du thème →
La taille d'abord** :

| Réglage | À renseigner |
|---|---|
| Nom de l'option de taille | le nom **exact** utilisé sur vos produits : `Taille`, `Pointure`, `Size`… |
| Tailles proposées | la liste montrée dans l'invitation, séparée par des virgules |

Si le nom ne correspond pas à celui de vos produits, la mécanique reste sans
effet — c'est le seul point à ne pas rater.

Le reste est paramétrable : proposer ou non le choix à la première visite,
délai d'apparition, bascule « ne montrer que ma taille », marquage des pièces
indisponibles.

La taille est conservée **dans le navigateur du visiteur**, jamais sur un
serveur. Elle disparaît s'il efface ses données de navigation.

## Les mesures sur la fiche produit

Le bloc **Tableau de mesures** lit le métachamp `custom.mesures` du produit :
une ligne par taille, cellules séparées par des points-virgules.

```
XS; 88; 65; 40
S; 96; 68; 43
M; 104; 71; 46
L; 112; 74; 49
```

La ligne correspondant à la taille du visiteur est mise en évidence
automatiquement. Sans métachamp, un texte de repli s'affiche.

Pour créer le métachamp : **Paramètres → Métachamps → Produits →
Ajouter une définition**, espace de noms `custom`, clé `mesures`, type
« ligne de texte multiligne ».

## Ce qui se modifie

- **Réglages du thème** : identité, couleurs (papier, encre, trait technique,
  signal), quadrillage et son pas, polices, tailles et graisses, animations
  (six réglages indépendants), mise en page, panier, réseaux sociaux.
- **Sections de la page d'accueil**, toutes réordonnables au glisser-déposer :
  accroche avec cotes chiffrées, sélection de pièces, univers, méthode,
  questions, journal, infolettre, bandeau de mentions.
- **108 textes d'interface** en français et en anglais, dans
  **Thèmes → ⋯ → Modifier le contenu par défaut du thème**.

## Animations

Apparition des blocs, filets qui se tracent, chiffres qui s'incrémentent,
repères en croix, seconde photo au survol. Chacune se coupe séparément, et
toutes s'effacent si le visiteur a demandé à son système de réduire les
animations.

## À faire avant l'ouverture

1. Renseigner le **nom de l'option de taille** (point critique).
2. Relier les six **univers** à vos collections.
3. Choisir la collection de la section **Le vestiaire**.
4. Créer le métachamp `custom.mesures` et le remplir, au moins sur vos
   meilleures ventes.
5. Décocher **« Afficher l'adresse demandée »** sur la page 404.
6. Vérifier que tout prix barré correspond au prix le plus bas pratiqué durant
   les 30 derniers jours.

## Choix techniques

- Les modèles de page sont en JSON, sauf la **fiche produit**, volontairement
  en Liquid : un modèle JSON qui référence une section refusée par Shopify
  renvoie un 404 sans message, impossible à diagnostiquer.
- Toutes les valeurs injectées en CSS passent par une valeur de repli : un
  réglage vide sort à `0` en Liquid, ce qui suffirait à annuler un interligne.
- Les panneaux fermés sont réellement invisibles, pas seulement décalés hors
  écran, pour ne pas élargir la page sur mobile.
- Les tailles disponibles sont écrites dans le HTML de chaque vignette : le
  filtrage est instantané, sans appel réseau.

Largeur de page vérifiée à 390 et 1440 px : aucun débordement horizontal.
`theme-check` : 0 avertissement.
