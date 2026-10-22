import { integer, jsonb, pgTable, text, timestamp, uuid, date, numeric } from "drizzle-orm/pg-core";
import type { CheckupDraft, ConditionalAdvice } from "@/lib/checkup-schema";

export type UploadStatus = "uploaded" | "analyzing" | "ready" | "failed" | "confirmed";

// 사용자가 올린 결과지 원본(Blob)과 AI 분석 상태
export const uploads = pgTable("uploads", {
  id: uuid().primaryKey().defaultRandom(),
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
