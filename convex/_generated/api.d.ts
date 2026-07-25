/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as accessControl from "../accessControl.js";
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

declare const fullApi: ApiFromModules<{
  access: typeof access;
  accessControl: typeof accessControl;
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

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
