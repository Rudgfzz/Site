/* =============================================================
   CATALOGUE PRODUITS
   -------------------------------------------------------------
   C'est LE seul fichier à modifier pour mettre tes vrais produits.
   Chaque produit est un objet dans le tableau PRODUITS ci-dessous.

   Champs disponibles :
     id          (obligatoire) identifiant unique, en minuscules, sans espace
     nom         (obligatoire) nom affiché
     categorie   (obligatoire) doit exister dans CATEGORIES plus bas
     prix        (obligatoire) nombre, en euros
     prixBarre   optionnel — ancien prix affiché barré (nombre)
     image       (obligatoire) chemin de l'image principale
     galerie     optionnel — tableau de chemins d'images supplémentaires
     accroche    (obligatoire) une phrase courte, affichée sous le nom
     description (obligatoire) texte long de la page produit
     inclus      tableau de ce que contient le produit (affiché en liste)
     specs       objet clé/valeur affiché dans le tableau caractéristiques
     badge       optionnel — "Nouveau", "Populaire", "-30%"...
     vedette     true pour l'afficher sur la page d'accueil
     lienAchat   optionnel — URL de paiement (Gumroad, Stripe, Lemon Squeezy…)
                 Si absent, le bouton ajoute simplement au panier.
   ============================================================= */

const CATEGORIES = [
  { id: 'presets',  nom: 'Presets Lightroom' },
  { id: 'packs',    nom: 'Packs photo' },
  { id: 'luts',     nom: 'LUTs vidéo' },
  { id: 'overlays', nom: 'Overlays & textures' },
  { id: 'guides',   nom: 'Guides & formations' },
];

