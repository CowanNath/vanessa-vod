import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { dataDir, ensureDataDir } from "../../../lib/storage-paths";

const HISTORY_FILE = path.join(dataDir, "history.json");
const HISTORY_LIMIT = 200;

export interface HistoryItem {
  vodId: number;
  vodName: string;
  vodPic: string;
  typeName: string;
  sourceId: string;
  sourceUrl: string;
  episodeName: string;
  watchedAt: string;
}

function readHistory(): HistoryItem[] {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, "[]", "utf-8");
    return [];
  }
  const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  return Array.isArray(parsed) ? parsed : [];
}

function writeHistory(items: HistoryItem[]) {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(items.slice(0, HISTORY_LIMIT), null, 2), "utf-8");
}

export async function GET() {
  try {
    return NextResponse.json(readHistory());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// 同一视频同一源只保留一条，看新的集会置顶并更新集数
export async function POST(request: NextRequest) {
  try {
    const item = (await request.json()) as Omit<HistoryItem, "watchedAt">;
    if (typeof item.vodId !== "number" || !item.sourceId) {
      return NextResponse.json({ error: "Invalid item" }, { status: 400 });
    }
    const items = readHistory().filter(
      (h) => !(h.vodId === item.vodId && h.sourceId === item.sourceId)
    );
    items.unshift({ ...item, watchedAt: new Date().toISOString() });
    writeHistory(items);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      vodId?: number;
      sourceId?: string;
      all?: boolean;
    };
    if (body.all) {
      writeHistory([]);
    } else if (typeof body.vodId === "number" && body.sourceId) {
      writeHistory(
        readHistory().filter(
          (h) => !(h.vodId === body.vodId && h.sourceId === body.sourceId)
        )
      );
    } else {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
