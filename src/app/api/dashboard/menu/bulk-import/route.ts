import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

const VALID_DIET = ['VEG', 'NON_VEG', 'EGG', 'VEGAN'] as const;
const VALID_SPICY = ['NONE', 'MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

type ImportError = { row: number; field: string; message: string };
type ImportWarning = { row: number; message: string };

function parseBoolean(val: string, defaultVal: boolean): boolean {
  if (!val || val.trim() === '') return defaultVal;
  return val.trim().toLowerCase() === 'true';
}

function parseCSV(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines
    .filter((line) => line.trim() !== '')
    .map((line) => {
      // Simple CSV parser — handles quoted fields
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          fields.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      fields.push(current);
      return fields.map((f) => f.trim());
    });
}

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (!file.name.endsWith('.csv')) {
    return NextResponse.json({ error: 'Only CSV files are accepted' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 5 MB limit' }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length < 2) {
    return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });
  }

  // Parse header
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const requiredHeaders = ['name', 'price', 'category'];
  for (const rh of requiredHeaders) {
    if (!header.includes(rh)) {
      return NextResponse.json({ error: `Missing required CSV column: "${rh}"` }, { status: 400 });
    }
  }

  const col = (name: string) => header.indexOf(name);

  // Fetch all categories for this cafe once
  const categories = await prisma.category.findMany({
    where: { cafeId: cafe.id },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase().trim(), c.id]));

  // Fetch existing item names for duplicate detection
  const existingItems = await prisma.menuItem.findMany({
    where: { cafeId: cafe.id },
    select: { name: true },
  });
  const existingNames = new Set(existingItems.map((i) => i.name.toLowerCase().trim()));

  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  const toCreate: Parameters<typeof prisma.menuItem.create>[0]['data'][] = [];

  const dataRows = rows.slice(1);

  for (let idx = 0; idx < dataRows.length; idx++) {
    const rowNum = idx + 2; // 1-based, accounting for header
    const row = dataRows[idx];

    const get = (colName: string) => {
      const i = col(colName);
      return i >= 0 && i < row.length ? row[i].trim() : '';
    };

    const rowErrors: ImportError[] = [];

    // ── name ──────────────────────────────────────────────────────────────
    const name = get('name');
    if (!name) {
      rowErrors.push({ row: rowNum, field: 'name', message: 'Name is required' });
    }

    // ── price ─────────────────────────────────────────────────────────────
    const priceRaw = get('price');
    const price = parseFloat(priceRaw);
    if (!priceRaw || isNaN(price) || price <= 0) {
      rowErrors.push({ row: rowNum, field: 'price', message: 'Price must be a number greater than 0' });
    }

    // ── category ──────────────────────────────────────────────────────────
    const categoryName = get('category');
    const categoryId = categoryMap.get(categoryName.toLowerCase());
    if (!categoryName) {
      rowErrors.push({ row: rowNum, field: 'category', message: 'Category is required' });
    } else if (!categoryId) {
      rowErrors.push({
        row: rowNum,
        field: 'category',
        message: `Category "${categoryName}" not found. Create it in the menu manager first.`,
      });
    }

    // ── diet ──────────────────────────────────────────────────────────────
    const dietRaw = get('diet').toUpperCase();
    const diet = dietRaw || 'VEG';
    if (dietRaw && !VALID_DIET.includes(diet as any)) {
      rowErrors.push({
        row: rowNum,
        field: 'diet',
        message: `Invalid diet value "${dietRaw}". Must be one of: ${VALID_DIET.join(', ')}`,
      });
    }

    // ── spicy ─────────────────────────────────────────────────────────────
    const spicyRaw = get('spicy').toUpperCase();
    const spicy = spicyRaw || 'NONE';
    if (spicyRaw && !VALID_SPICY.includes(spicy as any)) {
      rowErrors.push({
        row: rowNum,
        field: 'spicy',
        message: `Invalid spicy value "${spicyRaw}". Must be one of: ${VALID_SPICY.join(', ')}`,
      });
    }

    // ── prepMinutes ───────────────────────────────────────────────────────
    const prepRaw = get('prepminutes');
    const prepMinutes = prepRaw ? parseInt(prepRaw, 10) : 15;
    if (prepRaw && (isNaN(prepMinutes) || prepMinutes < 0)) {
      rowErrors.push({ row: rowNum, field: 'prepMinutes', message: 'prepMinutes must be a non-negative number' });
    }

    // ── booleans ──────────────────────────────────────────────────────────
    const isAvailable = parseBoolean(get('isavailable'), true);
    const inStock = parseBoolean(get('instock'), true);
    const isPopular = parseBoolean(get('ispopular'), false);
    const isFeatured = parseBoolean(get('isfeatured'), false);

    // ── tags ──────────────────────────────────────────────────────────────
    const tagsRaw = get('tags');
    const tags = tagsRaw ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean) : [];

    // ── description ───────────────────────────────────────────────────────
    const description = get('description') || undefined;

    // ── imageUrl ──────────────────────────────────────────────────────────
    // Accept absolute http(s) URLs only — anything else is dropped with a
    // warning so a typo doesn't poison the menu page with broken <img>s.
    const imageUrlRaw = get('imageurl');
    let imageUrl: string | undefined;
    if (imageUrlRaw) {
      if (/^https?:\/\//i.test(imageUrlRaw)) {
        imageUrl = imageUrlRaw;
      } else {
        warnings.push({ row: rowNum, message: `imageUrl "${imageUrlRaw}" is not a valid http(s) URL — ignored` });
      }
    }

    // ── duplicate check ───────────────────────────────────────────────────
    if (name && existingNames.has(name.toLowerCase())) {
      warnings.push({ row: rowNum, message: `Item "${name}" already exists and will be imported as a duplicate` });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    toCreate.push({
      cafeId: cafe.id,
      categoryId: categoryId!,
      name,
      description,
      price,
      imageUrl,
      diet: diet as any,
      spicy: spicy as any,
      prepMinutes,
      isAvailable,
      inStock,
      isPopular,
      isFeatured,
      tags,
    });
  }

  // Bulk insert valid rows
  let imported = 0;
  if (toCreate.length > 0) {
    const result = await prisma.menuItem.createMany({
      data: toCreate as any,
      skipDuplicates: false,
    });
    imported = result.count;
  }

  return NextResponse.json({
    success: true,
    imported,
    errors,
    warnings,
  });
}
