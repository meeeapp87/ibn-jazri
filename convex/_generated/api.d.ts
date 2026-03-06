/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as aiAssistant from "../aiAssistant.js";
import type * as aiAssistantQueries from "../aiAssistantQueries.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as competitions from "../competitions.js";
import type * as evaluations from "../evaluations.js";
import type * as footerSettings from "../footerSettings.js";
import type * as http from "../http.js";
import type * as maintenance from "../maintenance.js";
import type * as programs from "../programs.js";
import type * as requests from "../requests.js";
import type * as resources from "../resources.js";
import type * as router from "../router.js";
import type * as students from "../students.js";
import type * as studentsDedupMerge from "../studentsDedupMerge.js";
import type * as studentsDedupPreview from "../studentsDedupPreview.js";
import type * as teachers from "../teachers.js";
import type * as teachersDedupManual from "../teachersDedupManual.js";
import type * as teachersDedupMerge from "../teachersDedupMerge.js";
import type * as teachersDedupPreview from "../teachersDedupPreview.js";
import type * as teachersMerge from "../teachersMerge.js";
import type * as teachersMergePreview from "../teachersMergePreview.js";
import type * as videos from "../videos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  aiAssistant: typeof aiAssistant;
  aiAssistantQueries: typeof aiAssistantQueries;
  attendance: typeof attendance;
  auth: typeof auth;
  competitions: typeof competitions;
  evaluations: typeof evaluations;
  footerSettings: typeof footerSettings;
  http: typeof http;
  maintenance: typeof maintenance;
  programs: typeof programs;
  requests: typeof requests;
  resources: typeof resources;
  router: typeof router;
  students: typeof students;
  studentsDedupMerge: typeof studentsDedupMerge;
  studentsDedupPreview: typeof studentsDedupPreview;
  teachers: typeof teachers;
  teachersDedupManual: typeof teachersDedupManual;
  teachersDedupMerge: typeof teachersDedupMerge;
  teachersDedupPreview: typeof teachersDedupPreview;
  teachersMerge: typeof teachersMerge;
  teachersMergePreview: typeof teachersMergePreview;
  videos: typeof videos;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
