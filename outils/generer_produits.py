#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Génère un fichier d'import produits Shopify pour une boutique de
prêt-à-porter d'été.

Le fichier produit ici est un SQUELETTE COMPLET, pas un catalogue réel :
les intitulés, les descriptions et la structure des variantes sont prêts,
mais les prix, les SKU, les codes-barres, les poids et les photos doivent
être remplacés par les données du fournisseur avant toute mise en ligne.

C'est pour cette raison que chaque ligne sort en « draft » / Published =
FALSE : un import accidentel ne peut pas publier des produits incomplets.

Usage :
    python3 outils/generer_produits.py > produits-shopify.csv
"""

import csv
import sys
import unicodedata


def code(valeur):
    """Réduit une valeur d'option à un fragment de SKU sans accent ni espace."""
    sans_accent = "".join(
        c for c in unicodedata.normalize("NFD", valeur)
        if unicodedata.category(c) != "Mn"
    )
    return "".join(c for c in sans_accent if c.isalnum())[:6].upper()

# --------------------------------------------------------------------------
# Colonnes officielles de l'import produits Shopify, dans l'ordre attendu.
# --------------------------------------------------------------------------
COLONNES = [
    "Handle", "Title", "Body (HTML)", "Vendor", "Product Category", "Type",
    "Tags", "Published",
    "Option1 Name", "Option1 Value", "Option2 Name", "Option2 Value",
    "Option3 Name", "Option3 Value",
    "Variant SKU", "Variant Grams", "Variant Inventory Tracker",
    "Variant Inventory Qty", "Variant Inventory Policy",
    "Variant Fulfillment Service", "Variant Price", "Variant Compare At Price",
    "Variant Requires Shipping", "Variant Taxable", "Variant Barcode",
    "Image Src", "Image Position", "Image Alt Text", "Gift Card",
    "SEO Title", "SEO Description",
    "Google Shopping / Google Product Category", "Google Shopping / Gender",
    "Google Shopping / Age Group", "Google Shopping / MPN",
    "Google Shopping / Condition", "Google Shopping / Custom Product",
    "Variant Image", "Variant Weight Unit", "Variant Tax Code",
    "Cost per item", "Status",
]

TAILLES_VET = ["XS", "S", "M", "L", "XL", "XXL"]
POINTURES = ["39", "40", "41", "42", "43", "44", "45"]
TAILLE_UNIQUE = ["Taille unique"]


def description(intro, points, composition, entretien):
    """Assemble une description HTML homogène d'un produit à l'autre."""
    lignes = "".join("<li>%s</li>" % p for p in points)
    return (
        "<p>{intro}</p>"
        "<ul>{lignes}</ul>"
        "<p><strong>Composition :</strong> {composition}<br>"
        "<strong>Entretien :</strong> {entretien}</p>"
        "<p><em>À compléter avec la fiche technique du fournisseur : "
        "mesures exactes, origine de fabrication, certifications.</em></p>"
    ).format(intro=intro, lignes=lignes, composition=composition,
             entretien=entretien)


