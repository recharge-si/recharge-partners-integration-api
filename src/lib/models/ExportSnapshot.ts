import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * The latest successfully-built standardized feed for a source, STORED so the
 * export endpoint serves it instantly instead of rebuilding/refetching on every
 * request. One document per source (upserted on each successful pull).
 */
const ExportSnapshotSchema = new Schema(
  {
    sourceId: { type: String, required: true, unique: true, index: true },
    feed: { type: Schema.Types.Mixed, required: true }, // the standard-format Feed JSON
    products: { type: Number, default: 0 },
    variants: { type: Number, default: 0 },
    generatedAt: { type: Date, default: null }, // feed.generatedAt
    builtAt: { type: Date, required: true }, // when this pull ran
  },
  { timestamps: true },
);

export type ExportSnapshotDoc = InferSchemaType<typeof ExportSnapshotSchema>;

export const ExportSnapshot: Model<ExportSnapshotDoc> =
  (models.ExportSnapshot as Model<ExportSnapshotDoc>) ??
  model<ExportSnapshotDoc>("ExportSnapshot", ExportSnapshotSchema);
