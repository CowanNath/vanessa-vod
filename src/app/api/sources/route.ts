import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEFAULT_SOURCE } from "../../../lib/constants";

const DATA_DIR = path.join(process.cwd(), "data");
const SOURCES_FILE = path.join(DATA_DIR, "sources.json");

interface SourcesData {
  sources: typeof DEFAULT_SOURCE[];
  activeSourceId: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSources(): SourcesData {
  ensureDataDir();
  if (!fs.existsSync(SOURCES_FILE)) {
    const defaultData: SourcesData = {
      sources: [DEFAULT_SOURCE],
      activeSourceId: DEFAULT_SOURCE.id,
    };
    fs.writeFileSync(SOURCES_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
    return defaultData;
  }
  const raw = fs.readFileSync(SOURCES_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeSources(data: SourcesData) {
  ensureDataDir();
  fs.writeFileSync(SOURCES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const data = readSources();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sources, activeSourceId } = body as SourcesData;

    if (!Array.isArray(sources)) {
      return NextResponse.json({ error: "Invalid sources" }, { status: 400 });
    }

    writeSources({ sources, activeSourceId: activeSourceId || "" });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
