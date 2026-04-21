import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FAVORITES_FILE = path.join(DATA_DIR, "favorites.json");

export interface FavoriteItem {
  vodId: number;
  vodName: string;
  vodPic: string;
  typeName: string;
  sourceId: string;
  sourceUrl: string;
  addedAt: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readFavorites(): FavoriteItem[] {
  ensureDataDir();
  if (!fs.existsSync(FAVORITES_FILE)) {
    fs.writeFileSync(FAVORITES_FILE, "[]", "utf-8");
    return [];
  }
  return JSON.parse(fs.readFileSync(FAVORITES_FILE, "utf-8"));
}

function writeFavorites(items: FavoriteItem[]) {
  ensureDataDir();
  fs.writeFileSync(FAVORITES_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function GET() {
  try {
    return NextResponse.json(readFavorites());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const item = (await request.json()) as Omit<FavoriteItem, "addedAt">;
    const items = readFavorites();
    if (!items.some((f) => f.vodId === item.vodId && f.sourceId === item.sourceId)) {
      items.unshift({ ...item, addedAt: new Date().toISOString() });
      writeFavorites(items);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { vodId, sourceId } = (await request.json()) as { vodId: number; sourceId: string };
    const items = readFavorites().filter(
      (f) => !(f.vodId === vodId && f.sourceId === sourceId)
    );
    writeFavorites(items);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
