"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Scatter,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

// --- Helpers ---
const defaultData = [
  { id: "p1", name: "Alpha", x: 1.2, y: 12, z: 160, color: "#2563eb" },
  { id: "p2", name: "Beta", x: 0.6, y: 15, z: 120, color: "#16a34a" },
  { id: "p3", name: "Gamma", x: 2.0, y: 3, z: 220, color: "#f59e0b" },
  { id: "p4", name: "Delta", x: 0.3, y: -2, z: 100, color: "#ef4444" },
];

const palette = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#7c3aed", "#0ea5e9", "#f97316", "#22d3ee"]; 

function median(nums: number[]) {
  if (!nums.length) return 0;
  const arr = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function classifyPoint(x: number, y: number, shareThreshold: number, growthThreshold: number) {
  const highShare = x >= shareThreshold;
  const highGrowth = y >= growthThreshold;
  if (highShare && highGrowth) return "Звезды";
  if (!highShare && highGrowth) return "Трудные дети";
  if (highShare && !highGrowth) return "Дойные коровы";
  return "Собаки";
}

const STORAGE_KEY = "bcg-matrix-data-v1";
const SETTINGS_KEY = "bcg-matrix-settings-v1";

export default function BCGMatrixApp() {
  const [rows, setRows] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultData;
    } catch {
      return defaultData;
    }
  });

  const [autoThresholds, setAutoThresholds] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      return s ? JSON.parse(s).autoThresholds ?? true : true;
    } catch {
      return true;
    }
  });

  const [shareThreshold, setShareThreshold] = useState<number>(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      return s ? JSON.parse(s).shareThreshold ?? 1 : 1;
    } catch {
      return 1;
    }
  });

  const [growthThreshold, setGrowthThreshold] = useState<number>(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      return s ? JSON.parse(s).growthThreshold ?? 10 : 10;
    } catch {
      return 10;
    }
  });

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ autoThresholds, shareThreshold, growthThreshold })
    );
  }, [autoThresholds, shareThreshold, growthThreshold]);

  // Derived settings
  const autoShareThr = useMemo(() => median(rows.map((r: any) => r.x)), [rows]);
  const autoGrowthThr = useMemo(() => median(rows.map((r: any) => r.y)), [rows]);

  const xThr = autoThresholds ? autoShareThr : Number(shareThreshold) || 0;
  const yThr = autoThresholds ? autoGrowthThr : Number(growthThreshold) || 0;

  // Chart ranges
  const xMin = Math.min(...rows.map((r: any) => r.x), xThr);
  const xMax = Math.max(...rows.map((r: any) => r.x), xThr);
  const yMin = Math.min(...rows.map((r: any) => r.y), yThr);
  const yMax = Math.max(...rows.map((r: any) => r.y), yThr);

  const xPad = (xMax - xMin) * 0.1 || 1;
  const yPad = (yMax - yMin) * 0.1 || 1;

  const domainX: [number, number] = [xMin - xPad, xMax + xPad];
  const domainY: [number, number] = [yMin - yPad, yMax + yPad];

  // New row draft
  const [draft, setDraft] = useState({
    name: "Новый продукт",
    x: 1,
    y: 5,
    z: 140,
    color: palette[(rows.length) % palette.length],
  });

  function addRow() {
    if (!draft.name?.trim()) return;
    const id = crypto.randomUUID();
    setRows((prev: any[]) => [
      ...prev,
      {
        id,
        name: draft.name.trim(),
        x: Number(draft.x) || 0,
        y: Number(draft.y) || 0,
        z: Math.max(40, Number(draft.z) || 100),
        color: (draft as any).color || palette[(prev.length) % palette.length],
      },
    ]);
    setDraft({ name: "Новый продукт", x: 1, y: 5, z: 140, color: palette[(rows.length + 1) % palette.length] });
  }

  function updateCell(id: string, key: string, value: any) {
    setRows((prev: any[]) =>
      prev.map((r: any) => (r.id === id ? { ...r, [key]: key === "name" ? value : Number(value) } : r))
    );
  }

  function updateColor(id: string, color: string) {
    setRows((prev: any[]) => prev.map((r: any) => (r.id === id ? { ...r, color } : r)));
  }

  function removeRow(id: string) {
    setRows((prev: any[]) => prev.filter((r: any) => r.id !== id));
  }

  function resetSample() {
    setRows(defaultData);
  }

  function clearAll() {
    setRows([]);
  }

  // Tooltip content
  function CustomTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const cat = classifyPoint(p.x, p.y, xThr, yThr);
      return (
        <div className="rounded-2xl border bg-white/95 p-3 shadow">
          <div className="text-sm font-semibold" style={{ color: p.color }}>{p.name}</div>
          <div className="text-xs mt-1">Доля (X): <span className="font-medium">{p.x}</span></div>
          <div className="text-xs">Рост (Y): <span className="font-medium">{p.y}%</span></div>
          <div className="text-xs">Размер пузыря (Z): <span className="font-medium">{p.z}</span></div>
          <div className="text-xs mt-1">Квадрант: <span className="font-medium">{cat}</span></div>
        </div>
      );
    }
    return null;
  }

  // Quadrant colors (soft)
  const quad = {
    stars: "#22c55e22",
    question: "#0ea5e922",
    cows: "#eab30822",
    dogs: "#ef444422",
  };

  return (
    <div className="p-6 md:p-10 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Бостонская матрица (BCG)</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={resetSample}>Загрузить пример</Button>
          <Button variant="destructive" onClick={clearAll}>Очистить всё</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Матрица: X — относительная доля рынка; Y — темпы роста рынка</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[520px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Относительная доля рынка"
                    domain={domainX}
                    label={{ value: "Относительная доля рынка (X)", position: "bottom", offset: 0 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Темпы роста рынка, %"
                    domain={domainY}
                    label={{ value: "Темпы роста рынка (Y, %)", angle: -90, position: "insideLeft" }}
                  />
                  <ZAxis type="number" dataKey="z" name="Размер пузыря" range={[80, 400]} />

                  {/* Quadrant shading */}
                  <ReferenceArea x1={domainX[0]} x2={xThr} y1={yThr} y2={domainY[1]} fill={quad.stars} />
                  <ReferenceArea x1={xThr} x2={domainX[1]} y1={yThr} y2={domainY[1]} fill={quad.question} />
                  <ReferenceArea x1={domainX[0]} x2={xThr} y1={domainY[0]} y2={yThr} fill={quad.cows} />
                  <ReferenceArea x1={xThr} x2={domainX[1]} y1={domainY[0]} y2={yThr} fill={quad.dogs} />

                  {/* Threshold lines */}
                  <ReferenceLine x={xThr} stroke="#334155" strokeDasharray="4 4" />
                  <ReferenceLine y={yThr} stroke="#334155" strokeDasharray="4 4" />

                  <Tooltip cursor={{ strokeDasharray: "4 4" }} content={<CustomTooltip />} />
                  <Legend />

                  {rows.map((r: any) => (
                    <Scatter key={r.id} name={r.name} data={[r]} fill={r.color} />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>

              {/* Quadrant legend */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-sm">
                <div className="rounded-2xl p-3 border" style={{ background: quad.stars }}>
                  <div className="font-semibold">Звезды</div>
                  <div className="text-xs text-slate-700">Высокая доля, высокий рост</div>
                </div>
                <div className="rounded-2xl p-3 border" style={{ background: quad.question }}>
                  <div className="font-semibold">Трудные дети</div>
                  <div className="text-xs text-slate-700">Низкая доля, высокий рост</div>
                </div>
                <div className="rounded-2xl p-3 border" style={{ background: quad.cows }}>
                  <div className="font-semibold">Дойные коровы</div>
                  <div className="text-xs text-slate-700">Высокая доля, низкий рост</div>
                </div>
                <div className="rounded-2xl p-3 border" style={{ background: quad.dogs }}>
                  <div className="font-semibold">Собаки</div>
                  <div className="text-xs text-slate-700">Низкая доля, низкий рост</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Пороговые значения</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Автоматически по медиане</div>
                <div className="text-xs text-slate-600">Порог X и Y берутся как медианы по текущим данным</div>
              </div>
              <Switch checked={autoThresholds} onCheckedChange={setAutoThresholds} />
            </div>

            <div className={`grid grid-cols-2 gap-4 ${autoThresholds ? "opacity-50 pointer-events-none" : ""}`}>
              <div>
                <Label>Порог X (доля)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={shareThreshold}
                  onChange={(e) => setShareThreshold(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Порог Y (рост, %)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={growthThreshold}
                  onChange={(e) => setGrowthThreshold(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="rounded-2xl border p-3 text-sm bg-slate-50">
              <div className="font-medium mb-1">Текущие пороги</div>
              <div>Доля X: <span className="font-semibold">{xThr.toFixed(2)}</span></div>
              <div>Рост Y: <span className="font-semibold">{yThr.toFixed(2)}%</span></div>
            </div>

            <div className="rounded-2xl border p-3 text-xs text-slate-600">
              <div className="font-medium mb-1">Подсказки</div>
              <ul className="list-disc ml-4 space-y-1">
                <li>Относительная доля рынка X обычно нормируется относительно лидера (≈1.0 — паритет с лидером).</li>
                <li>Темпы роста Y вводятся в процентах (можно отрицательные).</li>
                <li>Размер пузыря Z — произвольный показатель (например, выручка/маржа/GMV).</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <Card>
        <CardHeader>
          <CardTitle>Данные продуктов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead title="Относительная доля рынка">X</TableHead>
                  <TableHead title="Темпы роста рынка, %">Y, %</TableHead>
                  <TableHead title="Размер пузыря (например, выручка)">Z</TableHead>
                  <TableHead>Цвет</TableHead>
                  <TableHead>Квадрант</TableHead>
                  <TableHead className="w-16 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id} className="align-middle">
                    <TableCell>
                      <Input value={r.name} onChange={(e) => updateCell(r.id, "name", (e.target as any).value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.1" value={r.x} onChange={(e) => updateCell(r.id, "x", (e.target as any).value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.1" value={r.y} onChange={(e) => updateCell(r.id, "y", (e.target as any).value)} />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="1" value={r.z} onChange={(e) => updateCell(r.id, "z", (e.target as any).value)} />
                    </TableCell>
                    <TableCell>
                      <input
                        type="color"
                        className="h-10 w-10 rounded-lg border"
                        value={r.color}
                        onChange={(e) => updateColor(r.id, (e.target as any).value)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium rounded-full px-2 py-1 border bg-white">
                        {classifyPoint(r.x, r.y, xThr, yThr)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => removeRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {/* New row */}
                <TableRow>
                  <TableCell>
                    <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: (e.target as any).value })} />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.x}
                      onChange={(e) => setDraft({ ...draft, x: parseFloat((e.target as any).value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.1"
                      value={draft.y}
                      onChange={(e) => setDraft({ ...draft, y: parseFloat((e.target as any).value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="1"
                      value={draft.z}
                      onChange={(e) => setDraft({ ...draft, z: parseFloat((e.target as any).value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="color"
                      className="h-10 w-10 rounded-lg border"
                      value={(draft as any).color as string}
                      onChange={(e) => setDraft({ ...draft, color: (e.target as any).value })}
                    />
                  </TableCell>
                  <TableCell className="text-slate-400 text-xs">—</TableCell>
                  <TableCell className="text-right">
                    <Button onClick={addRow}>
                      <Plus className="h-4 w-4 mr-1" /> Добавить
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-xs text-slate-500">
        Данные сохраняются локально в браузере. При необходимости можно экспортировать/импортировать JSON через DevTools (localStorage).
      </div>
    </div>
  );
}
