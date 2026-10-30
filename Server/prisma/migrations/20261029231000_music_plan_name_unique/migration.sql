-- Unique plan names so seeds can upsert by name (same convention as WifiPlan/TvPlan).
CREATE UNIQUE INDEX "MusicPlan_name_key" ON "MusicPlan"("name");
