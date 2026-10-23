import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, date, numeric } from "drizzle-orm/pg-core";
import type { CheckupDraft, ConditionalAdvice } from "@/lib/checkup-schema";

export type UploadStatus = "uploaded" | "analyzing" | "ready" | "failed" | "confirmed";
export type Sex = "male" | "female";
export type Smoking = "never" | "former" | "current";

// 검진을 관리하는 대상(부모님). 성별·출생연도·위험 요인은 올해 검진 판정의 대상 조건에 쓰인다.
export const members = pgTable("members", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  sex: text().$type<Sex>().notNull(),
  birthYear: integer().notNull(),
  smoking: text().$type<Smoking>().notNull().default("never"),
  // 폐암 검진 대상 조건(30갑년 이상)에 쓴다. 비흡연이면 null.
  packYears: integer(),
  // 간경변증, B형간염 항원 양성, C형간염 항체 양성 중 하나라도 해당하면 true (간암 검진 대상 조건)
  liverHighRisk: boolean().notNull().default(false),
  familyHistory: text(),
  conditions: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// 사용자가 올린 결과지 원본(Blob)과 AI 분석 상태
export const uploads = pgTable("uploads", {
  id: uuid().primaryKey().defaultRandom(),
  // 프로필 기능 이전에 올린 결과지는 비어 있을 수 있다.
  memberId: uuid().references(() => members.id, { onDelete: "set null" }),
  pathname: text().notNull().unique(),
  filename: text().notNull(),
  contentType: text().notNull(),
  size: integer().notNull(),
  status: text().$type<UploadStatus>().notNull().default("uploaded"),
  draft: jsonb().$type<CheckupDraft>(),
  error: text(),
  model: text(),
  costUsd: numeric({ precision: 10, scale: 6 }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  analyzedAt: timestamp({ withTimezone: true }),
});

// 사용자가 확인해 저장한 검진 기록
export const checkups = pgTable("checkups", {
  id: uuid().primaryKey().defaultRandom(),
  uploadId: uuid()
    .notNull()
    .unique()
    .references(() => uploads.id, { onDelete: "cascade" }),
  examDate: date(),
  institution: text(),
  examType: text(),
  conditionalAdvice: jsonb().$type<ConditionalAdvice[]>().notNull().default([]),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const checkupItems = pgTable("checkup_items", {
  id: uuid().primaryKey().defaultRandom(),
  checkupId: uuid()
    .notNull()
    .references(() => checkups.id, { onDelete: "cascade" }),
  position: integer().notNull(),
  category: text(),
  name: text().notNull(),
  value: text(),
  unit: text(),
  referenceRange: text(),
  finding: text(),
  judgment: text().notNull(),
});

// 정해진 시기에 다시 받아야 하는 추적검사 권고
export const followUps = pgTable("follow_ups", {
  id: uuid().primaryKey().defaultRandom(),
  checkupId: uuid()
    .notNull()
    .references(() => checkups.id, { onDelete: "cascade" }),
  target: text().notNull(),
  reason: text().notNull(),
  recommendedTiming: text().notNull(),
  recommendedMonths: integer(),
  sourceText: text().notNull(),
});

export type FollowUpOutcome = "clear" | "continue" | "treatment";

// 추적 권고에 대해 따로 받은 추가검사 결과 (F-10). 가장 최근 결과로 판정을 다시 한다 (F-11).
export const followUpResults = pgTable("follow_up_results", {
  id: uuid().primaryKey().defaultRandom(),
  followUpId: uuid()
    .notNull()
    .references(() => followUps.id, { onDelete: "cascade" }),
  testedOn: date().notNull(),
  outcome: text().$type<FollowUpOutcome>().notNull(),
  // "추적 계속"일 때 의사가 권고한 다음 검사까지의 개월 수
  nextMonths: integer(),
  hospital: text(),
  memo: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
