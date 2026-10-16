-- catFan 服务端表结构。
--
--   mysql -h 127.0.0.1 -P 3307 -u catfan_app -p catfan < schema.sql
--
-- 贯穿全表的约定：
--   数值一律 DOUBLE，时间点存 VARCHAR(40) 的 ISO 字符串加 BIGINT 的 epoch 毫秒，
--   枚举用 VARCHAR，ID 列用 VARCHAR(64) COLLATE utf8mb4_bin。
--   外键不加 ON DELETE CASCADE，删除顺序由服务端显式控制。

CREATE TABLE IF NOT EXISTS cats (
  id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  name VARCHAR(200) NOT NULL,
  birth_date VARCHAR(10) NOT NULL,
  sex VARCHAR(32) NOT NULL,
  neutered VARCHAR(32) NOT NULL,
  breed VARCHAR(200) NULL,
  body_condition_score DOUBLE NULL,
  lifestyle VARCHAR(32) NOT NULL,
  note TEXT NULL,
  created_at VARCHAR(40) NOT NULL,
  created_at_epoch_ms BIGINT NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  updated_at_epoch_ms BIGINT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_cats_created (created_at_epoch_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS weights (
  id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  cat_id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  weight_kg DOUBLE NOT NULL,
  recorded_at VARCHAR(40) NOT NULL,
  recorded_at_epoch_ms BIGINT NOT NULL,
  -- 东为正。UTC+8 存 480。
  timezone_offset_minutes INT NOT NULL,
  note TEXT NULL,
  updated_at VARCHAR(40) NOT NULL,
  updated_at_epoch_ms BIGINT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_weights_cat_recorded (cat_id, recorded_at_epoch_ms),
  CONSTRAINT fk_weights_cat FOREIGN KEY (cat_id) REFERENCES cats (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS foods (
  id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  name VARCHAR(200) NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  form VARCHAR(32) NOT NULL,
  calorie_amount DOUBLE NOT NULL,
  calorie_unit VARCHAR(32) NOT NULL,
  package_label VARCHAR(200) NULL,
  package_weight_grams DOUBLE NULL,
  package_kcal DOUBLE NULL,
  completeness VARCHAR(32) NOT NULL,
  calorie_source VARCHAR(32) NULL,
  note TEXT NULL,
  created_at VARCHAR(40) NOT NULL,
  created_at_epoch_ms BIGINT NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  updated_at_epoch_ms BIGINT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_foods_updated (updated_at_epoch_ms)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 一只猫一份草稿。嵌套结构整条进 payload，排序键做成生成列。
CREATE TABLE IF NOT EXISTS drafts (
  cat_id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  -- LONGTEXT 而不是 JSON：JSON 类型会规范化键序和数字格式。
  payload LONGTEXT NOT NULL,
  updated_at_epoch_ms BIGINT UNSIGNED
    AS (CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.updatedAtEpochMs')) AS UNSIGNED)) STORED,
  PRIMARY KEY (cat_id),
  CONSTRAINT fk_drafts_cat FOREIGN KEY (cat_id) REFERENCES cats (id),
  CONSTRAINT chk_drafts_payload CHECK (JSON_VALID(payload))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 只追加。服务端不注册 UPDATE 路由，DELETE 只有用户删单条那一个入口。
CREATE TABLE IF NOT EXISTS snapshots (
  id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  cat_id VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  payload LONGTEXT NOT NULL,
  saved_at_epoch_ms BIGINT UNSIGNED
    AS (CAST(JSON_UNQUOTE(JSON_EXTRACT(payload, '$.savedAtEpochMs')) AS UNSIGNED)) STORED,
  PRIMARY KEY (id),
  KEY idx_snapshots_cat_saved (cat_id, saved_at_epoch_ms),
  CONSTRAINT fk_snapshots_cat FOREIGN KEY (cat_id) REFERENCES cats (id),
  CONSTRAINT chk_snapshots_payload CHECK (JSON_VALID(payload))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
