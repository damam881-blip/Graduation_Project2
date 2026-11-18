import {setGlobalOptions} from "firebase-functions/v2";
import {onRequest} from "firebase-functions/v2/https";
import type {Response} from "firebase-functions/v2/https";
import {successResponse, errorResponse} from "./api-response";
import {apiError} from "./api-errors";
import type {ApiErrorCode} from "./api-errors";
import {authenticate} from "./auth";
import {authorize} from "./authorization";
import {ensureProfile} from "./profile";
import {deleteAccountForUser} from "./delete-account";

setGlobalOptions({maxInstances: 10});

/**
 * Writes a standardized API error response.
 *
 * @param {Response} response - HTTP response.
 * @param {ApiErrorCode} code - Stable error identifier.
 * @return {void} Nothing.
 */
function sendApiError(response: Response, code: ApiErrorCode): void {
  const definition = apiError(code);

  response.status(definition.status).json(
    errorResponse(code, definition.message)
  );
}

// -------------------------------------------
// Health Endpoint
// -------------------------------------------

export const health = onRequest((request, response) => {
  response.set("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.set("Allow", "GET");
    sendApiError(response, "METHOD_NOT_ALLOWED");
    return;
  }

  response.status(200).json(
    successResponse({
      status: "ok",
      service: "networking-backend",
    })
  );
});

// -------------------------------------------
// Authentication Endpoint
// -------------------------------------------

export const me = onRequest(async (request, response) => {
  response.set("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.set("Allow", "GET");
    sendApiError(response, "METHOD_NOT_ALLOWED");
    return;
  }

  const auth = await authenticate(request);

  if (!auth.ok) {
    sendApiError(response, auth.code);
    return;
  }

  response.status(200).json(
    successResponse({
      uid: auth.user.uid,
    })
  );
});

// -------------------------------------------
// Profile Provisioning Endpoint
// -------------------------------------------

export const profile = onRequest(async (request, response) => {
  response.set("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.set("Allow", "POST");
    sendApiError(response, "METHOD_NOT_SUPPORTED");
    return;
  }

  const auth = await authenticate(request);

  if (!auth.ok) {
    sendApiError(response, auth.code);
    return;
  }

  const result = await ensureProfile(auth.user);

  if (!result.ok) {
    sendApiError(response, result.code);
    return;
  }

  response.status(200).json(successResponse(result.profile));
});

// -------------------------------------------
// Account Deletion Endpoint
// -------------------------------------------

export const deleteAccount = onRequest(async (request, response) => {
  response.set("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.set("Allow", "POST");
    sendApiError(response, "METHOD_NOT_SUPPORTED");
    return;
  }

  const auth = await authenticate(request);

  if (!auth.ok) {
    sendApiError(response, auth.code);
    return;
  }

  const result = await deleteAccountForUser(auth.user.uid);

  if (!result.ok) {
    sendApiError(response, result.code);
    return;
  }

  response.status(200).json(
    successResponse({
      uid: result.uid,
      status: result.status,
    })
  );
});

// -------------------------------------------
// Student Authorization Endpoint
// -------------------------------------------

export const studentAccess = onRequest(async (request, response) => {
  response.set("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.set("Allow", "GET");
    sendApiError(response, "METHOD_NOT_ALLOWED");
    return;
  }

  const result = await authorize(request, "student");

  if (!result.ok) {
    sendApiError(response, result.code);
    return;
  }

  response.status(200).json(
    successResponse({
      uid: result.uid,
      role: result.role,
    })
  );
});

// -------------------------------------------
// Admin Authorization Endpoint
// -------------------------------------------

export const adminAccess = onRequest(async (request, response) => {
  response.set("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.set("Allow", "GET");
    sendApiError(response, "METHOD_NOT_ALLOWED");
    return;
  }

  const result = await authorize(request, "admin");

  if (!result.ok) {
    sendApiError(response, result.code);
    return;
  }

  response.status(200).json(
    successResponse({
      uid: result.uid,
      role: result.role,
    })
  );
});
