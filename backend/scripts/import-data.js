#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { compileStrapi, createStrapi } = require('@strapi/strapi');

const BACKEND_DIR = path.resolve(__dirname, '..');
const DEFAULT_MENU_FILE = path.resolve(
  BACKEND_DIR,
  '..',
  'frontend',
  'src',
  'data',
  'menu.ts'
);
const MENU_FILE = process.env.MENU_DATA_FILE
  ? path.resolve(process.env.MENU_DATA_FILE)
  : DEFAULT_MENU_FILE;

const UIDS = {
  product: process.env.STRAPI_IMPORT_PRODUCT_UID || 'api::product.product',
  menuSection:
    process.env.STRAPI_IMPORT_MENU_SECTION_UID ||
    'api::menu-section.menu-section',
  heroSlide:
    process.env.STRAPI_IMPORT_HERO_SLIDE_UID || 'api::hero-slide.hero-slide',
  contactInfo:
    process.env.STRAPI_IMPORT_CONTACT_INFO_UID ||
    'api::contact-info.contact-info',
  siteSetting:
    process.env.STRAPI_IMPORT_SITE_SETTING_UID ||
    'api::site-setting.site-setting',
};

const REQUIRED_ATTRIBUTES = {
  [UIDS.product]: [
    'externalId',
    'name',
    'weight',
    'price',
    'sortOrder',
    'description',
    'image',
    'menuSection',
  ],
  [UIDS.menuSection]: ['slug', 'title', 'sortOrder', 'products'],
  [UIDS.heroSlide]: ['sourceKey', 'title', 'text', 'image', 'sortOrder'],
  [UIDS.contactInfo]: [
    'phone',
    'phoneHref',
    'whatsapp',
    'instagram',
    'email',
    'address',
    'hours',
    'deliveryHours',
    'mapEmbed',
    'mapUrl',
    'requisites',
  ],
  [UIDS.siteSetting]: ['minOrder', 'extraData'],
};

