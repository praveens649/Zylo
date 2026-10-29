import { Global, Module } from '@nestjs/common';
import { DataQuestController } from './data-quest.controller.js';
import { XpLevelService } from './xp-level.service.js';
import { AchievementService } from './achievement.service.js';
import { QuestRulesEngine } from './quest-rules.engine.js';
import { QuestService } from './quest.service.js';
import { QuestCronService } from './quest-cron.service.js';

@Global()
@Module({
  controllers: [DataQuestController],
  providers: [
    XpLevelService,
    AchievementService,
    QuestRulesEngine,
    QuestService,
    QuestCronService,
  ],
  exports: [QuestRulesEngine, QuestService, XpLevelService, AchievementService],
})
export class DataQuestModule {}
