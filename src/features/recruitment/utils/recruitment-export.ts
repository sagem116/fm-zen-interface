import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const body = rows.map((row) => headers.map((h) => escape(row[h])).join(",")).join("\n");
  return `${headers.join(",")}\n${body}`;
}

function downloadBlob(name: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRecruitmentResultsCSV(
  rows: Record<string, unknown>[],
  filename = "recruitment-search.csv",
) {
  downloadBlob(filename, toCsv(rows), "text/csv;charset=utf-8");
}

export function exportRecruitmentResultsJSON(
  rows: Record<string, unknown>[],
  filename = "recruitment-search.json",
) {
  downloadBlob(filename, JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
}

export function exportRecruitmentResultsExcel(
  rows: Record<string, unknown>[],
  filename = "recruitment-search.xlsx",
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Scout Search");
  XLSX.writeFile(wb, filename);
}

export interface ScoutReportExportPayload {
  title: string;
  entity: string;
  status: string;
  priority: string;
  summary?: string;
  tags?: string[];
  compatibility?: Record<string, number | string | null | undefined>;
  timeline?: Array<{ at: string; message: string }>;
}

export function exportScoutReportJSON(
  payload: ScoutReportExportPayload,
  filename = "scout-report.json",
) {
  downloadBlob(filename, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

export function exportScoutReportTXT(
  payload: ScoutReportExportPayload,
  filename = "scout-report.txt",
) {
  const lines = [
    payload.title,
    `Entidade: ${payload.entity}`,
    `Estado: ${payload.status}`,
    `Prioridade: ${payload.priority}`,
    payload.summary ? `Resumo: ${payload.summary}` : "",
    payload.tags?.length ? `Tags: ${payload.tags.join(", ")}` : "",
    "",
    "Compatibilidade:",
    ...Object.entries(payload.compatibility ?? {}).map(([k, v]) => `- ${k}: ${v ?? "-"}`),
    "",
    "Timeline:",
    ...(payload.timeline ?? []).map((item) => `- ${item.at}: ${item.message}`),
  ].filter(Boolean);
  downloadBlob(filename, lines.join("\n"), "text/plain;charset=utf-8");
}

export function exportScoutReportPDF(
  payload: ScoutReportExportPayload,
  filename = "scout-report.pdf",
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(payload.title, 14, 16);
  doc.setFontSize(10);
  doc.text(`Entidade: ${payload.entity}`, 14, 24);
  doc.text(`Estado: ${payload.status} | Prioridade: ${payload.priority}`, 14, 30);

  const summary = payload.summary ?? "Sem resumo.";
  const wrapped = doc.splitTextToSize(summary, 180);
  doc.text(wrapped, 14, 38);

  autoTable(doc, {
    startY: 50,
    head: [["Indicador", "Valor"]],
    body: Object.entries(payload.compatibility ?? {}).map(([k, v]) => [k, String(v ?? "-")]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 139, 90] },
  });

  const timeline = (payload.timeline ?? []).slice(0, 25);
  if (timeline.length) {
    // @ts-expect-error plugin field
    const after = (doc.lastAutoTable?.finalY ?? 56) + 6;
    autoTable(doc, {
      startY: after,
      head: [["Data", "Atualização"]],
      body: timeline.map((item) => [new Date(item.at).toLocaleString("pt-PT"), item.message]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [90, 90, 90] },
    });
  }

  doc.save(filename);
}

export function exportObservationsPDF(
  rows: Array<Record<string, unknown>>,
  filename = "observations.pdf",
) {
  const doc = new jsPDF();
  doc.setFontSize(15);
  doc.text("Observações", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [["Data", "Entidade", "Tipo", "Prioridade", "Título", "Descrição"]],
    body: rows.map((row) => [
      String(row.date ?? ""),
      String(row.entity ?? ""),
      String(row.type ?? ""),
      String(row.priority ?? ""),
      String(row.title ?? ""),
      String(row.description ?? ""),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 139, 90] },
  });
  doc.save(filename);
}

export function exportObservationsTXT(
  rows: Array<Record<string, unknown>>,
  filename = "observations.txt",
) {
  const lines = rows.map((row) => {
    return [
      `${row.date ?? ""} | ${row.entity ?? ""} | ${row.type ?? ""} | ${row.priority ?? ""}`,
      `${row.title ?? ""}`,
      `${row.description ?? ""}`,
      "",
    ].join("\n");
  });
  downloadBlob(filename, lines.join("\n"), "text/plain;charset=utf-8");
}

export function exportRecommendationsPDF(
  rows: Array<Record<string, unknown>>,
  filename = "recommendations.pdf",
) {
  const doc = new jsPDF();
  doc.setFontSize(15);
  doc.text("Recommendation Engine", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [
      [
        "Nome",
        "Clube",
        "Idade",
        "Valor",
        "Salário",
        "Ranking",
        "Recruitment",
        "Recommendation",
        "Compatibilidade",
      ],
    ],
    body: rows.map((row) => [
      String(row.name ?? ""),
      String(row.club ?? ""),
      String(row.age ?? ""),
      String(row.marketValue ?? ""),
      String(row.salary ?? ""),
      String(row.ranking ?? ""),
      String(row.recruitmentScore ?? ""),
      String(row.recommendationScore ?? ""),
      String(row.compatibility ?? ""),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 139, 90] },
  });
  doc.save(filename);
}

export function exportRecommendationsTXT(
  rows: Array<Record<string, unknown>>,
  filename = "recommendations.txt",
) {
  const lines = rows.map((row) => {
    return [
      `${row.name ?? ""} | ${row.club ?? ""} | Rec: ${row.recommendationScore ?? ""}`,
      `Recruitment: ${row.recruitmentScore ?? ""} | Cmp: ${row.compatibility ?? ""} | Ranking: ${row.ranking ?? ""}`,
      `Valor: ${row.marketValue ?? ""} | Salário: ${row.salary ?? ""} | Idade: ${row.age ?? ""}`,
      "",
    ].join("\n");
  });
  downloadBlob(filename, lines.join("\n"), "text/plain;charset=utf-8");
}
