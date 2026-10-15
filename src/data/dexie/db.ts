import Dexie, { type Table } from "dexie";

import type { AuxiliarySelection } from "@/domain";
import type {
  CatRecord,
  DraftRecord,
  FoodRecord,
  LegacyFoodSelection,
  MetaRecord,
  SnapshotRecord,
  WeightRecord,
} from "../records";

export const DB_SCHEMA_VERSION = 2;
export const DB_NAME = "cat-feeding";

type LegacyDraft = Omit<DraftRecord, "foodSelection"> & { foodSelection: LegacyFoodSelection };

const STORES = {
  cats: "id, updatedAtEpochMs",
  weights: "id, catId, recordedAtEpochMs, [catId+recordedAtEpochMs]",
  foods: "id, purpose, form, updatedAtEpochMs",
  drafts: "catId, updatedAtEpochMs",
  snapshots: "id, catId, savedAtEpochMs, [catId+savedAtEpochMs], basisModelId",
  meta: "key",
};

export class CatFeedingDatabase extends Dexie {
  declare cats: Table<CatRecord, string>;
  declare weights: Table<WeightRecord, string>;
  declare foods: Table<FoodRecord, string>;
  declare drafts: Table<DraftRecord, string>;
  declare snapshots: Table<SnapshotRecord, string>;
  declare meta: Table<MetaRecord, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(STORES);
    this.version(DB_SCHEMA_VERSION).stores(STORES).upgrade(async (tx) => {
      await tx.table<LegacyDraft | DraftRecord>("drafts").toCollection().modify((draft, context) => {
        const selection = draft.foodSelection;
        if ("mixedQuantity" in selection) return;
        const choices: AuxiliarySelection[] = [];
        if (selection.wetAuxiliaryFoodId !== null && selection.wetAuxiliaryGrams !== null) {
          choices.push({ foodId: selection.wetAuxiliaryFoodId, quantity: selection.wetAuxiliaryGrams, unit: "grams" });
        }
        if (selection.pouchFoodId !== null && selection.pouchCount !== null) {
          choices.push({ foodId: selection.pouchFoodId, quantity: selection.pouchCount, unit: "package" });
        }
        const preferredUnit = selection.activeViewKind === "mixed_pouch_dry" ? "package" : "grams";
        const chosen = choices.find((choice) => choice.unit === preferredUnit) ?? choices[0];
        const migrated: DraftRecord = {
          ...draft,
          foodSelection: {
            dryFoodId: selection.dryFoodId,
            wetFoodId: chosen?.foodId ?? selection.wetFoodId,
            mixedQuantity: chosen?.quantity ?? null,
            mixedUnit: chosen?.unit ?? "grams",
            activeViewKind: selection.activeViewKind === "mixed_pouch_dry" ? "mixed_wet_dry" : selection.activeViewKind,
            legacyFoodSelection: { ...selection },
            ...(choices.length > 1 ? { legacyMixedChoices: choices } : {}),
          },
        };
        context.value = migrated;
      });
    });
  }
}