const PRODUITS = [
  {
    id: 'presets-golden-hour',
    nom: 'Golden Hour — 20 presets',
    categorie: 'presets',
    prix: 24,
    prixBarre: 34,
    image: 'assets/img/produit-01.svg',
    galerie: ['assets/img/produit-01.svg', 'assets/img/produit-03.svg', 'assets/img/produit-07.svg'],
    accroche: 'La lumière chaude de fin de journée, en un clic.',
    description:
      "Vingt presets pensés pour les photos prises au smartphone en lumière naturelle. Les tons chauds sont remontés sans brûler les hautes lumières, et les peaux restent naturelles. Chaque preset est réglable : opacité, exposition et température restent modifiables après application.",
    inclus: [
      '20 presets au format .DNG (iPhone / Lightroom mobile)',
      '20 presets au format .XMP (Lightroom desktop)',
      "Guide d'installation illustré (PDF, 8 pages)",
      'Mises à jour futures offertes',
    ],
    specs: {
      Format: '.DNG et .XMP',
      Compatibilité: 'Lightroom mobile, Lightroom Classic, Camera Raw',
      Fichiers: '40 presets + 1 PDF',
      Poids: '48 Mo',
      Licence: 'Usage personnel et commercial',
    },
    badge: 'Populaire',
    vedette: true,
  },
  {
    id: 'pack-urbain-nuit',
    nom: 'Urbain Nuit — 60 photos',
    categorie: 'packs',
    prix: 39,
    image: 'assets/img/produit-02.svg',
    galerie: ['assets/img/produit-02.svg', 'assets/img/produit-05.svg'],
    accroche: 'Soixante clichés de ville après le coucher du soleil.',
    description:
      "Une collection de photos de rue nocturnes : néons, reflets sur l'asphalte mouillé, silhouettes en contre-jour. Toutes les images sont livrées en pleine résolution, retouchées et prêtes à l'emploi pour vos maquettes, réseaux sociaux ou supports imprimés.",
    inclus: [
      '60 photos JPEG haute résolution (jusqu\'à 4032 × 3024 px)',
      'Versions carrées et verticales pré-recadrées',
      'Licence commerciale incluse',
    ],
    specs: {
      Format: 'JPEG',
      Résolution: '4032 × 3024 px',
      Fichiers: '60 photos + 60 recadrages',
      Poids: '1,2 Go',
      Licence: 'Usage personnel et commercial',
    },
    badge: 'Nouveau',
    vedette: true,
  },
  {
    id: 'luts-cinematic',
    nom: 'Cinematic — 12 LUTs vidéo',
    categorie: 'luts',
    prix: 29,
    image: 'assets/img/produit-03.svg',
    accroche: "Un étalonnage de film sur vos vidéos d'iPhone.",
    description:
      "Douze LUTs calibrées pour les vidéos tournées au smartphone, y compris en mode Cinématique et en Apple Log. Teal & orange, pellicule argentique, désaturé froid : chaque LUT existe en version douce et en version marquée.",
    inclus: [
      '12 LUTs au format .CUBE',
      'Version douce et version marquée pour chacune',
      'Compatible Final Cut, Premiere, DaVinci, CapCut, LumaFusion',
    ],
    specs: {
      Format: '.CUBE (33×33×33)',
      Compatibilité: 'Final Cut Pro, Premiere Pro, DaVinci Resolve, CapCut',
      Fichiers: '24 LUTs',
      Poids: '12 Mo',
      Licence: 'Usage personnel et commercial',
    },
    vedette: true,
  },
  {
    id: 'overlays-lumiere',
    nom: 'Fuites de lumière — 40 overlays',
    categorie: 'overlays',
    prix: 19,
    image: 'assets/img/produit-04.svg',
    accroche: 'Halos, poussières et reflets à superposer.',
    description:
      "Quarante textures transparentes à poser sur vos photos : fuites de lumière argentiques, grain de pellicule, reflets d'objectif et poussières. À utiliser en mode de fusion « Écran » ou « Superposition » dans n'importe quel éditeur qui gère les calques.",
    inclus: [
      '40 overlays PNG sur fond transparent',
      '10 textures de grain en haute définition',
      'Mode d\'emploi pour Photoshop, Affinity et Snapseed',
    ],
    specs: {
      Format: 'PNG transparent',
      Résolution: '3000 × 2000 px',
      Fichiers: '50 fichiers',
      Poids: '620 Mo',
      Licence: 'Usage personnel et commercial',
    },
    vedette: true,
  },
  {
    id: 'guide-photo-iphone',
    nom: "Photographier à l'iPhone — le guide",
    categorie: 'guides',
    prix: 15,
    image: 'assets/img/produit-05.svg',
    accroche: 'Cent-vingt pages pour sortir du mode automatique.',
    description:
      "Un guide complet sur la prise de vue au smartphone : maîtrise de l'exposition manuelle, format ProRAW, composition, lumière difficile, et un chapitre entier sur la retouche mobile. Écrit sans jargon, illustré d'exemples avant/après commentés.",
    inclus: [
      'Ebook PDF de 120 pages',
      'Version ePub pour liseuse',
      '15 exercices pratiques corrigés',
    ],
    specs: {
      Format: 'PDF et ePub',
      Pages: '120',
      Langue: 'Français',
      Poids: '85 Mo',
      Licence: 'Usage personnel',
    },
    vedette: false,
  },
  {
    id: 'presets-portrait',
    nom: 'Portrait Naturel — 15 presets',
    categorie: 'presets',
    prix: 22,
    image: 'assets/img/produit-06.svg',
    accroche: 'Des carnations justes, sans effet plastique.',
    description:
      "Quinze presets dédiés au portrait, réglés pour préserver la texture de la peau et la neutralité des couleurs. Fonctionnent aussi bien en intérieur sous lumière artificielle qu'en extérieur à l'ombre.",
    inclus: [
      '15 presets .DNG et .XMP',
      '3 profils de couleur additionnels',
      "Guide d'installation illustré",
    ],
    specs: {
      Format: '.DNG et .XMP',
      Compatibilité: 'Lightroom mobile et desktop',
      Fichiers: '30 presets + 3 profils',
      Poids: '36 Mo',
      Licence: 'Usage personnel et commercial',
    },
    vedette: false,
  },
  {
    id: 'pack-nature-brume',
    nom: 'Nature & Brume — 45 photos',
    categorie: 'packs',
    prix: 34,
    prixBarre: 44,
    image: 'assets/img/produit-07.svg',
    accroche: 'Forêts, lacs et matins brumeux en haute résolution.',
    description:
      "Quarante-cinq paysages capturés à l'aube : brume sur l'eau, sous-bois, crêtes de montagne. Une palette froide et douce, cohérente d'une image à l'autre, qui s'intègre facilement dans une charte graphique existante.",
    inclus: [
      '45 photos JPEG haute résolution',
      '10 photos en RAW (.DNG) pour retouche avancée',
      'Licence commerciale incluse',
    ],
    specs: {
      Format: 'JPEG + DNG',
      Résolution: '4032 × 3024 px',
      Fichiers: '55 photos',
      Poids: '2,1 Go',
      Licence: 'Usage personnel et commercial',
    },
    badge: '-25%',
    vedette: false,
  },
  {
    id: 'luts-pastel',
    nom: 'Pastel — 8 LUTs douces',
    categorie: 'luts',
    prix: 18,
    image: 'assets/img/produit-08.svg',
    accroche: 'Des couleurs délavées, pour un rendu doux.',
    description:
      "Huit LUTs aux teintes pastel et aux noirs remontés, pensées pour les vlogs et les vidéos de voyage. Le rendu reste discret : la peau ne vire jamais, même sur des plans très éclairés.",
    inclus: [
      '8 LUTs au format .CUBE',
      'Presets équivalents pour la photo (.XMP)',
      'Exemples avant/après en vidéo',
    ],
    specs: {
      Format: '.CUBE + .XMP',
      Compatibilité: 'Toutes applications de montage',
      Fichiers: '16 fichiers',
      Poids: '9 Mo',
      Licence: 'Usage personnel et commercial',
    },
    vedette: false,
  },
];

/* Informations de la boutique — modifiables librement */
const BOUTIQUE = {
  nom: 'STUDIO',
  slogan: 'Produits numériques pour la photo mobile',
  email: 'contact@exemple.fr',
  instagram: 'https://instagram.com/',
  devise: '€',
};
