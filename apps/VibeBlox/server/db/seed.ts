import { db, initializeDatabase } from "./index.js";
import {
	seedUsers,
	seedQuestsSelfCareHousehold,
	seedQuestsRegulation,
	seedQuestsSocial,
	seedQuestsSpiritualAcademic,
	seedQuestsPhysicalAbove,
	seedRewards,
	seedAchievements,
} from "./seeds/index.js";

initializeDatabase();
console.log("🌱 Starting database seed...");

const seedAll = db.transaction(() => {
	seedUsers(db);
	seedQuestsSelfCareHousehold(db);
	seedQuestsRegulation(db);
	seedQuestsSocial(db);
	seedQuestsSpiritualAcademic(db);
	seedQuestsPhysicalAbove(db);
	seedRewards(db);
	seedAchievements(db);
});

seedAll();

console.log("\n🎉 Database seed complete!");
console.log(`\n📊 Summary:`);
console.log(`   Users: 2 (1 parent, 1 child)`);
const questsCount = db.prepare("SELECT COUNT(*) as count FROM quests").get() as { count: number };
const rewardsCount = db.prepare("SELECT COUNT(*) as count FROM rewards").get() as { count: number };
const achievementsCount = db.prepare("SELECT COUNT(*) as count FROM achievements").get() as { count: number };
console.log(`   Quests: ${questsCount.count}`);
console.log(`   Rewards: ${rewardsCount.count}`);
console.log(`   Achievements: ${achievementsCount.count}`);