# --------------------------------------------------------------------------
# Catalogue de départ. Deux modèles par catégorie, à dupliquer et renommer.
# --------------------------------------------------------------------------
PRODUITS = [
    {
        "handle": "t-shirt-coton-epais",
        "titre": "T-shirt en coton épais",
        "type": "T-shirt",
        "categorie": "Apparel & Accessories > Clothing > Shirts & Tops",
        "tags": "t-shirt, coton, été, basique",
        "prix": "29.90",
        "grammes": 220,
        "options": [("Taille", TAILLES_VET), ("Couleur", ["Blanc", "Noir", "Sable", "Bleu ciel"])],
        "corps": description(
            "Un t-shirt à la maille dense qui ne devient pas transparent après "
            "trois lavages. Coupe droite, épaules marquées, col côtelé qui garde "
            "sa forme.",
            ["Maille épaisse, tenue durable",
             "Col côtelé renforcé",
             "Coupe droite, ni cintrée ni oversize",
             "Coutures latérales pour éviter le vrillage"],
            "100 % coton — à confirmer auprès du fournisseur",
            "Lavage à 30 °C, séchage à l'air libre"),
        "seo_titre": "T-shirt en coton épais — coupe droite",
        "seo_desc": "T-shirt en coton à maille dense, coupe droite et col côtelé. "
                    "Livraison offerte dès 100 €, retours gratuits sous 14 jours.",
    },
    {
        "handle": "t-shirt-lin-melange",
        "titre": "T-shirt en lin mélangé",
        "type": "T-shirt",
        "categorie": "Apparel & Accessories > Clothing > Shirts & Tops",
        "tags": "t-shirt, lin, été, respirant",
        "prix": "39.90",
        "grammes": 180,
        "options": [("Taille", TAILLES_VET), ("Couleur", ["Écru", "Terracotta", "Vert olive"])],
        "corps": description(
            "Le lin laisse passer l'air : c'est le t-shirt des journées où le "
            "coton colle. La maille se froisse légèrement, c'est le propre de la "
            "matière et non un défaut.",
            ["Matière respirante, idéale par forte chaleur",
             "Tombé fluide, légèrement plus ample",
             "Se froisse naturellement",
             "S'assouplit lavage après lavage"],
            "Lin et coton — proportions à confirmer auprès du fournisseur",
            "Lavage à 30 °C, repassage doux sur l'envers"),
        "seo_titre": "T-shirt en lin mélangé — respirant",
        "seo_desc": "T-shirt en lin mélangé, respirant et fluide, pensé pour les "
                    "fortes chaleurs. Retours gratuits sous 14 jours.",
    },
    {
        "handle": "sneakers-toile-basses",
        "titre": "Sneakers basses en toile",
        "type": "Chaussures",
        "categorie": "Apparel & Accessories > Shoes",
        "tags": "chaussures, sneakers, toile, été",
        "prix": "69.90",
        "grammes": 700,
        "options": [("Pointure", POINTURES), ("Couleur", ["Blanc", "Noir", "Beige"])],
        "corps": description(
            "Une basket basse en toile, semelle souple, à porter pieds nus sans "
            "que le talon frotte. Le modèle taille normalement.",
            ["Tige en toile aérée",
             "Semelle intérieure amovible",
             "Semelle extérieure souple, non marquante",
             "Se nettoie à la brosse et à l'eau tiède"],
            "Dessus en toile, semelle en caoutchouc — à confirmer",
            "Nettoyage à la main, séchage à l'ombre"),
        "seo_titre": "Sneakers basses en toile — semelle souple",
        "seo_desc": "Sneakers basses en toile, souples et aérées, à porter pieds nus. "
                    "Livraison offerte dès 100 €.",
    },
    {
        "handle": "espadrilles-corde",
        "titre": "Espadrilles à semelle corde",
        "type": "Chaussures",
        "categorie": "Apparel & Accessories > Shoes",
        "tags": "chaussures, espadrilles, corde, été",
        "prix": "49.90",
        "grammes": 480,
        "options": [("Pointure", POINTURES), ("Couleur", ["Écru", "Marine", "Terracotta"])],
        "corps": description(
            "La semelle en corde tressée reste légère et ne chauffe pas au soleil. "
            "Modèle à enfiler, sans laçage.",
            ["Semelle en corde tressée",
             "Dessus en toile de coton",
             "À enfiler, sans laçage",
             "Très légères, faciles à glisser dans un sac"],
            "Toile de coton, semelle en jute — à confirmer",
            "Nettoyage à sec, éviter l'immersion"),
        "seo_titre": "Espadrilles à semelle corde — légères",
        "seo_desc": "Espadrilles en toile à semelle de corde tressée, légères et "
                    "faciles à enfiler. Retours gratuits sous 14 jours.",
    },
    {
        "handle": "casquette-coton-lavee",
        "titre": "Casquette en coton lavé",
        "type": "Casquette",
        "categorie": "Apparel & Accessories > Clothing Accessories > Hats",
        "tags": "casquette, coton, été, accessoire",
        "prix": "24.90",
        "grammes": 110,
        "options": [("Taille", TAILLE_UNIQUE), ("Couleur", ["Sable", "Noir", "Vert olive", "Bleu délavé"])],
        "corps": description(
            "Une casquette souple, non structurée, qui se plie sans garder de pli. "
            "La sangle arrière ajuste le tour de tête.",
            ["Coton lavé, toucher souple",
             "Visière préformée",
             "Sangle réglable à boucle métal",
             "Se plie sans se déformer"],
            "100 % coton lavé — à confirmer auprès du fournisseur",
            "Lavage à la main à 30 °C"),
        "seo_titre": "Casquette en coton lavé — réglable",
        "seo_desc": "Casquette souple en coton lavé, visière préformée et sangle "
                    "réglable. Livraison offerte dès 100 €.",
    },
    {
        "handle": "bob-toile-legere",
        "titre": "Bob en toile légère",
        "type": "Casquette",
        "categorie": "Apparel & Accessories > Clothing Accessories > Hats",
        "tags": "bob, chapeau, toile, été",
        "prix": "27.90",
        "grammes": 120,
        "options": [("Taille", ["S/M", "L/XL"]), ("Couleur", ["Écru", "Kaki", "Noir"])],
        "corps": description(
            "Un bob à bord souple qui protège la nuque sans peser sur la tête. "
            "Se roule dans une poche et reprend sa forme.",
            ["Bord souple, large de 6 cm environ",
             "Toile légère, séchage rapide",
             "Se roule sans marquer",
             "Deux tailles pour un maintien correct"],
            "Toile de coton — à confirmer auprès du fournisseur",
            "Lavage à la main, séchage à plat"),
        "seo_titre": "Bob en toile légère — bord souple",
        "seo_desc": "Bob d'été en toile légère, bord souple, se roule sans se "
                    "déformer. Retours gratuits sous 14 jours.",
    },
    {
        "handle": "sac-cabas-toile",
        "titre": "Cabas en toile épaisse",
        "type": "Sac",
        "categorie": "Apparel & Accessories > Handbags, Wallets & Cases > Handbags",
        "tags": "sac, cabas, toile, accessoire",
        "prix": "45.00",
        "grammes": 520,
        "options": [("Couleur", ["Écru", "Noir", "Terracotta"])],
        "corps": description(
            "Un cabas à la toile assez rigide pour tenir debout une fois posé. "
            "Anses longues, portable à l'épaule avec une veste.",
            ["Toile épaisse qui tient debout",
             "Anses longues, portage épaule",
             "Poche intérieure zippée",
             "Fond renforcé"],
            "Toile de coton, doublure en polyester — à confirmer",
            "Nettoyage localisé à l'éponge humide"),
        "seo_titre": "Cabas en toile épaisse — porté épaule",
        "seo_desc": "Cabas en toile épaisse à fond renforcé et poche intérieure "
                    "zippée. Livraison offerte dès 100 €.",
    },
    {
        "handle": "sacoche-bandouliere",
        "titre": "Sacoche bandoulière",
        "type": "Sac",
        "categorie": "Apparel & Accessories > Handbags, Wallets & Cases > Handbags",
        "tags": "sac, sacoche, bandoulière, accessoire",
        "prix": "39.00",
        "grammes": 340,
        "options": [("Couleur", ["Noir", "Kaki", "Sable"])],
        "corps": description(
            "Le format qui prend un téléphone, un portefeuille et des clés, sans "
            "plus. La sangle s'ajuste d'une main.",
            ["Format compact, porté croisé",
             "Sangle réglable d'une main",
             "Fermeture zippée",
             "Poche avant à accès rapide"],
            "Toile technique — à confirmer auprès du fournisseur",
            "Nettoyage à l'éponge humide"),
        "seo_titre": "Sacoche bandoulière compacte",
        "seo_desc": "Sacoche bandoulière compacte, sangle réglable et fermeture "
                    "zippée. Retours gratuits sous 14 jours.",
    },
    {
        "handle": "claquettes-sanglees",
        "titre": "Claquettes à sangle large",
        "type": "Claquettes",
        "categorie": "Apparel & Accessories > Shoes",
        "tags": "claquettes, sandales, été, plage",
        "prix": "29.90",
        "grammes": 380,
        "options": [("Pointure", POINTURES), ("Couleur", ["Noir", "Blanc", "Vert olive"])],
        "corps": description(
            "Sangle large et rembourrée : le pied ne glisse pas sur le côté. "
            "Semelle antidérapante, y compris mouillée.",
            ["Sangle large, doublure rembourrée",
             "Semelle antidérapante",
             "Séchage rapide",
             "Passent à l'eau claire sans dommage"],
            "Semelle EVA, sangle synthétique — à confirmer",
            "Rincer à l'eau claire, sécher à l'ombre"),
        "seo_titre": "Claquettes à sangle large — antidérapantes",
        "seo_desc": "Claquettes à sangle large rembourrée et semelle "
                    "antidérapante. Livraison offerte dès 100 €.",
    },
    {
        "handle": "tongs-cuir",
        "titre": "Tongs à lanières cuir",
        "type": "Claquettes",
        "categorie": "Apparel & Accessories > Shoes",
        "tags": "tongs, sandales, cuir, été",
        "prix": "34.90",
        "grammes": 300,
        "options": [("Pointure", POINTURES), ("Couleur", ["Marron", "Noir"])],
        "corps": description(
            "Des lanières en cuir qui s'assouplissent au fil des jours et cessent "
            "de frotter entre les orteils après quelques ports.",
            ["Lanières en cuir, souples à l'usage",
             "Semelle contreforme légère",
             "Entre-doigt rembourré",
             "À éviter dans l'eau salée"],
            "Cuir de bovin, semelle en caoutchouc — à confirmer",
            "Essuyer à sec, nourrir le cuir occasionnellement"),
        "seo_titre": "Tongs à lanières en cuir",
        "seo_desc": "Tongs à lanières de cuir souple et entre-doigt rembourré. "
                    "Retours gratuits sous 14 jours.",
    },
    {
        "handle": "pull-coton-fin",
        "titre": "Pull fin en coton",
        "type": "Pull",
        "categorie": "Apparel & Accessories > Clothing > Shirts & Tops",
        "tags": "pull, coton, mi-saison, léger",
        "prix": "59.90",
        "grammes": 420,
        "options": [("Taille", TAILLES_VET), ("Couleur", ["Écru", "Marine", "Terracotta", "Gris clair"])],
        "corps": description(
            "La maille fine se porte sur un t-shirt les soirs où le vent se lève, "
            "sans tenir chaud en journée.",
            ["Maille fine, portable en mi-saison",
             "Col rond bordé côtes",
             "Poignets et bas côtelés",
             "Ne gratte pas, portable à même la peau"],
            "100 % coton — à confirmer auprès du fournisseur",
            "Lavage à 30 °C, séchage à plat"),
        "seo_titre": "Pull fin en coton — mi-saison",
        "seo_desc": "Pull en maille fine de coton, col rond côtelé, idéal en "
                    "mi-saison. Livraison offerte dès 100 €.",
    },
    {
        "handle": "gilet-maille-ajouree",
        "titre": "Gilet en maille ajourée",
        "type": "Pull",
        "categorie": "Apparel & Accessories > Clothing > Shirts & Tops",
        "tags": "gilet, maille, ajouré, été",
        "prix": "64.90",
        "grammes": 400,
        "options": [("Taille", TAILLES_VET), ("Couleur", ["Écru", "Kaki", "Noir"])],
        "corps": description(
            "Une maille ajourée qui laisse passer l'air : le gilet se garde en "
            "terrasse le soir sans avoir trop chaud.",
            ["Maille ajourée, très respirante",
             "Boutonnage sur le devant",
             "Coupe droite, longueur hanche",
             "Se porte ouvert ou fermé"],
            "Coton et viscose — proportions à confirmer",
            "Lavage à 30 °C en filet, séchage à plat"),
        "seo_titre": "Gilet en maille ajourée — respirant",
        "seo_desc": "Gilet en maille ajourée, respirant et boutonné, coupe droite. "
                    "Retours gratuits sous 14 jours.",
    },
]


