import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export function apiFailure(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Invalid request",
          issues: error.issues,
        },
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const message = error instanceof Error
    ? error.message
    : typeof error === "object"
      && error !== null
      && "message" in error
      && typeof error.message === "string"
      ? error.message
      : "Unexpected server error";
  const conflictCodes = [
    "PREDICTIONS_CLOSED",
    "PREDICTION_ALREADY_SUBMITTED",
    "RESULT_ALREADY_PUBLISHED",
    "USER_NOT_ACTIVE",
  ];
  const matchedCode = conflictCodes.find((code) => message.includes(code));

  if (matchedCode) {
    return NextResponse.json(
      { error: { code: matchedCode, message: humanizeCode(matchedCode) } },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "The request could not be completed" } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

function humanizeCode(code: string) {
  const messages: Record<string, string> = {
    PREDICTIONS_CLOSED: "Predictions are now closed",
    PREDICTION_ALREADY_SUBMITTED: "Your prediction has already been submitted and cannot be changed",
    RESULT_ALREADY_PUBLISHED: "Published results cannot reopen predictions",
    USER_NOT_ACTIVE: "This participant is not active",
  };
  return messages[code] ?? code;
}
