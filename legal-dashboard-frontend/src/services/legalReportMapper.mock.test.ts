import { mockCases } from "../data/mockData";
import { buildLegalReportDocument } from "./legalReportMapper";
import type { TranscriptionResult } from "./transcriptionService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runLegalReportMapperMockTest() {
  const caseRecord = mockCases[0];
  const selectedEvidence = caseRecord.incidents[0].evidence.slice(0, 2);
  const audioEvidence = selectedEvidence.find((item) => item.type === "Audio");
  const transcriptsByEvidenceId: Record<string, TranscriptionResult> = audioEvidence
    ? {
        [audioEvidence.id]: {
          id: "transcript-mock",
          fileName: audioEvidence.filename,
          status: "completed",
          text: "Mock transcript text generated during step 2.",
          requestedAt: "2026-06-23T10:00:00.000Z",
          language: "en",
          languageProbability: 0.98,
        },
      }
    : {};

  const report = buildLegalReportDocument({
    caseRecord,
    selectedEvidence,
    transcriptsByEvidenceId,
    generatedAt: new Date("2026-06-23T10:05:00.000Z"),
  });

  const sectionTitles = report.sections.map((section) => section.title);

  assert(report.sections.length === 10, "Report should include the required 10 sections.");
  assert(sectionTitles.includes("Disclaimer"), "Report should include a Disclaimer section.");
  assert(sectionTitles.includes("5. Transcript Information"), "Report should include transcript information.");
  assert(
    report.transcripts.some((transcript) => transcript.text.includes("Mock transcript text")),
    "Report should include the completed step 2 transcript text."
  );

  return report;
}