def variantes(options):
    """Produit toutes les combinaisons d'options, dans l'ordre de Shopify."""
    combinaisons = [[]]
    for _, valeurs in options:
        combinaisons = [c + [v] for c in combinaisons for v in valeurs]
    return combinaisons


def lignes_produit(produit):
    """Une ligne par variante ; seule la première porte les champs produit."""
    noms = [nom for nom, _ in produit["options"]]
    lignes = []

    for index, combinaison in enumerate(variantes(produit["options"])):
        ligne = {c: "" for c in COLONNES}
        ligne["Handle"] = produit["handle"]

        # Les champs produit ne se répètent pas : Shopify les lit sur la
        # première ligne du handle et ignore les suivantes.
        if index == 0:
            ligne.update({
                "Title": produit["titre"],
                "Body (HTML)": produit["corps"],
                "Vendor": "À REMPLACER — nom du fournisseur",
                "Product Category": produit["categorie"],
                "Type": produit["type"],
                "Tags": produit["tags"],
                "Published": "FALSE",
                "SEO Title": produit["seo_titre"],
                "SEO Description": produit["seo_desc"],
                "Google Shopping / Condition": "new",
                "Google Shopping / Custom Product": "FALSE",
                "Gift Card": "FALSE",
            })

        for rang, valeur in enumerate(combinaison, start=1):
            ligne["Option%d Name" % rang] = noms[rang - 1]
            ligne["Option%d Value" % rang] = valeur

        suffixe = "-".join(code(v) for v in combinaison)
        ligne.update({
            "Variant SKU": "%s-%s" % (produit["handle"][:12].upper(), suffixe),
            "Variant Grams": produit["grammes"],
            "Variant Inventory Tracker": "shopify",
            "Variant Inventory Qty": 0,
            "Variant Inventory Policy": "deny",
            "Variant Fulfillment Service": "manual",
            "Variant Price": produit["prix"],
            "Variant Requires Shipping": "TRUE",
            "Variant Taxable": "TRUE",
            "Variant Weight Unit": "g",
            "Status": "draft",
        })
        lignes.append(ligne)

    return lignes


def main():
    ecrivain = csv.DictWriter(sys.stdout, fieldnames=COLONNES,
                              lineterminator="\n", quoting=csv.QUOTE_MINIMAL)
    ecrivain.writeheader()
    for produit in PRODUITS:
        for ligne in lignes_produit(produit):
            ecrivain.writerow(ligne)


if __name__ == "__main__":
    main()
