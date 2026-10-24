import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * One execution of the import pipeline for a single source.
 *
 * Records what happened (counts, validation issues, errors) so the UI can show
 * per-source History. A `test` run validates only and is never recorded.
 */
const ImportRunSchema = new Schema(
  {
    // Code-registry source id (e.g. "recharge"), not a DB reference.
    sourceId: { type: String, required: true, index: true },

    trigger: {
      type: String,
      enum: ["manual", "scheduled", "test"],
      required: true,
    },
    status: {
      type: String,
      enum: ["running", "success", "failed"],
      required: true,
    },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    feedGeneratedAt: { type: Date, default: null },

    counts: {
      products: { type: Number, default: 0 },
      variants: { type: Number, default: 0 },
    },

    // Validation failures, each with the exact JSON path (forward straight to supplier).
    issues: [
      {
        _id: false,
        path: { type: String, required: true },
        message: { type: String, required: true },
      },
    ],

    error: { type: String, default: null }, // top-level failure (fetch error, etc.)
  },
  { timestamps: true },
);

export type ImportRunDoc = InferSchemaType<typeof ImportRunSchema>;

export const ImportRun: Model<ImportRunDoc> =
  (models.ImportRun as Model<ImportRunDoc>) ??
  model<ImportRunDoc>("ImportRun", ImportRunSchema);
