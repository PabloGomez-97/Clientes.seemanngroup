import mongoose from "mongoose";

export type ProfitMode = "air" | "fcl" | "lcl";

export interface IClientProfitOverride {
  clientUserId: mongoose.Types.ObjectId;
  /** null = usa profit general para ese modo */
  air: number | null;
  fcl: number | null;
  lcl: number | null;
  updatedBy: string;
}

export interface IClientProfitOverrideDoc
  extends IClientProfitOverride,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type ClientProfitOverrideModel =
  mongoose.Model<IClientProfitOverrideDoc>;

export const ClientProfitOverrideSchema =
  new mongoose.Schema<IClientProfitOverrideDoc>(
    {
      clientUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },
      air: { type: Number, default: null },
      fcl: { type: Number, default: null },
      lcl: { type: Number, default: null },
      updatedBy: { type: String, required: true },
    },
    { timestamps: true, collection: "clientprofitoverrides" },
  );

export interface IClientProfitAudit {
  /** null cuando el cambio es del profit global */
  clientUserId: mongoose.Types.ObjectId | null;
  scope: "global" | "client";
  mode: ProfitMode;
  previousValue: number | null;
  newValue: number | null;
  changedByEmail: string;
  changedByName?: string;
}

export interface IClientProfitAuditDoc
  extends IClientProfitAudit,
    mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export type ClientProfitAuditModel = mongoose.Model<IClientProfitAuditDoc>;

export const ClientProfitAuditSchema =
  new mongoose.Schema<IClientProfitAuditDoc>(
    {
      clientUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },
      scope: {
        type: String,
        enum: ["global", "client"],
        required: true,
        index: true,
      },
      mode: {
        type: String,
        enum: ["air", "fcl", "lcl"],
        required: true,
      },
      previousValue: { type: Number, default: null },
      newValue: { type: Number, default: null },
      changedByEmail: { type: String, required: true, lowercase: true, trim: true },
      changedByName: { type: String, required: false, trim: true },
    },
    { timestamps: true, collection: "clientprofitaudits" },
  );

ClientProfitAuditSchema.index({ createdAt: -1 });
ClientProfitAuditSchema.index({ clientUserId: 1, createdAt: -1 });
