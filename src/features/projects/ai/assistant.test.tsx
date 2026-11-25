import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import vi from "../../../../messages/vi.json";
import { skillsQuery } from "../work-api";
import type { AssigneeSuggestions, SuggestionCandidate } from "../work-types";
import { AssistantAnswerView } from "./assistant-answer";
import { criteriaForTask, historyFor, taskFromWork, understoodChips, visibleCandidates } from "./assistant-rules";
import type { AssistantAnswer, AssistantEntry, Understood } from "./types";

const base: Understood = {
  intent: "FIND_PEOPLE",
  task: null,
  virtualWork: false,
  workDescription: null,
  skills: [],
  unmatchedSkills: [],
  headcount: null,
  hours: null,
  scope: null,
  officeId: null,
  officeName: null,
  from: null,
  to: null,
};

const virtual: Understood = {
  ...base,
  virtualWork: true,
  workDescription: "màn hình đăng nhập",
  skills: [
    { skillId: "react", name: "React", minLevel: 3 },
    { skillId: "ts", name: "TypeScript", minLevel: null },
  ],
  unmatchedSkills: ["Rust"],
  headcount: 2,
  hours: 20,
  scope: "ALL",
  officeId: "hn",
  officeName: "Hà Nội",
  from: "2026-11-30",
  to: "2026-12-04",
};

function candidate(id: string, member: boolean): SuggestionCandidate {
  return {
    person: { id, employeeCode: id.toUpperCase(), fullName: `Người ${id}` },
    officeId: null,
    member,
    load: { zone: "GREEN", peakWeek: null, weeks: [] },
    skills: [],
    reasons: [],
    leaveDays: 0,
    leaveOnDue: false,
  } as unknown as SuggestionCandidate;
}

describe("trợ lý phân bổ: chip, lịch sử, điền sẵn", () => {
  it("lists what the assistant understood in reading order", () => {
    expect(understoodChips(virtual)).toEqual([
      { kind: "work", text: "màn hình đăng nhập" },
      { kind: "skill", name: "React", minLevel: 3 },
      { kind: "skill", name: "TypeScript", minLevel: null },
      { kind: "unmatched", name: "Rust" },
      { kind: "headcount", count: 2 },
      { kind: "hours", hours: 20 },
      { kind: "range", from: "2026-11-30", to: "2026-12-04" },
      { kind: "scope", scope: "ALL" },
      { kind: "office", name: "Hà Nội" },
    ]);
    expect(understoodChips({ ...base, intent: "TEAM_AVAILABILITY", from: "2026-11-23", scope: "ALL" })).toEqual([
      { kind: "from", from: "2026-11-23" },
    ]);
    expect(understoodChips({ ...base, task: { id: "t", key: "HRM-12" } })[0]).toEqual({ kind: "task", key: "HRM-12" });
  });

  it("sends only the last two answered turns as history", () => {
    const answer = (intent: Understood["intent"]) => ({ understood: { ...base, intent } }) as AssistantAnswer;
    const entries: AssistantEntry[] = [
      { id: 1, question: "a", taskId: null, status: "done", answer: answer("FIND_PEOPLE") },
      { id: 2, question: "b", taskId: null, status: "error" },
      { id: 3, question: "c", taskId: null, status: "done", answer: answer("TEAM_AVAILABILITY") },
      { id: 4, question: "d", taskId: null, status: "done", answer: answer("PROJECT_RISK") },
      { id: 5, question: "e", taskId: null, status: "pending" },
    ];
    expect(historyFor(entries).map((turn) => [turn.question, turn.understood.intent])).toEqual([
      ["c", "TEAM_AVAILABILITY"],
      ["d", "PROJECT_RISK"],
    ]);
  });

  it("prefills the new task form and the suggestion list from what was understood", () => {
    expect(taskFromWork(virtual)).toEqual({
      title: "Màn hình đăng nhập",
      estimateMinutes: 1200,
      startDate: "2026-11-30",
      dueDate: "2026-12-04",
      skills: [
        { skillId: "react", minLevel: 3 },
        { skillId: "ts", minLevel: null },
      ],
    });
    expect(criteriaForTask(virtual)).toEqual({
      skills: [
        { skillId: "react", minLevel: 3 },
        { skillId: "ts", minLevel: 1 },
      ],
      from: "2026-11-30",
      to: "2026-12-04",
      officeId: "hn",
    });
    expect(skillsQuery(criteriaForTask(virtual).skills)).toBe("react:3,ts:1");
    expect(skillsQuery([])).toBeUndefined();
  });

  it("shows as many people as asked for, five by default", () => {
    const list = ["a", "b", "c", "d", "e", "f", "g"].map((id) => candidate(id, true));
    expect(visibleCandidates(list, 2, false)).toMatchObject({ hidden: 5 });
    expect(visibleCandidates(list, null, false).shown).toHaveLength(5);
    expect(visibleCandidates(list, 2, true)).toMatchObject({ hidden: 0 });
  });
});

describe("trợ lý phân bổ: câu trả lời", () => {
  const actions = { onOpenSuggest: () => {}, onCreateTask: () => {}, onOpenTask: () => {}, onOpenPerson: () => {}, onAsk: () => {} };

  function render(answer: AssistantAnswer) {
    return renderToStaticMarkup(
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <AssistantAnswerView answer={answer} actions={actions} />
      </NextIntlClientProvider>,
    );
  }

  it("work not created yet: chips, notes, people and the create button", () => {
    const people = {
      scheduled: true,
      missingEstimate: false,
      outsideNeedsSkills: false,
      from: "2026-11-30",
      to: "2026-12-04",
      members: [candidate("a", true)],
      outside: [candidate("b", false)],
      outsideTotal: 1,
      excluded: { missingSkill: 0, overloadedTotal: 3, overloaded: [] },
    } as unknown as AssigneeSuggestions;
    const html = render({ kind: "PEOPLE", understood: virtual, notes: ["SKILL_NOT_IN_CATALOG", "UNKNOWN"], people, team: null, risks: null });

    expect(html).toContain("Tìm người:");
    expect(html).toContain("React ≥ 3");
    expect(html).toContain("line-through");
    expect(html).toContain("Có kỹ năng không nằm trong danh mục");
    expect(html).not.toContain("UNKNOWN");
    expect(html).toContain("Người a");
    expect(html).toContain("Chưa ở dự án");
    expect(html).toContain("3 người quá tải đã bị loại");
    expect(html).toContain("Tạo task với yêu cầu này");
    expect(html).not.toContain("Mở để giao");
  });

  it("risks: codes as chips, nobody assigned", () => {
    const html = render({
      kind: "RISKS",
      understood: { ...base, intent: "PROJECT_RISK" },
      notes: [],
      people: null,
      team: null,
      risks: [{ taskId: "t", key: "HRM-7", title: "Báo cáo", assignee: null, start: null, end: "2026-12-01", codes: ["UNASSIGNED_STARTING"] }],
    });
    expect(html).toContain("HRM-7");
    expect(html).toContain("Chưa có người làm");
    expect(html).toContain("Sắp bắt đầu, chưa có người");
  });

  it("unsupported: explains and offers examples", () => {
    const html = render({ kind: "UNSUPPORTED", understood: { ...base, intent: "UNSUPPORTED" }, notes: [], people: null, team: null, risks: null });
    expect(html).toContain("Trợ lý chưa hỗ trợ câu này");
    expect(html).toContain("Việc nào có nguy cơ trễ?");
  });
});