function loadFrontendData(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Frontend data file was not found: ${filePath}`);
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  });

  const moduleRef = { exports: {} };
  const sandbox = {
    module: moduleRef,
    exports: moduleRef.exports,
    require(request) {
      throw new Error(
        `Unsupported import "${request}" in ${filePath}. Keep the migration data file self-contained.`
      );
    },
  };

  vm.runInNewContext(output.outputText, sandbox, {
    filename: filePath,
    displayErrors: true,
  });

  return moduleRef.exports;
}

function validateFrontendData(data) {
  const { menuSections, heroSlides, contactInfo, MIN_ORDER } = data;

  if (!Array.isArray(menuSections)) {
    throw new Error('menuSections must be an array.');
  }

  if (!Array.isArray(heroSlides)) {
    throw new Error('heroSlides must be an array.');
  }

  if (!contactInfo || typeof contactInfo !== 'object') {
    throw new Error('contactInfo must be an object.');
  }

  if (!Number.isInteger(MIN_ORDER)) {
    throw new Error('MIN_ORDER must be an integer.');
  }

  const productIds = new Set();
  const sectionIds = new Set();

  for (const section of menuSections) {
    if (!section.id || !section.title || !Array.isArray(section.products)) {
      throw new Error(`Invalid menu section: ${JSON.stringify(section)}`);
    }

    if (sectionIds.has(section.id)) {
      throw new Error(`Duplicate menu section id: ${section.id}`);
    }

    sectionIds.add(section.id);

    for (const product of section.products) {
      if (
        !product.id ||
        !product.name ||
        !Number.isInteger(product.price) ||
        typeof product.description !== 'string'
      ) {
        throw new Error(`Invalid product: ${JSON.stringify(product)}`);
      }

      if (productIds.has(product.id)) {
        throw new Error(`Duplicate product id: ${product.id}`);
      }

      productIds.add(product.id);
    }
  }
}

function assertContentTypes(strapi) {
  const missingUids = Object.values(UIDS).filter((uid) => !strapi.contentTypes[uid]);

  if (missingUids.length > 0) {
    throw new Error(
      [
        'Required Strapi content-types are missing:',
        ...missingUids.map((uid) => `- ${uid}`),
        'Run this script from the backend project that contains these schemas, then try again.',
      ].join('\n')
    );
  }

  for (const [uid, attributes] of Object.entries(REQUIRED_ATTRIBUTES)) {
    const schemaAttributes = strapi.contentTypes[uid].attributes || {};
    const missingAttributes = attributes.filter((name) => !schemaAttributes[name]);

    if (missingAttributes.length > 0) {
      throw new Error(
        [
          `Content-type ${uid} is missing required attributes:`,
          ...missingAttributes.map((name) => `- ${name}`),
        ].join('\n')
      );
    }
  }
}

function statusParams(strapi, uid) {
  const contentType = strapi.contentTypes[uid];

  return contentType?.options?.draftAndPublish === true
    ? { status: 'published' }
    : {};
}

async function upsertCollectionDocument(strapi, uid, filters, data) {
  const documents = strapi.documents(uid);
  const existing = await documents.findFirst({
    filters,
    ...statusParams(strapi, uid),
  });

  if (existing) {
    const entry = await documents.update({
      documentId: existing.documentId,
      data,
      ...statusParams(strapi, uid),
    });

    return { action: 'updated', entry };
  }

  const entry = await documents.create({
    data,
    ...statusParams(strapi, uid),
  });

  return { action: 'created', entry };
}

async function upsertSingleDocument(strapi, uid, data) {
  const documents = strapi.documents(uid);
  const existing = await documents.findFirst(statusParams(strapi, uid));

  if (existing) {
    const entry = await documents.update({
      documentId: existing.documentId,
      data,
      ...statusParams(strapi, uid),
    });

    return { action: 'updated', entry };
  }

  const entry = await documents.create({
    data,
    ...statusParams(strapi, uid),
  });

  return { action: 'created', entry };
}

function buildProductData(product, sortOrder) {
  return {
    externalId: product.id,
    name: product.name,
    weight: product.weight || '',
    price: product.price,
    sortOrder,
    description: product.description,
    image: product.image || null,
  };
}

function buildExtraData(menuData) {
  const modeledExports = new Set([
    'menuSections',
    'heroSlides',
    'contactInfo',
    'MIN_ORDER',
  ]);

  return Object.fromEntries(
    Object.entries(menuData).filter(([key]) => !modeledExports.has(key))
  );
}

function increment(stats, bucket, action) {
  stats[bucket][action] += 1;
}

async function importData(strapi, menuData) {
  assertContentTypes(strapi);

  const { menuSections, heroSlides, contactInfo, MIN_ORDER } = menuData;
  const stats = {
    products: { created: 0, updated: 0 },
    menuSections: { created: 0, updated: 0 },
    heroSlides: { created: 0, updated: 0 },
    contactInfo: { created: 0, updated: 0 },
    siteSetting: { created: 0, updated: 0 },
    productLinks: { updated: 0 },
  };

  const productDocuments = new Map();

  for (const section of menuSections) {
    for (const [index, product] of section.products.entries()) {
      const result = await upsertCollectionDocument(
        strapi,
        UIDS.product,
        { externalId: { $eq: product.id } },
        buildProductData(product, index)
      );

      productDocuments.set(product.id, result.entry);
      increment(stats, 'products', result.action);
    }
  }

  const sectionDocuments = new Map();

  for (const [index, section] of menuSections.entries()) {
    const result = await upsertCollectionDocument(
      strapi,
      UIDS.menuSection,
      { slug: { $eq: section.id } },
      {
        slug: section.id,
        title: section.title,
        sortOrder: index,
      }
    );

    sectionDocuments.set(section.id, result.entry);
    increment(stats, 'menuSections', result.action);
  }

  for (const section of menuSections) {
    const sectionDocument = sectionDocuments.get(section.id);

    for (const product of section.products) {
      const productDocument = productDocuments.get(product.id);

      await strapi.documents(UIDS.product).update({
        documentId: productDocument.documentId,
        data: {
          menuSection: sectionDocument.documentId,
        },
        ...statusParams(strapi, UIDS.product),
      });

      stats.productLinks.updated += 1;
    }
  }

  for (const [index, slide] of heroSlides.entries()) {
    const sourceKey = `hero-slide-${index + 1}`;
    const result = await upsertCollectionDocument(
      strapi,
      UIDS.heroSlide,
      { sourceKey: { $eq: sourceKey } },
      {
        sourceKey,
        title: slide.title,
        text: slide.text,
        image: slide.image,
        sortOrder: index,
      }
    );

    increment(stats, 'heroSlides', result.action);
  }

  const contactResult = await upsertSingleDocument(strapi, UIDS.contactInfo, {
    phone: contactInfo.phone,
    phoneHref: contactInfo.phoneHref,
    whatsapp: contactInfo.whatsapp,
    instagram: contactInfo.instagram || null,
    email: contactInfo.email,
    address: contactInfo.address,
    hours: contactInfo.hours,
    deliveryHours: contactInfo.deliveryHours,
    mapEmbed: contactInfo.mapEmbed,
    mapUrl: contactInfo.mapUrl,
    requisites: contactInfo.requisites || [],
  });
  increment(stats, 'contactInfo', contactResult.action);

  const siteSettingResult = await upsertSingleDocument(strapi, UIDS.siteSetting, {
    minOrder: MIN_ORDER,
    extraData: buildExtraData(menuData),
  });
  increment(stats, 'siteSetting', siteSettingResult.action);

  return stats;
}

function printStats(stats) {
  console.log('Import finished successfully.');
  console.log(
    `Products: ${stats.products.created} created, ${stats.products.updated} updated.`
  );
  console.log(
    `Menu sections: ${stats.menuSections.created} created, ${stats.menuSections.updated} updated.`
  );
  console.log(`Product links updated: ${stats.productLinks.updated}.`);
  console.log(
    `Hero slides: ${stats.heroSlides.created} created, ${stats.heroSlides.updated} updated.`
  );
  console.log(
    `Contact info: ${stats.contactInfo.created} created, ${stats.contactInfo.updated} updated.`
  );
  console.log(
    `Site settings: ${stats.siteSetting.created} created, ${stats.siteSetting.updated} updated.`
  );
}

async function main() {
  process.chdir(BACKEND_DIR);

  const menuData = loadFrontendData(MENU_FILE);
  validateFrontendData(menuData);

  const appContext = await compileStrapi({ appDir: BACKEND_DIR });
  const strapi = await createStrapi(appContext).load();

  try {
    const stats = await importData(strapi, menuData);
    printStats(stats);
  } finally {
    await strapi.destroy();
  }
}

main().catch((error) => {
  console.error('Import failed.');
  console.error(error);
  process.exit(1);
});
