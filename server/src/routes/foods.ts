import type { FastifyInstance } from "fastify";
import type { Pool } from "mysql2/promise";

import { executeWrite, selectRows } from "../db.js";
import { badRequest } from "../errors.js";
import { FOOD_COLUMNS, foodToValues, rowToFood, type FoodRow } from "../rows.js";
import { parseFoodRecord } from "../validate.js";

const FOOD_SELECT = `SELECT ${FOOD_COLUMNS.join(", ")} FROM foods`;
const FOOD_UPSERT = `INSERT INTO foods (${FOOD_COLUMNS.join(", ")}) VALUES (${FOOD_COLUMNS.map(() => "?").join(", ")}) AS incoming
ON DUPLICATE KEY UPDATE ${FOOD_COLUMNS.filter((column) => column !== "id").map((column) => `${column} = incoming.${column}`).join(", ")}`;

export function registerFoodRoutes(app: FastifyInstance, pool: Pool): void {
  /** 按更新时间降序。食品库全局共享，不挂在某只猫下面。 */
  app.get("/api/foods", async () => {
    const rows = await selectRows<FoodRow>(pool, `${FOOD_SELECT} ORDER BY updated_at_epoch_ms DESC`);
    return rows.map(rowToFood);
  });

  app.get<{ Params: { id: string } }>("/api/foods/:id", async (request) => {
    const rows = await selectRows<FoodRow>(pool, `${FOOD_SELECT} WHERE id = ? LIMIT 1`, [request.params.id]);
    const row = rows[0];
    return row ? rowToFood(row) : null;
  });

  /** save 是 upsert 语义，和 Dexie 的 put 对齐。 */
  app.put<{ Params: { id: string } }>("/api/foods/:id", async (request) => {
    const food = parseFoodRecord(request.body);
    if (!food.ok) throw badRequest(food.error);
    if (food.value.id !== request.params.id) throw badRequest("食品 id 和路径不一致。");

    await executeWrite(pool, FOOD_UPSERT, foodToValues(food.value));
    return food.value;
  });
}
