"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FreshProduct = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  unit: string;
  price: number;
  description: string;
  icon: string;
  stock: "In stock" | "Limited" | "Unavailable";
  variant_options?: Array<{ name: string; price: number }>;
};

type CartItem = { id: string; productId?: string; name: string; price: number; quantity: number; image: string };
const cartStorageKey = "chophub-cart";

type ProductPhoto = { src: string; credit?: string; fileUrl?: string; license?: string; licenseUrl?: string };
const localPhoto = (fileName: string): ProductPhoto => ({ src: `/${fileName}` });
const commonsPhoto = (fileName: string, credit: string, license?: string, licenseUrl?: string): ProductPhoto => ({
  src: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=700`,
  credit,
  fileUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName.replaceAll(" ", "_"))}`,
  license,
  licenseUrl,
});

const productPhotos: Record<string, ProductPhoto> = {
  banana: localPhoto("banana.jpg"),
  plantain: localPhoto("ripe_plantain.jpeg"),
  ripePlantain: localPhoto("ripe_plantain.jpeg"),
  unripePlantain: localPhoto("unripe_plantain.webp"),
  orange: localPhoto("oranges.jpg"),
  lemon: commonsPhoto("Whole-Lemon.jpg", "Evan-Amos · Wikimedia Commons", "CC0", "https://creativecommons.org/publicdomain/zero/1.0/"),
  lime: commonsPhoto("Lime - whole and halved.jpg", "Ivar Leidus · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  tangerine: commonsPhoto("TangerineFruit.jpg", "Brent Ramerth · Wikimedia Commons", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"),
  grapefruit: commonsPhoto("Grapefruits - whole-halved-segments.jpg", "Ivar Leidus · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  assortedFruit: commonsPhoto("Assorted Fruits.jpg", "SIEBHONU · Wikimedia Commons · Nigeria", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  citrus: commonsPhoto("Citrus fruits.jpg", "Scott Bauer, USDA · Wikimedia Commons", "Public domain"),
  papaya: localPhoto("pawpaw.jpg"),
  mango: localPhoto("mango.jpg"),
  pineapple: commonsPhoto("Pineapple.jpg", "Renee Comet / NCI · Wikimedia Commons", "Public domain"),
  watermelon: localPhoto("watermelon_.jpeg"),
  grapes: localPhoto("Grapes-.jpg"),
  avocado: localPhoto("avocado-.jpeg"),
  apple: commonsPhoto("Apples in the supermarket.JPG", "Ehedaya · Wikimedia Commons", "Public domain"),
  berries: commonsPhoto("Strawberries.jpg", "Scott Bauer, USDA · Wikimedia Commons", "Public domain"),
  agbalumo: localPhoto("african_star_apple.jpg"),
  africanPear: localPhoto("african_pear.jpeg"),
  guava: localPhoto("guava-.jpg"),
  soursop: commonsPhoto("Soursop (muricata).png", "Gérard · Wikimedia Commons", "CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"),
  coconut: localPhoto("coconut.jpg"),
  icheku: commonsPhoto("Cheleku fruit.jpg", "Adimora Chidinma · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  tigernut: commonsPhoto("Dried tiger nut 1.jpg", "Achiri Bitamsimli · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  cashew: commonsPhoto("A ripe cashew fruit.jpg", "Dokev31 · Wikimedia Commons", "CC0"),
  breadfruit: commonsPhoto("Breadfruit.jpg", "Charles T. Scowen · Wikimedia Commons", "Public domain"),
  kiwi: commonsPhoto("Kiwi.jpg", "Renee Comet / NCI · Wikimedia Commons", "Public domain"),
  pomegranate: commonsPhoto("Fruit, pomegranate.jpg", "Renukarenu1861 · Wikimedia Commons", "CC0"),
  tomatoes: localPhoto("Tomatoes.jpg"),
  cherryTomatoes: localPhoto("cherry_tomatoes.jpeg"),
  onions: localPhoto("onion.jpg"),
  redOnion: localPhoto("red_onions.jpg"),
  whiteOnion: localPhoto("white-onion-.jpg"),
  ginger: localPhoto("fresh_ginger.jpg"),
  garlic: localPhoto("fresh_garlic.webp"),
  springOnion: localPhoto("spring_onion.jpeg"),
  bellPepper: commonsPhoto("Yellow and green Bell peppers.JPG", "Daderot · Wikimedia Commons", "Public domain"),
  greenBellPepper: commonsPhoto("Green-Bell-Pepper.jpg", "Evan-Amos · Wikimedia Commons", "Public domain"),
  redBellPepper: commonsPhoto("RedBellPepper.jpg", "Renee Comet / NCI · Wikimedia Commons", "Public domain"),
  yellowBellPepper: commonsPhoto("A yellow bell pepper.jpg", "Billjones94 · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  hotPepper: commonsPhoto("Fresh Tomatoes and pepper.jpg", "Eunice Ameh · Wikimedia Commons", "CC0"),
  scotchBonnet: localPhoto("Scotch_Bonnet.webp"),
  chiliPepper: localPhoto("chilli_pepper.jpeg"),
  tatashe: localPhoto("tatashe.jpg"),
  ugu: commonsPhoto("Ugu leaf at monday market 01.jpg", "Dorcas Atule · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  waterleaf: commonsPhoto("Talinum ..jpg", "PicsPro · Wikimedia Commons", "CC0"),
  bitterleaf: commonsPhoto("Bitter-leaf.jpg", "MaziIwu · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  ewedu: commonsPhoto("Jute leave plant A.K.A ewedu leaf.jpg", "Zmu'az4Z · Wikimedia Commons", "CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"),
  afang: localPhoto("afang.jpeg"),
  gardenEgg: commonsPhoto("Fresh African Garden Eggs.jpg", "Halima Waziri · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  okra: localPhoto("okro_.JPG"),
  cucumber: localPhoto("Cucumber-.jpg"),
  beetroot: commonsPhoto("Beet root vegetable.jpg", "Tshrinivasan · Wikimedia Commons", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"),
  radish: commonsPhoto("Radish (7856464484).jpg", "Dinesh Valke · Wikimedia Commons", "CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"),
  turnip: commonsPhoto("TurnipsInBasket.jpg", "Cacophony · Wikimedia Commons", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"),
  spinach: commonsPhoto("Fresh Spinach and Kale harvest at the farm.jpg", "Anitah Pezz · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  lettuce: commonsPhoto("Romaine lettuce.jpg", "USDA · Wikimedia Commons", "Public domain"),
  cabbage: localPhoto("greencabbage.jpg"),
  redCabbage: commonsPhoto("Red Cabbage.jpg", "SeanTwice · Wikimedia Commons", "CC0", "https://creativecommons.org/publicdomain/zero/1.0/"),
  zucchini: commonsPhoto("Picture of zucchini.jpg", "Nubelbariloe · Wikimedia Commons", "CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"),
  beans: localPhoto("green_beans.webp"),
  peas: commonsPhoto("Green peas.jpg", "Dunemaire · Wikimedia Commons", "CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0/"),
  broccoli: commonsPhoto("Broccoli vegetable.jpg", "Jon Sullivan · Wikimedia Commons", "Public domain"),
  cauliflower: commonsPhoto("Cauliflower broccoflower.jpg", "National Cancer Institute · Wikimedia Commons", "Public domain"),
  corn: commonsPhoto("Sweet corn.jpg", "Challiyil Eswaramangalath Vipin · Wikimedia Commons", "CC BY-SA 2.0", "https://creativecommons.org/licenses/by-sa/2.0/"),
  herbs: commonsPhoto("Fresh green basil leaves (54986224214).jpg", "Wikimedia Commons", "CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"),
  scentLeaf: localPhoto("scentleaf.jpg"),
  parsley: commonsPhoto("Parsley leaves.jpg", "Jeffery Martin · Wikimedia Commons", "CC0", "https://creativecommons.org/publicdomain/zero/1.0/"),
  cilantro: commonsPhoto("Cilantro leaf.jpg", "ZooFari · Wikimedia Commons", "Public domain"),
  mint: commonsPhoto("Fresh Mint leaves.jpg", "Mangosapiens · Wikimedia Commons", "CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"),
  chicken: localPhoto("chicken.jpg"),
  beef: localPhoto("Beef_.webp"),
  mackerel: localPhoto("mackerel.jpeg"),
  catfish: localPhoto("catfish.jpg"),
  eggplantOkra: commonsPhoto("Eggplant, banana peppers and giant okra.jpg", "Joi Ito · Wikimedia Commons", "CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/"),
  carrot: localPhoto("carrots-.jpeg"),
  sweetPotato: localPhoto("sweet_potatoes.webp"),
  eggs: localPhoto("chicken_eggs.jpg"),
  oha: localPhoto("oha.JPG"),
};

function photoForProduct(product: FreshProduct): ProductPhoto {
  if (/^(https?:\/\/|\/)/i.test(product.icon)) return { src: product.icon, credit: "Product image", fileUrl: product.icon };
  const name = `${product.id} ${product.name}`.toLowerCase();
  if (/unripe plantain/.test(name)) return productPhotos.unripePlantain;
  if (/ripe plantain/.test(name)) return productPhotos.ripePlantain;
  if (/plantain/.test(name)) return productPhotos.plantain;
  if (/cooking.?banana/.test(name)) return productPhotos.banana;
  if (/banana/.test(name)) return productPhotos.banana;
  if (/pawpaw|papaya/.test(name)) return productPhotos.papaya;
  if (/mango/.test(name)) return productPhotos.mango;
  if (/pineapple/.test(name)) return productPhotos.pineapple;
  if (/watermelon/.test(name)) return productPhotos.watermelon;
  if (/grape/.test(name)) return productPhotos.grapes;
  if (/strawberr|blueberr|raspberr/.test(name)) return productPhotos.berries;
  if (/avocado/.test(name)) return productPhotos.avocado;
  if (/agbalumo|star apple|udara/.test(name)) return productPhotos.agbalumo;
  if (/cashew/.test(name)) return productPhotos.cashew;
  if (/apple/.test(name)) return productPhotos.apple;
  if (/pomegranate/.test(name)) return productPhotos.pomegranate;
  if (/kiwi/.test(name)) return productPhotos.kiwi;
  if (/african pear|ube|safou/.test(name)) return productPhotos.africanPear;
  if (/guava/.test(name)) return productPhotos.guava;
  if (/soursop/.test(name)) return productPhotos.soursop;
  if (/coconut/.test(name)) return productPhotos.coconut;
  if (/icheku|velvet tamarind|awin/.test(name)) return productPhotos.icheku;
  if (/tiger nut|tigernut/.test(name)) return productPhotos.tigernut;
  if (/breadfruit/.test(name)) return productPhotos.breadfruit;
  if (/orange/.test(name)) return productPhotos.orange;
  if (/tangerine|mandarin/.test(name)) return productPhotos.tangerine;
  if (/grapefruit/.test(name)) return productPhotos.grapefruit;
  if (/lemon/.test(name)) return productPhotos.lemon;
  if (/lime/.test(name)) return productPhotos.lime;
  if (/cherry tomato/.test(name)) return productPhotos.cherryTomatoes;
  if (/tomato/.test(name)) return productPhotos.tomatoes;
  if (/spring onion|scallion|green onion/.test(name)) return productPhotos.springOnion;
  if (/white onion/.test(name)) return productPhotos.whiteOnion;
  if (/red onion/.test(name)) return productPhotos.redOnion;
  if (/onion|shallot/.test(name)) return productPhotos.onions;
  if (/ginger/.test(name)) return productPhotos.ginger;
  if (/garlic/.test(name)) return productPhotos.garlic;
  if (/garden egg|eggplant/.test(name)) return productPhotos.gardenEgg;
  if (/chicken egg|eggs/.test(name)) return productPhotos.eggs;
  if (/chicken|poultry/.test(name)) return productPhotos.chicken;
  if (/beef|meat/.test(name)) return productPhotos.beef;
  if (/catfish/.test(name)) return productPhotos.catfish;
  if (/mackerel/.test(name)) return productPhotos.mackerel;
  if (/cucumber/.test(name)) return productPhotos.cucumber;
  if (/beetroot|beet/.test(name)) return productPhotos.beetroot;
  if (/radish/.test(name)) return productPhotos.radish;
  if (/turnip/.test(name)) return productPhotos.turnip;
  if (/spinach/.test(name)) return productPhotos.spinach;
  if (/lettuce/.test(name)) return productPhotos.lettuce;
  if (/red cabbage/.test(name)) return productPhotos.redCabbage;
  if (/cabbage/.test(name)) return productPhotos.cabbage;
  if (/okra/.test(name)) return productPhotos.okra;
  if (/sweet potato/.test(name)) return productPhotos.sweetPotato;
  if (/scotch bonnet|ata rodo/.test(name)) return productPhotos.scotchBonnet;
  if (/chili|chilli/.test(name)) return productPhotos.chiliPepper;
  if (/tatashe/.test(name)) return productPhotos.tatashe;
  if (/pepper|tatashe|rodo/.test(name)) {
    if (/red bell/.test(name)) return productPhotos.redBellPepper;
    if (/yellow bell/.test(name)) return productPhotos.yellowBellPepper;
    if (/green bell/.test(name)) return productPhotos.greenBellPepper;
    return /bell/.test(name) ? productPhotos.bellPepper : productPhotos.hotPepper;
  }
  if (/waterleaf/.test(name)) return productPhotos.waterleaf;
  if (/bitter.?leaf/.test(name)) return productPhotos.bitterleaf;
  if (/oha/.test(name)) return productPhotos.oha;
  if (/ugu|pumpkin leaf/.test(name)) return productPhotos.ugu;
  if (/ewedu/.test(name)) return productPhotos.ewedu;
  if (/afang/.test(name)) return productPhotos.afang;
  if (/scent leaf/.test(name)) return productPhotos.scentLeaf;
  if (/parsley/.test(name)) return productPhotos.parsley;
  if (/coriander|cilantro/.test(name)) return productPhotos.cilantro;
  if (/mint/.test(name)) return productPhotos.mint;
  if (/uziza|oha|herb|basil|rosemary|scent leaf|celery/.test(name)) return productPhotos.herbs;
  if (/carrot/.test(name)) return productPhotos.carrot;
  if (/green bean|beans/.test(name)) return productPhotos.beans;
  if (/pea/.test(name)) return productPhotos.peas;
  if (/zucchini|courgette/.test(name)) return productPhotos.zucchini;
  if (/broccoli/.test(name)) return productPhotos.broccoli;
  if (/cauliflower/.test(name)) return productPhotos.cauliflower;
  if (/corn/.test(name)) return productPhotos.corn;
  if (/leafy green|leaf/.test(name)) return productPhotos.ugu;
  const category = product.category.toLowerCase();
  if (category === "fruits") return productPhotos.assortedFruit;
  if (category === "roots & tubers") return productPhotos.carrot;
  if (category === "leafy greens" || category === "nigerian local greens") return productPhotos.ugu;
  if (category === "peppers") return productPhotos.hotPepper;
  if (category === "onions & aromatics") return productPhotos.onions;
  if (category === "tomatoes") return productPhotos.tomatoes;
  if (category === "salad vegetables") return productPhotos.cucumber;
  if (category === "fresh vegetables") return productPhotos.okra;
  if (category === "fresh herbs") return productPhotos.herbs;
  if (category === "meat & poultry") return productPhotos.chicken;
  if (category === "fish & seafood") return productPhotos.mackerel;
  if (category === "eggs & dairy") return productPhotos.eggs;
  return productPhotos.tomatoes;
}

const products: FreshProduct[] = [
  { id: "fresh-bananas", name: "Bananas", category: "Fruits", unit: "1 bunch", price: 2500, description: "Ripe, sweet bananas for home or office.", icon: "🍌", stock: "In stock" },
  { id: "fresh-oranges", name: "Oranges", category: "Fruits", unit: "1 dozen", price: 3500, description: "Juicy seasonal oranges.", icon: "🍊", stock: "In stock" },
  { id: "fresh-pawpaw", name: "Pawpaw", category: "Fruits", unit: "1 piece", price: 2500, description: "Fresh ripe pawpaw selected for you.", icon: "🥭", stock: "Limited" },
  { id: "fresh-mango", name: "Mango", category: "Fruits", unit: "1 kg", price: 2200, description: "Sweet, juicy seasonal tropical fruit, best fresh or blended.", icon: "🥭", stock: "In stock" },
  { id: "fresh-pineapple", name: "Pineapple", category: "Fruits", unit: "1 piece", price: 2000, description: "Sweet-tart tropical fruit, great fresh or for juice.", icon: "🍍", stock: "In stock" },
  { id: "fresh-watermelon", name: "Watermelon", category: "Fruits", unit: "1 piece", price: 3500, description: "Large, juicy, hydrating fruit popular in the hot season.", icon: "🍉", stock: "In stock" },
  { id: "fresh-agbalumo", name: "African Star Apple (Agbalumo / Udara)", category: "Fruits", unit: "1 basket", price: 2500, description: "Seasonal orange-skinned fruit with sweet-tart pulp and chewy skin.", icon: "🟠", stock: "In stock" },
  { id: "fresh-ube", name: "African Pear (Ube)", category: "Fruits", unit: "1 basket", price: 2800, description: "Soft, oily fruit usually softened in hot water or roasted before eating.", icon: "🟤", stock: "In stock" },
  { id: "fresh-guava", name: "Guava", category: "Fruits", unit: "1 kg", price: 2000, description: "Fragrant, slightly grainy fruit with pink or white flesh, rich in vitamin C.", icon: "🍈", stock: "In stock" },
  { id: "fresh-soursop", name: "Soursop", category: "Fruits", unit: "1 piece", price: 3000, description: "Large, spiky green fruit with creamy, tangy-sweet flesh, great for juices and smoothies.", icon: "🥝", stock: "In stock" },
  { id: "fresh-coconut", name: "Coconut", category: "Fruits", unit: "1 piece", price: 1500, description: "Hard-shelled tropical fruit with refreshing water and rich white flesh.", icon: "🥥", stock: "In stock" },
  { id: "fresh-icheku", name: "Velvet Tamarind (Icheku / Awin)", category: "Fruits", unit: "1 pack", price: 1000, description: "Small, dark, sticky-sweet fruit sold in packs; a popular snack.", icon: "🟤", stock: "In stock" },
  { id: "fresh-tigernut", name: "Tiger Nut (Aya / Ofio)", category: "Fruits", unit: "1 pack", price: 1200, description: "Small, chewy, nut-like tuber with a sweet taste, popular for snacks and drinks.", icon: "🌰", stock: "In stock" },
  { id: "fresh-cashew-apple", name: "Cashew Apple", category: "Fruits", unit: "1 pack", price: 1500, description: "Juicy, tart-sweet fruit attached to the cashew nut; highly seasonal.", icon: "🍎", stock: "In stock" },
  { id: "fresh-lime", name: "Lime", category: "Fruits", unit: "1 pack", price: 1000, description: "Small, very sour citrus used for drinks, seasoning, and freshness.", icon: "🍋", stock: "In stock" },
  { id: "fresh-tangerine", name: "Tangerine / Mandarin", category: "Fruits", unit: "1 dozen", price: 3000, description: "Easy-to-peel sweet citrus, often preferred over regular oranges.", icon: "🍊", stock: "In stock" },
  { id: "fresh-grapefruit", name: "Grapefruit", category: "Fruits", unit: "1 kg", price: 2500, description: "Larger citrus with a bittersweet taste, available in white and red varieties.", icon: "🍊", stock: "In stock" },
  { id: "fresh-avocado", name: "Avocado", category: "Fruits", unit: "1 kg", price: 3000, description: "Creamy, nutrient-dense fruit (also called \"pear\"), popular for smoothies and spreads.", icon: "🥑", stock: "In stock" },
  { id: "fresh-breadfruit", name: "Breadfruit", category: "Fruits", unit: "1 piece", price: 2500, description: "Large, starchy fruit usually cooked; more common in certain regions.", icon: "🟤", stock: "In stock" },
  { id: "fresh-apple", name: "Apple (Red / Green)", category: "Fruits", unit: "1 kg", price: 3500, description: "Crisp, imported fruit available in most urban markets and stores.", icon: "🍎", stock: "In stock" },
  { id: "fresh-grapes", name: "Grapes", category: "Fruits", unit: "1 pack", price: 4000, description: "Sweet or slightly tart clusters, usually imported and sold in packs.", icon: "🍇", stock: "In stock" },
  { id: "fresh-strawberry", name: "Strawberry", category: "Fruits", unit: "1 pack", price: 3500, description: "Soft, sweet red berries sold in small packs (mostly imported or greenhouse-grown).", icon: "🍓", stock: "In stock" },
  { id: "fresh-kiwi", name: "Kiwi", category: "Fruits", unit: "1 pack", price: 3000, description: "Fuzzy-skinned fruit with bright green, tangy flesh.", icon: "🥝", stock: "In stock" },
  { id: "fresh-pomegranate", name: "Pomegranate", category: "Fruits", unit: "1 piece", price: 4500, description: "Seedy fruit with juicy, sweet-tart arils; often sold as a premium item.", icon: "🟣", stock: "In stock" },
  { id: "fresh-lemon", name: "Lemon", category: "Fruits", unit: "1 pack", price: 2000, description: "Sour citrus, usually imported; used mainly for drinks and cooking.", icon: "🍋", stock: "In stock" },
  { id: "fresh-plum", name: "Plum", category: "Fruits", unit: "1 pack", price: 3500, description: "Soft, sweet stone fruit available seasonally in better markets.", icon: "🟣", stock: "In stock" },
  { id: "fresh-tomatoes", name: "Tomatoes", category: "Tomatoes", unit: "1 kg", price: 3500, description: "Fresh tomatoes for sauces, stews, and salads.", icon: "🍅", stock: "In stock" },
  { id: "fresh-cherry-tomatoes", name: "Cherry Tomatoes", category: "Tomatoes", unit: "1 pack", price: 2500, description: "Small, sweet tomatoes for salads and snacking.", icon: "🍅", stock: "In stock" },
  { id: "fresh-onions", name: "Onions", category: "Onions & Aromatics", unit: "1 kg", price: 2800, description: "Crisp onions for everyday cooking.", icon: "🧅", stock: "In stock" },
  { id: "fresh-red-onion", name: "Red Onion", category: "Onions & Aromatics", unit: "1 kg", price: 3000, description: "Sharp, colourful onion for salads and stews.", icon: "🧅", stock: "In stock" },
  { id: "fresh-spring-onion", name: "Spring Onion", category: "Onions & Aromatics", unit: "1 bunch", price: 800, description: "Mild, fresh onion greens for garnish and stir-fry.", icon: "🧅", stock: "In stock" },
  { id: "fresh-shallots", name: "Shallots", category: "Onions & Aromatics", unit: "1 pack", price: 1500, description: "Small, mild onions with a delicate flavour.", icon: "🧅", stock: "In stock" },
  { id: "fresh-ginger", name: "Fresh Ginger", category: "Onions & Aromatics", unit: "1 kg", price: 2000, description: "Aromatic root for seasoning, drinks, and cooking.", icon: "🫚", stock: "In stock" },
  { id: "fresh-garlic", name: "Fresh Garlic", category: "Onions & Aromatics", unit: "1 kg", price: 2500, description: "Everyday aromatic used in most Nigerian dishes.", icon: "🧄", stock: "In stock" },
  { id: "fresh-ugu", name: "Ugu Leaves (Ugwu)", category: "Nigerian Local Greens", unit: "1 bunch", price: 1200, description: "Fresh fluted pumpkin leaves for soups.", icon: "🌿", stock: "In stock" },
  { id: "fresh-waterleaf", name: "Waterleaf", category: "Nigerian Local Greens", unit: "1 bunch", price: 1000, description: "Soft, leafy green used in soups and stews.", icon: "🌿", stock: "In stock" },
  { id: "fresh-bitterleaf", name: "Bitter Leaf", category: "Nigerian Local Greens", unit: "1 bunch", price: 1200, description: "Traditional bitter leaf, washed or unwashed, for soup.", icon: "🌿", stock: "In stock" },
  { id: "fresh-ewedu", name: "Ewedu", category: "Nigerian Local Greens", unit: "1 bunch", price: 1000, description: "Jute leaves for the classic ewedu soup.", icon: "🌿", stock: "In stock" },
  { id: "fresh-uziza", name: "Uziza Leaves", category: "Nigerian Local Greens", unit: "1 bunch", price: 1000, description: "Peppery leaves used to season soups.", icon: "🌿", stock: "In stock" },
  { id: "fresh-oha-leaves", name: "Oha Leaves", category: "Nigerian Local Greens", unit: "1 bunch", price: 1500, description: "Traditional leaves for Oha soup.", icon: "🌿", stock: "In stock" },
  { id: "fresh-afang-leaves", name: "Afang Leaves", category: "Nigerian Local Greens", unit: "1 bunch", price: 2000, description: "Shredded afang leaves for Afang soup.", icon: "🌿", stock: "In stock" },
  { id: "fresh-plantain", name: "Ripe Plantain", category: "Plantain & Cooking Banana", unit: "1 kg", price: 3000, description: "Sweet ripe plantain for frying and cooking.", icon: "🍌", stock: "In stock" },
  { id: "fresh-unripe-plantain", name: "Unripe Plantain", category: "Plantain & Cooking Banana", unit: "1 kg", price: 2800, description: "Firm, green plantain for boiling and porridge.", icon: "🍌", stock: "In stock" },
  { id: "fresh-cooking-banana", name: "Cooking Banana", category: "Plantain & Cooking Banana", unit: "1 kg", price: 2000, description: "Starchy banana variety used for cooking.", icon: "🍌", stock: "In stock" },
  { id: "fresh-carrot", name: "Carrots", category: "Roots & Tubers", unit: "1 kg", price: 1500, description: "Crisp, sweet carrots for cooking and salads.", icon: "🥕", stock: "In stock" },
  { id: "fresh-beetroot", name: "Beetroot", category: "Roots & Tubers", unit: "1 kg", price: 2000, description: "Earthy root vegetable for salads and juice.", icon: "🥔", stock: "In stock" },
  { id: "fresh-radish", name: "Radish", category: "Roots & Tubers", unit: "1 kg", price: 1500, description: "Crunchy, peppery root for salads.", icon: "🥔", stock: "In stock" },
  { id: "fresh-turnip", name: "Turnip", category: "Roots & Tubers", unit: "1 kg", price: 1500, description: "Mild root vegetable for soups and stews.", icon: "🥔", stock: "In stock" },
  { id: "fresh-sweet-potato", name: "Sweet Potato", category: "Roots & Tubers", unit: "1 kg", price: 1800, description: "Naturally sweet tuber, boiled, fried, or roasted.", icon: "🍠", stock: "In stock" },
  { id: "fresh-green-cabbage", name: "Green Cabbage", category: "Leafy Greens", unit: "1 piece", price: 1200, description: "Crisp cabbage for salads, stir-fry, and stews.", icon: "🥬", stock: "In stock" },
  { id: "fresh-red-cabbage", name: "Red Cabbage", category: "Leafy Greens", unit: "1 piece", price: 1500, description: "Colourful cabbage for salads and slaw.", icon: "🥬", stock: "In stock" },
  { id: "fresh-spinach", name: "Spinach", category: "Leafy Greens", unit: "1 bunch", price: 1200, description: "Tender spinach leaves for soups and side dishes.", icon: "🥬", stock: "In stock" },
  { id: "fresh-green-bell-pepper", name: "Green Bell Pepper", category: "Peppers", unit: "1 kg", price: 2000, description: "Mild, crisp pepper for stews and stir-fry.", icon: "🫑", stock: "In stock" },
  { id: "fresh-red-bell-pepper", name: "Red Bell Pepper", category: "Peppers", unit: "1 kg", price: 2500, description: "Sweet, colourful pepper for sauces and stews.", icon: "🫑", stock: "In stock" },
  { id: "fresh-yellow-bell-pepper", name: "Yellow Bell Pepper", category: "Peppers", unit: "1 kg", price: 2500, description: "Bright, sweet pepper for cooking and salads.", icon: "🫑", stock: "In stock" },
  { id: "fresh-scotch-bonnet", name: "Scotch Bonnet (Ata Rodo)", category: "Peppers", unit: "1 kg", price: 3000, description: "Hot pepper essential for Nigerian stews and sauces.", icon: "🌶️", stock: "In stock" },
  { id: "fresh-chili-pepper", name: "Fresh Chili Pepper", category: "Peppers", unit: "1 kg", price: 2500, description: "Small, spicy peppers for seasoning.", icon: "🌶️", stock: "In stock" },
  { id: "fresh-tatashe", name: "Tatashe", category: "Peppers", unit: "1 kg", price: 2500, description: "Sweet red pepper used as the base for stews.", icon: "🌶️", stock: "In stock" },
  { id: "fresh-cucumber", name: "Cucumber", category: "Salad Vegetables", unit: "1 kg", price: 1500, description: "Cool, crisp cucumber for salads and snacking.", icon: "🥒", stock: "In stock" },
  { id: "fresh-lettuce", name: "Lettuce", category: "Salad Vegetables", unit: "1 piece", price: 1500, description: "Fresh, crisp lettuce for salads and sandwiches.", icon: "🥬", stock: "In stock" },
  { id: "fresh-garden-egg", name: "Garden Egg (Eggplant)", category: "Fresh Vegetables", unit: "1 kg", price: 1800, description: "Traditional garden egg for snacking or sauce.", icon: "🍆", stock: "In stock" },
  { id: "fresh-okra", name: "Okra", category: "Fresh Vegetables", unit: "1 kg", price: 2000, description: "Fresh okra for soups and stews.", icon: "🫛", stock: "In stock" },
  { id: "fresh-green-beans", name: "Green Beans", category: "Fresh Vegetables", unit: "1 kg", price: 2000, description: "Crisp green beans for stir-fry and sides.", icon: "🫛", stock: "In stock" },
  { id: "fresh-peas", name: "Peas", category: "Fresh Vegetables", unit: "1 kg", price: 2500, description: "Sweet, tender peas for rice and stews.", icon: "🫛", stock: "In stock" },
  { id: "fresh-zucchini", name: "Zucchini", category: "Fresh Vegetables", unit: "1 kg", price: 2500, description: "Mild summer squash for grilling and stews.", icon: "🥒", stock: "In stock" },
  { id: "fresh-broccoli", name: "Broccoli", category: "Fresh Vegetables", unit: "1 kg", price: 3000, description: "Nutrient-rich vegetable for steaming and stir-fry.", icon: "🥦", stock: "In stock" },
  { id: "fresh-cauliflower", name: "Cauliflower", category: "Fresh Vegetables", unit: "1 piece", price: 2500, description: "Versatile vegetable for rice, soups, and roasting.", icon: "🥦", stock: "In stock" },
  { id: "fresh-sweet-corn", name: "Sweet Corn", category: "Fresh Vegetables", unit: "1 pack", price: 1500, description: "Sweet corn for boiling, roasting, or salads.", icon: "🌽", stock: "In stock" },
  { id: "fresh-parsley", name: "Parsley", category: "Fresh Herbs", unit: "1 bunch", price: 1000, description: "Fresh herb for garnish and seasoning.", icon: "🌿", stock: "In stock" },
  { id: "fresh-coriander", name: "Coriander / Cilantro", category: "Fresh Herbs", unit: "1 bunch", price: 1000, description: "Fragrant herb for garnish and sauces.", icon: "🌿", stock: "In stock" },
  { id: "fresh-mint", name: "Mint", category: "Fresh Herbs", unit: "1 bunch", price: 1000, description: "Refreshing herb for drinks and garnish.", icon: "🌿", stock: "In stock" },
  { id: "fresh-basil", name: "Basil", category: "Fresh Herbs", unit: "1 bunch", price: 1000, description: "Aromatic herb for cooking and garnish.", icon: "🌿", stock: "In stock" },
  { id: "fresh-rosemary", name: "Rosemary", category: "Fresh Herbs", unit: "1 bunch", price: 1000, description: "Fragrant herb for roasts and seasoning.", icon: "🌿", stock: "In stock" },
  { id: "fresh-celery", name: "Celery", category: "Fresh Herbs", unit: "1 bunch", price: 1200, description: "Crisp stalks for soups, juice, and seasoning.", icon: "🌿", stock: "In stock" },
  { id: "fresh-scent-leaf", name: "Scent Leaf", category: "Fresh Herbs", unit: "1 bunch", price: 1000, description: "Aromatic Nigerian herb used in soups and pepper soup.", icon: "🌿", stock: "In stock" },
  { id: "fresh-chicken", name: "Chicken", category: "Meat & Poultry", unit: "1 kg", price: 6500, description: "Cleaned chicken prepared for cooking.", icon: "🍗", stock: "Limited" },
  { id: "fresh-beef", name: "Beef", category: "Meat & Poultry", unit: "1 kg", price: 8500, description: "Fresh beef cuts for soups and stews.", icon: "🥩", stock: "In stock" },
  { id: "fresh-catfish", name: "Catfish", category: "Fish & Seafood", unit: "1 kg", price: 7500, description: "Fresh catfish cleaned to order.", icon: "🐟", stock: "In stock" },
  { id: "fresh-mackerel", name: "Mackerel", category: "Fish & Seafood", unit: "1 kg", price: 6500, description: "Fresh or frozen mackerel for family meals.", icon: "🐠", stock: "Limited" },
  { id: "fresh-eggs", name: "Chicken eggs", category: "Eggs & Dairy", unit: "1 crate", price: 5500, description: "Fresh eggs for breakfast and baking.", icon: "🥚", stock: "In stock" },
];

export default function FreshFoodPage() {
  const [catalogProducts, setCatalogProducts] = useState(products);
  const categories = useMemo(() => ["All", ...Array.from(new Set(catalogProducts.map((product) => product.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))], [catalogProducts]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const subcategories = useMemo(() => ["All", ...Array.from(new Set(catalogProducts.filter((product) => product.category === selectedCategory).map((product) => (product.subcategory || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))], [catalogProducts, selectedCategory]);
  const [showCategories, setShowCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return catalogProducts.filter((product) => {
        const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
        const matchesSubcategory = selectedSubcategory === "All" || product.subcategory === selectedSubcategory;
        const matchesSearch = !query || `${product.name} ${product.category} ${product.subcategory || ""} ${product.description}`.toLowerCase().includes(query);
        return matchesCategory && matchesSubcategory && matchesSearch;
    });
    }, [catalogProducts, searchQuery, selectedCategory, selectedSubcategory]);

  useEffect(() => {
    fetch("/api/products?section=fresh-food", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load Fresh Food products");
        return response.json();
      })
      .then((databaseProducts: Array<Record<string, unknown>>) => {
        if (databaseProducts.length > 0) {
          setCatalogProducts(databaseProducts.map((product) => ({
            id: String(product.id),
            name: String(product.name),
            category: String(product.category),
            subcategory: String(product.subcategory || ""),
            unit: String(product.unit),
            price: Number(product.price),
            description: String(product.description),
            icon: String(product.image || "🥬"),
            stock: product.stock_status === "limited" ? "Limited" : product.stock_status === "unavailable" ? "Unavailable" : "In stock",
            variant_options: Array.isArray(product.variant_options) ? product.variant_options as FreshProduct["variant_options"] : [],
          })));
        }
      })
      .catch(() => undefined);
  }, []);

  const addToCart = (product: FreshProduct, selectedOption?: { name: string; price: number }) => {
    const stored = window.localStorage.getItem(cartStorageKey);
    const cart: CartItem[] = stored ? JSON.parse(stored) : [];
    const variants = product.variant_options || [];
    const cartId = selectedOption && variants.length > 1 ? `${product.id}::option-${encodeURIComponent(selectedOption.name)}` : product.id;
    const itemName = `${product.name} (${selectedOption?.name || product.unit})`;
    const existing = cart.find((item) => item.id === cartId);
    const nextCart = existing
      ? cart.map((item) => item.id === cartId ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cart, { id: cartId, productId: product.id, name: itemName, price: selectedOption?.price ?? product.price, quantity: 1, image: photoForProduct(product).src }];
    window.localStorage.setItem(cartStorageKey, JSON.stringify(nextCart));
    window.dispatchEvent(new Event("chophub-cart-updated"));
    setCartCount(nextCart.reduce((total, item) => total + item.quantity, 0));
    setAddedProductId(product.id);
    window.setTimeout(() => setAddedProductId(null), 1600);
  };

  return (
    <main className="min-h-screen bg-emerald-50 text-gray-900">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <Link href="/" className="text-xl font-extrabold text-green-800">ChopHub</Link>
          <Link href="/" className="text-sm font-semibold text-green-700 hover:text-green-900">Change section</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">ChopHub Fresh Food</p>
          <h1 className="mt-3 text-4xl font-bold text-emerald-950">Fresh for your kitchen</h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-700">Fruits, vegetables, meat, fish, and other fresh ingredients delivered to you.</p>
        </div>
        <form onSubmit={(event) => event.preventDefault()} className="mx-auto mt-8 flex max-w-2xl gap-2 rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm">
          <label htmlFor="fresh-food-search" className="sr-only">Search fresh food</label>
          <span className="flex items-center px-2 text-xl text-emerald-700" aria-hidden="true">⌕</span>
          <input id="fresh-food-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search fresh food..." className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none" />
          <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Search</button>
        </form>
        <div className="mt-8">
          <button type="button" onClick={() => setShowCategories((open) => !open)} aria-expanded={showCategories} className="flex w-full items-center justify-between rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-left text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50">
            <span>{selectedCategory === "All" ? "Browse fresh food categories" : selectedSubcategory === "All" ? selectedCategory : `${selectedCategory} · ${selectedSubcategory}`}</span>
            <span aria-hidden="true">{showCategories ? "⌃" : "⌄"}</span>
          </button>
          {showCategories && <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => { setSelectedCategory(category); setSelectedSubcategory("All"); }} className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ${selectedCategory === category ? "bg-emerald-600 text-white" : "text-emerald-900 hover:bg-emerald-50"}`}>
                {category}
              </button>
            ))}
            {selectedCategory !== "All" && subcategories.length > 1 && <div className="col-span-full flex flex-wrap gap-2 border-t border-emerald-100 pt-3">{subcategories.map((subcategory) => <button key={subcategory} type="button" onClick={() => { setSelectedSubcategory(subcategory); setShowCategories(false); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedSubcategory === subcategory ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-200 text-emerald-900 hover:bg-emerald-50"}`}>{subcategory === "All" ? `All ${selectedCategory}` : subcategory}</button>)}</div>}
          </div>}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => {
            const productPhoto = photoForProduct(product);
            return (
            <article key={product.id} className={`rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm ${product.stock === "Unavailable" ? "opacity-70" : ""}`}>
              <div className="h-36 overflow-hidden rounded-xl bg-emerald-50 sm:h-40">
                <img
                  src={productPhoto.src}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
                />
              </div>
              {productPhoto.credit && productPhoto.fileUrl && <div className="mt-1 flex min-h-4 items-center gap-1 text-[9px] text-gray-400">
                <a href={productPhoto.fileUrl} target="_blank" rel="noreferrer" className="truncate hover:text-gray-600 hover:underline">
                  Photo: {productPhoto.credit}
                </a>
                {productPhoto.license && productPhoto.licenseUrl && <a href={productPhoto.licenseUrl} target="_blank" rel="noreferrer" className="shrink-0 hover:text-gray-600 hover:underline">{productPhoto.license}</a>}
                {productPhoto.license && !productPhoto.licenseUrl && <span className="shrink-0">{productPhoto.license}</span>}
              </div>}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">{product.category}</p>
              {product.subcategory && <p className="mt-0.5 text-xs font-medium text-emerald-600">{product.subcategory}</p>}
              <h2 className="mt-1 font-bold text-emerald-950">{product.name}</h2>
              {product.variant_options?.length ? <label className="mt-2 block text-xs font-medium text-gray-600">Size or variety<select value={selectedVariants[product.id] ?? product.variant_options[0].name} onChange={(event) => setSelectedVariants((current) => ({ ...current, [product.id]: event.target.value }))} aria-label={`Choose size or variety for ${product.name}`} className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-sm text-emerald-950">{product.variant_options.map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}</select></label> : null}
              <p className="mt-1 text-xs text-gray-500">Price per {product.unit}</p>
              <p className="mt-2 text-xs text-gray-600">{product.description}</p>
              <p className={`mt-2 text-xs font-semibold ${product.stock === "In stock" ? "text-emerald-600" : product.stock === "Limited" ? "text-amber-600" : "text-red-600"}`}>{product.stock}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="font-bold text-emerald-800">₦{(product.variant_options?.find((option) => option.name === selectedVariants[product.id]) || product.variant_options?.[0])?.price.toLocaleString() || product.price.toLocaleString()}</span>
                <button type="button" disabled={product.stock === "Unavailable"} onClick={() => {
                  const selectedOption = product.variant_options?.find((option) => option.name === selectedVariants[product.id]) || product.variant_options?.[0];
                  addToCart(product, selectedOption);
                }} className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
                  {product.stock === "Unavailable" ? "Unavailable" : addedProductId === product.id ? "Added ✓" : "Add"}
                </button>
              </div>
            </article>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-600">{cartCount > 0 ? `${cartCount} item${cartCount === 1 ? "" : "s"} added to your ChopHub cart.` : "Select fresh products to add them to your ChopHub cart."}</p>
          <Link href="/cooked-food#cart" className="mt-4 inline-block rounded-full bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">Continue to checkout</Link>
        </div>
      </section>
    </main>
  );
}
