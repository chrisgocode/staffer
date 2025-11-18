/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as permissions from "../permissions.js";
import type * as schedule_conflictUtils from "../schedule/conflictUtils.js";
import type * as schedule_parse from "../schedule/parse.js";
import type * as schedule_schedule from "../schedule/schedule.js";
import type * as signups from "../signups.js";
import type * as users from "../users.js";

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
  auth: typeof auth;
  calendar: typeof calendar;
  events: typeof events;
  http: typeof http;
  permissions: typeof permissions;
  "schedule/conflictUtils": typeof schedule_conflictUtils;
  "schedule/parse": typeof schedule_parse;
  "schedule/schedule": typeof schedule_schedule;
  signups: typeof signups;
  users: typeof users;
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
