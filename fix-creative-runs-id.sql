-- Шаг 1: Удаляем foreign key constraint (он ссылается на таблицу creatives с UUID)
ALTER TABLE creative_runs 
DROP CONSTRAINT IF EXISTS creative_runs_creative_id_fkey;

-- Шаг 2: Изменяем тип creative_id с UUID на TEXT
ALTER TABLE creative_runs 
ALTER COLUMN creative_id TYPE TEXT;

-- Шаг 3: Пересоздаем индекс
DROP INDEX IF EXISTS idx_creative_runs_creative_id;
CREATE INDEX idx_creative_runs_creative_id ON creative_runs(creative_id);

-- Примечание: Мы НЕ создаем новый foreign key, потому что:
-- - creative_id теперь может ссылаться на creatives (UUID) ИЛИ competitor_creatives (integer)
-- - Foreign key к двум таблицам создать нельзя
-- - Это нормально - мы храним просто ID как текст для истории генераций
