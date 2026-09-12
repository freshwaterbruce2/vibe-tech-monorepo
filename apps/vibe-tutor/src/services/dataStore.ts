/**
 * Unified Data Store for Vibe Tutor
 * Provides single source of truth abstraction over SQLite and localStorage
 * Ensures MCP Learning Dashboard queries show correct real-time data
 */

import { logger } from '../utils/logger';
import { Capacitor } from '@capacitor/core';
import type {
  Achievement,
  BrainGameStats,
  ChatMessage,
  RewardRequest,
  DailySchedule,
  FocusSession,
  HomeworkItem,
  MusicPlaylist,
  Reward,
  SensoryPreferences,
  AvatarState,
} from '../types';
import { MAX_REWARD_REQUESTS } from '../types';
import { databaseService } from './databaseService';
import { migrationService } from './migrationService';
import { FlameIcon } from '../components/ui/icons/FlameIcon';
import { TrophyIcon } from '../components/ui/icons/TrophyIcon';

import { appStore } from '../utils/electronStore';
import { DEFAULT_UNLOCKED_AVATAR_IDS, SHOP_ITEMS, parseStoredAvatarId } from './avatarShopData';

// Cap persisted chat history so a long-running conversation cannot grow storage
// without bound. Keeps the most recent messages.
const CHAT_HISTORY_CAP = 200;
const REWARD_REQUESTS_KEY = 'rewardRequests:v1';
const REWARD_CATALOG_KEY = 'parentRewards';
const MAX_REWARDS = 100;
const MAX_AVATAR_HISTORY = 100;
const AVATAR_STATE_KEY = 'avatarState';
const WEB_COLLECTION_CAP = 500;
const SAFE_ID = /^[\x21-\x7e]{1,160}$/;

function assertWebFocus(session: FocusSession): void {
  if (
    typeof session.id !== 'string' ||
    !SAFE_ID.test(session.id) ||
    !Number.isSafeInteger(session.startTime) ||
    session.startTime < 0 ||
    session.endTime === undefined ||
    !Number.isSafeInteger(session.endTime) ||
    session.endTime < session.startTime ||
    !Number.isSafeInteger(session.duration) ||
    session.duration <= 0 ||
    session.completed !== true ||
    (session.points !== undefined && (!Number.isSafeInteger(session.points) || session.points < 0))
  )
    throw new Error('Stored focus sessions are malformed');
}

function parseLegacyFocusTimestamp(value: unknown): number {
  if (typeof value !== 'string') throw new Error('Stored focus session is malformed');
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z| (\d{2}):(\d{2}):(\d{2}))$/,
  );
  if (!match) throw new Error('Stored focus session is malformed');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? match[8]);
  const minute = Number(match[5] ?? match[9]);
  const second = Number(match[6] ?? match[10]);
  const milliseconds = match[7] === undefined ? 0 : Number(match[7].padEnd(3, '0'));
  const timestamp = Date.UTC(year, month - 1, day, hour, minute, second, milliseconds);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second ||
    date.getUTCMilliseconds() !== milliseconds
  )
    throw new Error('Stored focus session is malformed');
  return timestamp;
}
const PRINTABLE_TEXT = /^(?=.*\S)[\x20-\x7e]{1,500}$/;

function validDueDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year! < 1 || year! > 9999 || month! < 1 || month! > 12 || day! < 1) return false;
  const leap = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day! <= days[month! - 1]!;
}

function parseWebHomeworkItems(value: unknown): HomeworkItem[] {
  if (!Array.isArray(value) || value.length > WEB_COLLECTION_CAP)
    throw new Error('Stored homework items are malformed');
  const ids = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry))
      throw new Error('Stored homework items are malformed');
    const item = entry as HomeworkItem;
    if (
      typeof item.id !== 'string' ||
      !SAFE_ID.test(item.id) ||
      ids.has(item.id) ||
      typeof item.subject !== 'string' ||
      !PRINTABLE_TEXT.test(item.subject) ||
      typeof item.title !== 'string' ||
      !PRINTABLE_TEXT.test(item.title) ||
      !validDueDate(item.dueDate) ||
      typeof item.completed !== 'boolean' ||
      (item.completedDate !== undefined &&
        (!Number.isSafeInteger(item.completedDate) || item.completedDate < 0))
    )
      throw new Error('Stored homework items are malformed');
    if (!item.completed && item.completedDate !== undefined)
      throw new Error('Stored homework items are malformed');
    ids.add(item.id);
    return { ...item };
  });
}

const SHOP_ITEMS_BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item]));
const AVATAR_IDS = new Set(DEFAULT_UNLOCKED_AVATAR_IDS);
const EQUIPMENT_SLOTS = ['hat', 'shirt', 'accessory', 'frame', 'badge', 'background'] as const;

function parseAvatarState(value: unknown): AvatarState {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Stored avatar state is malformed');
  const raw = value as Record<string, unknown>;
  const equipped = raw.equippedItems;
  if (!equipped || typeof equipped !== 'object' || Array.isArray(equipped))
    throw new Error('Stored avatar equipment is malformed');
  if (!Array.isArray(raw.ownedItems) || !Array.isArray(raw.unlockedAvatars))
    throw new Error('Stored avatar ownership is malformed');
  if (raw.ownedItems.length > SHOP_ITEMS.length || raw.unlockedAvatars.length > AVATAR_IDS.size)
    throw new Error('Stored avatar state exceeds its safe limit');
  const ownedItems = new Set<string>();
  for (const id of raw.ownedItems) {
    const item = typeof id === 'string' ? SHOP_ITEMS_BY_ID.get(id) : undefined;
    if (!item || item.type === 'avatar' || ownedItems.has(id))
      throw new Error('Stored avatar ownership is malformed');
    ownedItems.add(id);
  }
  const unlockedAvatars = new Set<string>();
  for (const id of raw.unlockedAvatars) {
    if (typeof id !== 'string' || !AVATAR_IDS.has(id) || unlockedAvatars.has(id))
      throw new Error('Stored avatar ownership is malformed');
    unlockedAvatars.add(id);
  }
  let selectedAvatarId: string | undefined;
  if (raw.selectedAvatarId !== undefined) {
    if (typeof raw.selectedAvatarId !== 'string')
      throw new Error('Stored avatar selection is malformed');
    selectedAvatarId = raw.selectedAvatarId;
  }
  if (
    selectedAvatarId !== undefined &&
    (!AVATAR_IDS.has(selectedAvatarId) || !unlockedAvatars.has(selectedAvatarId))
  ) {
    throw new Error('Stored avatar selection is malformed');
  }
  const canonicalEquipment: AvatarState['equippedItems'] = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const id = (equipped as Record<string, unknown>)[slot];
    if (id === undefined) continue;
    if (typeof id !== 'string') throw new Error('Stored avatar equipment is malformed');
    const item = SHOP_ITEMS_BY_ID.get(id);
    if (item?.type !== slot || !ownedItems.has(id))
      throw new Error('Stored avatar equipment is malformed');
    canonicalEquipment[slot] = id;
  }
  if (
    Object.keys(equipped as Record<string, unknown>).some(
      (key) =>
        !EQUIPMENT_SLOTS.includes(key as (typeof EQUIPMENT_SLOTS)[number]) &&
        (equipped as Record<string, unknown>)[key] !== undefined,
    )
  ) {
    throw new Error('Stored avatar equipment is malformed');
  }
  let purchaseHistory: AvatarState['purchaseHistory'];
  if (raw.purchaseHistory !== undefined) {
    if (!Array.isArray(raw.purchaseHistory) || raw.purchaseHistory.length > MAX_AVATAR_HISTORY)
      throw new Error('Stored avatar purchase history is malformed');
    purchaseHistory = raw.purchaseHistory.map((entry) => {
      if (!entry || typeof entry !== 'object')
        throw new Error('Stored avatar purchase history is malformed');
      const history = entry as Record<string, unknown>;
      const item =
        typeof history.itemId === 'string' ? SHOP_ITEMS_BY_ID.get(history.itemId) : undefined;
      if (
        !isCanonicalIdentifier(history.itemId, 128) ||
        !item ||
        item.type === 'avatar' ||
        typeof history.date !== 'string' ||
        !Number.isFinite(Date.parse(history.date)) ||
        !Number.isSafeInteger(history.cost) ||
        (history.cost as number) < 0
      )
        throw new Error('Stored avatar purchase history is malformed');
      return { itemId: history.itemId, date: history.date, cost: history.cost as number };
    });
  }
  let pendingPurchase: AvatarState['pendingPurchase'];
  if (raw.pendingPurchase !== undefined) {
    if (!raw.pendingPurchase || typeof raw.pendingPurchase !== 'object')
      throw new Error('Stored avatar purchase intent is malformed');
    const intent = raw.pendingPurchase as Record<string, unknown>;
    const itemId = intent.itemId;
    const operationId = intent.operationId;
    const cost = intent.cost;
    const reason = intent.reason;
    const createdAt = intent.createdAt;
    if (
      typeof operationId !== 'string' ||
      typeof itemId !== 'string' ||
      typeof cost !== 'number' ||
      typeof reason !== 'string' ||
      typeof createdAt !== 'number'
    ) {
      throw new Error('Stored avatar purchase intent is malformed');
    }
    const item = SHOP_ITEMS_BY_ID.get(itemId);
    const operationSuffix = operationId.slice('avatar-purchase:'.length);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        operationSuffix,
      );
    if (
      intent.schemaVersion !== 1 ||
      !isCanonicalIdentifier(operationId, 180) ||
      !operationId.startsWith('avatar-purchase:') ||
      !isUuid ||
      !item ||
      item.type === 'avatar' ||
      !isCanonicalIdentifier(itemId, 128) ||
      !Number.isSafeInteger(cost) ||
      cost <= 0 ||
      cost > 1_000_000 ||
      !isBoundedNonblank(reason, 240) ||
      reason !== reason.trim() ||
      !reason.startsWith('Bought ') ||
      reason.slice('Bought '.length).trim().length === 0 ||
      !Number.isSafeInteger(createdAt) ||
      createdAt < 0 ||
      ownedItems.has(item.id)
    ) {
      throw new Error('Stored avatar purchase intent is malformed');
    }
    pendingPurchase = { schemaVersion: 1, operationId, itemId: item.id, cost, reason, createdAt };
  }
  return {
    equippedItems: canonicalEquipment,
    ownedItems: [...ownedItems],
    unlockedAvatars: [...unlockedAvatars],
    ...(selectedAvatarId ? { selectedAvatarId } : {}),
    ...(purchaseHistory ? { purchaseHistory } : {}),
    ...(pendingPurchase ? { pendingPurchase } : {}),
  };
}

function createLegacyAvatarState(legacyAvatar: string): AvatarState {
  const selectedAvatarId = parseStoredAvatarId(legacyAvatar);
  if (!selectedAvatarId) throw new Error('Legacy avatar selection is malformed');
  return {
    equippedItems: {},
    ownedItems: [],
    unlockedAvatars: [...new Set([...DEFAULT_UNLOCKED_AVATAR_IDS, selectedAvatarId])],
    selectedAvatarId,
  };
}

const isBoundedNonblank = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const isCanonicalIdentifier = (value: unknown, maximum: number): value is string =>
  isBoundedNonblank(value, maximum) && value === value.trim();

function parseRewards(value: unknown): Reward[] {
  if (!Array.isArray(value) || value.length > MAX_REWARDS)
    throw new Error('Stored reward catalog is malformed');
  const ids = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Stored reward catalog is malformed');
    const raw = entry as Record<string, unknown>;
    if (
      !isCanonicalIdentifier(raw.id, 128) ||
      typeof raw.name !== 'string' ||
      raw.name.trim().length === 0 ||
      raw.name.length > 200 ||
      !Number.isSafeInteger(raw.cost) ||
      (raw.cost as number) <= 0 ||
      (raw.description !== undefined &&
        (typeof raw.description !== 'string' || raw.description.length > 1000)) ||
      (raw.pointsRequired !== undefined &&
        (!Number.isSafeInteger(raw.pointsRequired) || (raw.pointsRequired as number) <= 0)) ||
      ids.has(raw.id)
    ) {
      throw new Error('Stored reward catalog is malformed');
    }
    ids.add(raw.id);
    return {
      id: raw.id,
      name: raw.name,
      cost: raw.cost as number,
      ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
      ...(typeof raw.pointsRequired === 'number' ? { pointsRequired: raw.pointsRequired } : {}),
    };
  });
}

function parseRewardRequests(value: unknown): RewardRequest[] {
  if (!Array.isArray(value)) throw new Error('Stored reward requests are malformed');
  if (value.length > MAX_REWARD_REQUESTS)
    throw new Error('Stored reward request count exceeds its safe limit');
  const statuses = new Set([
    'debit_pending',
    'pending_approval',
    'approved',
    'refund_pending',
    'denied',
    'fulfilled',
  ]);
  const requestIds = new Set<string>();
  const debitIds = new Set<string>();
  const refundIds = new Set<string>();
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Stored reward request is malformed');
    const raw = entry as Record<string, unknown>;
    const reward = raw.reward;
    if (!reward || typeof reward !== 'object')
      throw new Error('Stored reward request reward is malformed');
    const snapshot = reward as Record<string, unknown>;
    if (
      raw.schemaVersion !== 1 ||
      !isCanonicalIdentifier(raw.requestId, 128) ||
      !isCanonicalIdentifier(snapshot.id, 128) ||
      !isBoundedNonblank(snapshot.name, 200) ||
      typeof snapshot.cost !== 'number' ||
      !Number.isSafeInteger(snapshot.cost) ||
      snapshot.cost <= 0 ||
      (snapshot.description !== undefined &&
        (typeof snapshot.description !== 'string' || snapshot.description.length > 1000)) ||
      (snapshot.pointsRequired !== undefined &&
        (!Number.isSafeInteger(snapshot.pointsRequired) ||
          (snapshot.pointsRequired as number) <= 0)) ||
      (raw.legacyReason !== undefined &&
        (typeof raw.legacyReason !== 'string' || raw.legacyReason.length > 1000)) ||
      typeof raw.createdAt !== 'number' ||
      !Number.isSafeInteger(raw.createdAt) ||
      raw.createdAt < 0 ||
      typeof raw.updatedAt !== 'number' ||
      !Number.isSafeInteger(raw.updatedAt) ||
      raw.updatedAt < 0 ||
      raw.updatedAt < raw.createdAt ||
      typeof raw.status !== 'string' ||
      !statuses.has(raw.status) ||
      typeof raw.debitOperationId !== 'string' ||
      raw.debitOperationId.length === 0 ||
      typeof raw.refundOperationId !== 'string' ||
      raw.refundOperationId.length === 0 ||
      raw.debitOperationId !== `reward-debit:${raw.requestId}` ||
      raw.refundOperationId !== `reward-refund:${raw.requestId}` ||
      requestIds.has(raw.requestId) ||
      debitIds.has(raw.debitOperationId) ||
      refundIds.has(raw.refundOperationId)
    ) {
      throw new Error('Stored reward request is malformed');
    }
    requestIds.add(raw.requestId);
    debitIds.add(raw.debitOperationId);
    refundIds.add(raw.refundOperationId);
    return {
      schemaVersion: 1,
      requestId: raw.requestId,
      reward: {
        id: snapshot.id,
        name: snapshot.name,
        cost: snapshot.cost,
        ...(typeof snapshot.description === 'string' ? { description: snapshot.description } : {}),
        ...(typeof snapshot.pointsRequired === 'number'
          ? { pointsRequired: snapshot.pointsRequired }
          : {}),
      },
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      status: raw.status as RewardRequest['status'],
      debitOperationId: raw.debitOperationId,
      refundOperationId: raw.refundOperationId,
      ...(typeof raw.legacyReason === 'string' && raw.legacyReason.length <= 1000
        ? { legacyReason: raw.legacyReason }
        : {}),
    };
  });
}

const ACHIEVEMENT_ICONS = {
  trophy: TrophyIcon,
  flame: FlameIcon,
} as const;

type AchievementIconKey = keyof typeof ACHIEVEMENT_ICONS;

const LEGACY_ACHIEVEMENT_ICON_KEYS: Readonly<Record<string, AchievementIconKey>> = {
  FIRST_TASK: 'trophy',
  FIVE_TASKS: 'trophy',
  TEN_TASKS: 'trophy',
  STREAK_MASTER: 'flame',
  FIRST_FOCUS: 'trophy',
  FOCUS_FIVE: 'trophy',
  FOCUS_TEN: 'trophy',
  FOCUS_MARATHON: 'flame',
  DAILY_FOCUS: 'flame',
  FIRST_GAME: 'trophy',
  MATH_MASTER: 'trophy',
  WORD_WIZARD: 'trophy',
  PATTERN_PRO: 'trophy',
  BIG_SPENDER: 'trophy',
};

function getRequiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Stored achievement ${field} is invalid`);
  }
  return value;
}

function getOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return getRequiredString(value, field);
}

function getAchievementNumber(value: unknown, field: string, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Stored achievement ${field} is invalid`);
  }
  return value;
}

function getAchievementUnlocked(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 0) return false;
  if (value === 1) return true;
  throw new Error('Stored achievement unlocked is invalid');
}

function getAchievementIcon(
  value: unknown,
  id: string,
  allowLegacyIdFallback: boolean,
): Achievement['icon'] {
  if (value === TrophyIcon || value === 'trophy') return TrophyIcon;
  if (value === FlameIcon || value === 'flame') return FlameIcon;
  if ((value === undefined || value === null) && allowLegacyIdFallback) {
    const legacyKey = LEGACY_ACHIEVEMENT_ICON_KEYS[id];
    if (legacyKey) return ACHIEVEMENT_ICONS[legacyKey];
  }
  throw new Error(`Stored achievement icon is unsupported for ${id}`);
}

function getAchievementIconKey(icon: Achievement['icon']): AchievementIconKey {
  if (icon === TrophyIcon) return 'trophy';
  if (icon === FlameIcon) return 'flame';
  throw new Error('Stored achievement icon is unsupported');
}

function hydrateAchievement(value: unknown, allowLegacyIdFallback: boolean): Achievement {
  if (!value || typeof value !== 'object') throw new Error('Stored achievement is invalid');
  const raw = value as Record<string, unknown>;
  const id = getRequiredString(raw.id, 'id');
  const name = getOptionalString(raw.name, 'name') ?? getOptionalString(raw.title, 'title');
  const title = getOptionalString(raw.title, 'title') ?? name;
  if (!name || !title) throw new Error('Stored achievement name is invalid');
  const goal = getAchievementNumber(raw.goal ?? raw.progressGoal, 'goal');

  return {
    id,
    name,
    title,
    description: getRequiredString(raw.description, 'description'),
    icon: getAchievementIcon(raw.icon, id, allowLegacyIdFallback),
    unlocked: getAchievementUnlocked(raw.unlocked),
    progress: getAchievementNumber(raw.progress, 'progress'),
    goal,
    progressGoal: goal,
    pointsAwarded: getAchievementNumber(raw.pointsAwarded, 'pointsAwarded'),
  };
}

function stringifyUserSetting(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getUserSettingFromStore(key: string): string {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.store?.get) {
      return stringifyUserSetting(window.electronAPI.store.get(key));
    }
  } catch {
    // Fall back to appStore below.
  }

  return stringifyUserSetting(appStore.get<unknown>(key));
}

export class DataStore {
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private useSQLite = false;

  constructor() {
    // Use SQLite on Android and Windows, localStorage on web
    const platform = Capacitor.getPlatform();
    this.useSQLite = platform === 'android' || platform === 'windows';
  }

  /**
   * Initialize database connection and perform migration if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializePromise) return this.initializePromise;

    this.initializePromise = (async () => {
      if (this.useSQLite) {
        try {
          await databaseService.initialize();

          // Check if migration is needed
          const migrated = await migrationService.isMigrationComplete();
          if (!migrated) {
            await migrationService.performMigration();
          }
        } catch (error) {
          logger.error('Failed to initialize native SQLite data store:', error);
          throw error;
        }
      }

      this.initialized = true;
    })().finally(() => {
      this.initializePromise = null;
    });

    return this.initializePromise;
  }

  private requireSQLiteConnection() {
    const db = databaseService.getConnection();
    if (!db) throw new Error('Native SQLite storage is unavailable');
    return db;
  }

  // ========== Homework Items ==========

  async getHomeworkItems(): Promise<HomeworkItem[]> {
    if (this.useSQLite) {
      this.requireSQLiteConnection();
      return await databaseService.getHomeworkItems();
    } else {
      const stored = appStore.getStrict<unknown>('homeworkItems');
      if (stored === null) return [];
      return parseWebHomeworkItems(stored);
    }
  }

  async saveHomeworkItems(items: HomeworkItem[]): Promise<void> {
    parseWebHomeworkItems(items);
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();

      // Replace the complete set so removals and an empty list persist too.
      await databaseService.runInTransaction(async () => {
        await db.run('DELETE FROM homework_items', [], false);
        for (const item of items) {
          await databaseService.saveHomeworkItem(item, false);
        }
      });
    } else {
      appStore.setStrict('homeworkItems', items);
    }
  }

  async saveHomeworkItem(item: HomeworkItem): Promise<void> {
    if (this.useSQLite) {
      this.requireSQLiteConnection();
      await databaseService.saveHomeworkItem(item);
    } else {
      const items = await this.getHomeworkItems();
      const index = items.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        items[index] = item;
      } else {
        items.push(item);
      }
      parseWebHomeworkItems(items);
      appStore.setStrict('homeworkItems', items);
    }
  }

  async deleteHomeworkItem(id: string): Promise<void> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run('DELETE FROM homework_items WHERE id = ?', [id]);
    } else {
      const items = await this.getHomeworkItems();
      const filtered = items.filter((i) => i.id !== id);
      appStore.setStrict('homeworkItems', filtered);
    }
  }

  // ========== Student Points ==========

  async getStudentPoints(): Promise<number> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(`SELECT value FROM user_settings WHERE key = 'student_points'`);
      if (result.values && result.values.length > 0) {
        return Number(result.values[0].value);
      }
      return 0;
    } else {
      return Number(appStore.get('studentPoints') ?? '0');
    }
  }

  async saveStudentPoints(points: number): Promise<void> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
      await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
        'student_points',
        points.toString(),
      ]);
    } else {
      appStore.set('studentPoints', points.toString());
    }
  }

  // ========== Achievements ==========

  async getAchievements(): Promise<Achievement[]> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(`
          SELECT id, title, description, icon, unlocked, progress,
                 progress_goal as progressGoal, points_awarded as pointsAwarded
          FROM achievements
        `);
      return (result.values ?? []).map((achievement) => hydrateAchievement(achievement, true));
    } else {
      return (appStore.get<unknown[]>('achievements') ?? []).map((achievement) =>
        hydrateAchievement(achievement, true),
      );
    }
  }

  async saveAchievements(achievements: Achievement[]): Promise<void> {
    const persistedAchievements = achievements.map((achievement) =>
      hydrateAchievement(achievement, false),
    );
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await databaseService.runInTransaction(async () => {
        await db.run('DELETE FROM achievements', [], false);
        for (const persisted of persistedAchievements) {
          await db.run(
            `
            INSERT INTO achievements
            (id, title, description, icon, unlocked, progress, progress_goal, points_awarded)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              persisted.id,
              persisted.title,
              persisted.description,
              getAchievementIconKey(persisted.icon),
              persisted.unlocked ? 1 : 0,
              persisted.progress,
              persisted.progressGoal,
              persisted.pointsAwarded,
            ],
            false,
          );
        }
      });
    } else {
      appStore.set(
        'achievements',
        JSON.stringify(
          persistedAchievements.map(({ icon, ...achievement }) => ({
            ...achievement,
            icon: getAchievementIconKey(icon),
          })),
        ),
      );
    }
  }

  // ========== Rewards ==========

  async getRewards(): Promise<Reward[]> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      // The rewards table is the parent-defined catalog. Map the SQLite
      // `points_required` column onto the app-canonical `cost` field — the
      // rest of the app reads `reward.cost`, so returning `pointsRequired`
      // made every reward un-claimable (cost: undefined) on SQLite platforms.
      const result = await db.query(`
          SELECT id, name, points_required as cost, description
          FROM rewards
        `);
      return parseRewards(result.values ?? []);
    } else {
      const stored = appStore.getStrict<unknown>(REWARD_CATALOG_KEY);
      return stored === null ? [] : parseRewards(stored);
    }
  }

  async saveRewards(rewards: Reward[]): Promise<void> {
    const validated = parseRewards(rewards);
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await databaseService.runInTransaction(async () => {
        await db.run('DELETE FROM rewards', [], false);
        for (const reward of validated) {
          // The catalog is a complete replacement. Legacy `claimed` and
          // `claimed_at` columns are write-only schema remnants; the pending
          // request queue lives separately in user_settings.rewardRequests:v1 and
          // must not be read, written, or deleted by catalog replacement.
          await db.run(
            `
            INSERT INTO rewards (id, name, points_required, description)
            VALUES (?, ?, ?, ?)
          `,
            [reward.id, reward.name, reward.cost, reward.description ?? ''],
            false,
          );
        }
      });
    } else {
      appStore.setStrict(REWARD_CATALOG_KEY, JSON.stringify(validated));
    }
  }

  async getRewardRequests(): Promise<RewardRequest[]> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(`SELECT value FROM user_settings WHERE key = ?`, [
        REWARD_REQUESTS_KEY,
      ]);
      if (result.values && result.values.length > 0) {
        return parseRewardRequests(JSON.parse(result.values[0].value));
      }
      const legacy = await db.query(`SELECT value FROM user_settings WHERE key = 'claimedRewards'`);
      if (legacy.values?.length) {
        const records = JSON.parse(legacy.values[0].value);
        if (!Array.isArray(records) || records.length > 0) {
          throw new Error(
            'Legacy reward claims require parent review before reward requests can be used',
          );
        }
      }
      return [];
    } else {
      const current = appStore.getStrict<unknown>(REWARD_REQUESTS_KEY);
      if (current !== null) return parseRewardRequests(current);
      const legacy = appStore.getStrict<unknown>('claimedRewards');
      if (legacy !== null && (!Array.isArray(legacy) || legacy.length > 0)) {
        throw new Error(
          'Legacy reward claims require parent review before reward requests can be used',
        );
      }
      return [];
    }
  }

  // ========== Achievement lifecycle (v1) ==========
  // This record is deliberately separate from the legacy achievements table.  The
  // lifecycle service is the sole routine writer; the old rows remain migration-only.
  async getAchievementLifecycleRecord(): Promise<string | null> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query('SELECT value FROM user_settings WHERE key = ?', [
        'vibetutor_achievement_lifecycle_v1',
      ]);
      if (!result.values || result.values.length === 0) return null;
      const value = result.values[0]?.value;
      if (typeof value !== 'string') throw new Error('Achievement lifecycle record is malformed');
      return value;
    }
    const value = appStore.getStrict<unknown>('vibetutor_achievement_lifecycle_v1');
    if (value === null) return null;
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
    throw new Error('Achievement lifecycle record is malformed');
  }

  async saveAchievementLifecycleRecord(record: string): Promise<void> {
    if (typeof record !== 'string')
      throw new Error('Achievement lifecycle record must be serialized');
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run('CREATE TABLE IF NOT EXISTS user_settings (key TEXT PRIMARY KEY, value TEXT)');
      await db.run('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', [
        'vibetutor_achievement_lifecycle_v1',
        record,
      ]);
      return;
    }
    appStore.setStrict('vibetutor_achievement_lifecycle_v1', record);
  }

  // ========== Completion delivery journal (v1) ==========
  // This is deliberately separate from both generic settings and the achievement
  // lifecycle record: it bridges a durable primary completion to its independent
  // token and achievement settlement legs.
  async getCompletionDeliveryRecord(): Promise<string | null> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query('SELECT value FROM user_settings WHERE key = ?', [
        'vibetutor_completion_delivery_v1',
      ]);
      if (!Array.isArray(result.values)) {
        if (result.values === undefined) return null;
        throw new Error('Completion delivery record is malformed');
      }
      if (result.values.length === 0) return null;
      if (result.values.length !== 1) throw new Error('Completion delivery record is malformed');
      const value = result.values[0]?.value;
      if (typeof value !== 'string') throw new Error('Completion delivery record is malformed');
      return value;
    }
    const value = appStore.getStrict<unknown>('vibetutor_completion_delivery_v1');
    if (value === null) return null;
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
    throw new Error('Completion delivery record is malformed');
  }

  async saveCompletionDeliveryRecord(record: string): Promise<void> {
    if (typeof record !== 'string')
      throw new Error('Completion delivery record must be serialized');
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run('CREATE TABLE IF NOT EXISTS user_settings (key TEXT PRIMARY KEY, value TEXT)');
      await db.run('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', [
        'vibetutor_completion_delivery_v1',
        record,
      ]);
      return;
    }
    appStore.setStrict('vibetutor_completion_delivery_v1', record);
  }

  // ========== Worksheet progression (v1) ==========
  // This raw record is deliberately separate from generic settings and the
  // legacy subject-progress map so one write can retain completion and both
  // independent settlement legs together.
  async getWorksheetProgressRecord(): Promise<string | null> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query('SELECT value FROM user_settings WHERE key = ?', [
        'vibetutor_worksheet_progress_v1',
      ]);
      if (!Array.isArray(result.values)) {
        if (result.values === undefined) return null;
        throw new Error('Worksheet progress record is malformed');
      }
      if (result.values.length === 0) return null;
      if (result.values.length !== 1) throw new Error('Worksheet progress record is malformed');
      const value = result.values[0]?.value;
      if (typeof value !== 'string' || value.length === 0)
        throw new Error('Worksheet progress record is malformed');
      return value;
    }
    const value = appStore.getStrict<unknown>('vibetutor_worksheet_progress_v1');
    if (value === null) return null;
    if (typeof value === 'string' && value.length > 0) return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
    throw new Error('Worksheet progress record is malformed');
  }

  async saveWorksheetProgressRecord(record: string): Promise<void> {
    if (typeof record !== 'string' || record.length === 0)
      throw new Error('Worksheet progress record must be serialized');
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run('CREATE TABLE IF NOT EXISTS user_settings (key TEXT PRIMARY KEY, value TEXT)');
      await db.run('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', [
        'vibetutor_worksheet_progress_v1',
        record,
      ]);
      return;
    }
    appStore.setStrict('vibetutor_worksheet_progress_v1', record);
  }

  async getLegacyWorksheetProgressRecord(): Promise<string | null> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query('SELECT value FROM user_settings WHERE key = ?', [
        'subject-progress',
      ]);
      if (!Array.isArray(result.values)) {
        if (result.values === undefined) return null;
        throw new Error('Legacy worksheet progress record is malformed');
      }
      if (result.values.length === 0) return null;
      if (result.values.length !== 1)
        throw new Error('Legacy worksheet progress record is malformed');
      const value = result.values[0]?.value;
      if (typeof value !== 'string' || value.length === 0)
        throw new Error('Legacy worksheet progress record is malformed');
      return value;
    }
    const value = appStore.getStrict<unknown>('subject-progress');
    if (value === null) return null;
    if (typeof value === 'string' && value.length > 0) return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
    throw new Error('Legacy worksheet progress record is malformed');
  }

  // ========== Realm runs (v1) ==========
  async getRealmRunRecord(): Promise<string | null> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query('SELECT value FROM user_settings WHERE key = ?', [
        'vibetutor_realm_runs_v1',
      ]);
      if (!Array.isArray(result.values)) {
        if (result.values === undefined) return null;
        throw new Error('Realm run record is malformed');
      }
      if (result.values.length === 0) return null;
      if (result.values.length !== 1) throw new Error('Realm run record is malformed');
      const value = result.values[0]?.value;
      if (typeof value !== 'string' || value.length === 0)
        throw new Error('Realm run record is malformed');
      return value;
    }
    const value = appStore.getStrict<unknown>('vibetutor_realm_runs_v1');
    if (value === null) return null;
    if (typeof value === 'string' && value.length > 0) return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
    throw new Error('Realm run record is malformed');
  }

  async saveRealmRunRecord(record: string): Promise<void> {
    if (typeof record !== 'string' || record.length === 0)
      throw new Error('Realm run record must be serialized');
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run('CREATE TABLE IF NOT EXISTS user_settings (key TEXT PRIMARY KEY, value TEXT)');
      await db.run('INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)', [
        'vibetutor_realm_runs_v1',
        record,
      ]);
      return;
    }
    appStore.setStrict('vibetutor_realm_runs_v1', record);
  }

  // The legacy producer wrote directly to appStore even on native SQLite.
  async getLegacyRealmGameSessionSequence(): Promise<number | null> {
    const value = appStore.getStrict<unknown>('realm_game_session_sequence');
    if (value === null) return null;
    if (!Number.isSafeInteger(value) || (value as number) < 0)
      throw new Error('Legacy realm sequence is malformed');
    return value as number;
  }

  async getLegacyAchievementLifecycleSources(): Promise<{
    achievements: unknown[];
    homeworkStats: string;
    focusStats: string;
    gameStats: string;
    homeworkItems: unknown[];
    focusSessions: unknown[];
    avatarState: unknown;
  }> {
    const strictSetting = async (key: string): Promise<string> => {
      if (this.useSQLite) {
        const db = this.requireSQLiteConnection();
        const result = await db.query('SELECT value FROM user_settings WHERE key = ?', [key]);
        if (!result.values || result.values.length === 0) return '';
        const value = result.values[0]?.value;
        if (typeof value !== 'string') throw new Error('Legacy achievement setting is malformed');
        return value;
      }
      const value = appStore.getStrict<unknown>(key);
      if (value === null) return '';
      if (typeof value !== 'string') throw new Error('Legacy achievement setting is malformed');
      return value;
    };
    if (this.useSQLite) {
      // Read migration inputs directly and let the lifecycle parser validate their
      // historical shape. Do not use permissive app-facing fallbacks here.
      const db = this.requireSQLiteConnection();
      const achievements = await db.query(
        'SELECT id, CASE unlocked WHEN 0 THEN 0 WHEN 1 THEN 1 ELSE unlocked END AS unlocked, progress FROM achievements',
      );
      const homeworkItems = await db.query(
        "SELECT id, CASE completed WHEN 0 THEN 0 WHEN 1 THEN 1 ELSE completed END AS completed, CAST(strftime('%s', updated_at) AS INTEGER) * 1000 AS completedDate FROM homework_items",
      );
      const focusSessions = await db.query(
        "SELECT id, CAST(strftime('%s', session_date) AS INTEGER) * 1000 AS startTime, 1 AS completed FROM learning_sessions WHERE session_type = ?",
        ['focus'],
      );
      const avatar = await db.query('SELECT value FROM user_settings WHERE key = ?', [
        AVATAR_STATE_KEY,
      ]);
      if (
        !Array.isArray(achievements.values) ||
        !Array.isArray(homeworkItems.values) ||
        !Array.isArray(focusSessions.values)
      ) {
        throw new Error('Legacy achievement arrays are malformed');
      }
      let avatarState: unknown = null;
      if (avatar.values?.length) {
        const value = avatar.values[0]?.value;
        if (typeof value !== 'string') throw new Error('Legacy avatar state is malformed');
        try {
          avatarState = parseAvatarState(JSON.parse(value));
        } catch {
          throw new Error('Legacy avatar state is malformed');
        }
      }
      return {
        achievements: achievements.values.map((row: Record<string, unknown>) => ({
          ...row,
          unlocked: row.unlocked === 1 ? true : row.unlocked === 0 ? false : row.unlocked,
        })),
        homeworkStats: await strictSetting('homeworkStats'),
        focusStats: await strictSetting('focusStats'),
        gameStats: await strictSetting('gameStats'),
        homeworkItems: homeworkItems.values.map((row: Record<string, unknown>) => ({
          ...row,
          completed: row.completed === 1 ? true : row.completed === 0 ? false : row.completed,
        })),
        focusSessions: focusSessions.values.map((row: Record<string, unknown>) => ({
          ...row,
          completed: row.completed === 1 ? true : row.completed === 0 ? false : row.completed,
        })),
        avatarState,
      };
    }
    const exactArray = (key: string): unknown[] => {
      const value = appStore.getStrict<unknown>(key);
      if (value === null) return [];
      if (!Array.isArray(value)) throw new Error('Legacy achievement arrays are malformed');
      return value;
    };
    return {
      achievements: exactArray('achievements'),
      homeworkStats: await strictSetting('homeworkStats'),
      focusStats: await strictSetting('focusStats'),
      gameStats: await strictSetting('gameStats'),
      homeworkItems: exactArray('homeworkItems'),
      focusSessions: exactArray('focusSessions'),
      avatarState: (() => {
        const stored = appStore.getStrict<unknown>(AVATAR_STATE_KEY);
        return stored === null ? null : parseAvatarState(stored);
      })(),
    };
  }

  async saveRewardRequests(requests: RewardRequest[]): Promise<void> {
    const validated = parseRewardRequests(requests);
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
      await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
        REWARD_REQUESTS_KEY,
        JSON.stringify(validated),
      ]);
    } else {
      appStore.setStrict(REWARD_REQUESTS_KEY, JSON.stringify(validated));
    }
  }

  // Compatibility aliases retain the canonical request schema for existing export/import callers.
  async getClaimedRewards(): Promise<RewardRequest[]> {
    return this.getRewardRequests();
  }
  async saveClaimedRewards(requests: RewardRequest[]): Promise<void> {
    return this.saveRewardRequests(requests);
  }

  // ========== Music Playlists ==========

  async getMusicPlaylists(): Promise<MusicPlaylist[]> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(`SELECT id, name, tracks, created_at FROM music_playlists`);
      return (result.values ?? []).map((p: Record<string, unknown>) => ({
        id: String(p.id ?? ''),
        name: typeof p.name === 'string' ? p.name : '',
        platform: 'unknown',
        tracks: this.parsePlaylistTracks(p.tracks),
        createdAt: typeof p.created_at === 'number' ? p.created_at : Date.now(),
      }));
    } else {
      return appStore.get<MusicPlaylist[]>('musicPlaylists') ?? [];
    }
  }

  async saveMusicPlaylists(playlists: MusicPlaylist[]): Promise<void> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await databaseService.runInTransaction(async () => {
        // Replace the complete set so removals and an empty list persist too.
        await db.run('DELETE FROM music_playlists', [], false);
        for (const playlist of playlists) {
          await db.run(
            `
            INSERT OR REPLACE INTO music_playlists (id, name, tracks)
            VALUES (?, ?, ?)
          `,
            [playlist.id, playlist.name, JSON.stringify(playlist.tracks)],
            false,
          );
        }
      });
    } else {
      appStore.set('musicPlaylists', JSON.stringify(playlists));
    }
  }

  private parsePlaylistTracks(value: unknown): MusicPlaylist['tracks'] {
    const tracks = typeof value === 'string' ? this.parseStoredTracks(value) : value;
    if (!Array.isArray(tracks)) {
      throw new Error('Stored playlist tracks are malformed');
    }
    return tracks as MusicPlaylist['tracks'];
  }

  private parseStoredTracks(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error('Stored playlist tracks are malformed');
    }
  }

  // ========== Focus Sessions ==========

  async getFocusSessions(): Promise<FocusSession[]> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      // learning_sessions stores only a subset of columns, so build complete
      // FocusSession objects from the row. id/startTime/endTime/completed
      // were previously dropped, corrupting the round-trip.
      const result = await db.query(`
          SELECT id, external_id, duration_minutes, focus_score, session_date, started_at, ended_at
          FROM learning_sessions WHERE session_type = 'focus'
          ORDER BY session_date DESC
        `);
      if (result.values !== undefined && !Array.isArray(result.values))
        throw new Error('Stored focus sessions are malformed');
      const rows = result.values ?? [];
      if (rows.length > WEB_COLLECTION_CAP) throw new Error('Stored focus sessions are malformed');
      const ids = new Set<string>();
      return rows.map((row) => {
        if (
          !row ||
          typeof row !== 'object' ||
          Array.isArray(row) ||
          typeof row.duration_minutes !== 'number' ||
          typeof row.focus_score !== 'number'
        )
          throw new Error('Stored focus session is malformed');
        const duration = row.duration_minutes;
        const points = row.focus_score;
        const external = row.external_id;
        const canonical = external !== null && external !== undefined;
        const startTime = canonical ? row.started_at : parseLegacyFocusTimestamp(row.session_date);
        const endTime = canonical
          ? row.ended_at
          : Number.isSafeInteger(startTime)
            ? startTime + duration * 60000
            : NaN;
        const id = canonical ? external : row.id;
        if (
          (canonical && (typeof id !== 'string' || !SAFE_ID.test(id))) ||
          (!canonical && !(typeof id === 'number' && Number.isSafeInteger(id) && id > 0))
        )
          throw new Error('Stored focus session is malformed');
        if (
          !Number.isSafeInteger(startTime) ||
          startTime < 0 ||
          !Number.isSafeInteger(endTime) ||
          endTime < startTime ||
          !Number.isSafeInteger(duration) ||
          duration <= 0 ||
          !Number.isSafeInteger(points) ||
          points < 0
        )
          throw new Error('Stored focus session is malformed');
        const session = {
          id: String(id),
          startTime,
          endTime,
          duration,
          completed: true,
          points,
        };
        if (!SAFE_ID.test(session.id) || ids.has(session.id))
          throw new Error('Stored focus session is malformed');
        ids.add(session.id);
        return session;
      });
    } else {
      const stored = appStore.getStrict<unknown>('focusSessions');
      if (stored === null) return [];
      if (!Array.isArray(stored) || stored.length > WEB_COLLECTION_CAP)
        throw new Error('Stored focus sessions are malformed');
      const ids = new Set<string>();
      return stored.map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry))
          throw new Error('Stored focus sessions are malformed');
        const session = entry as FocusSession;
        if (
          typeof session.id !== 'string' ||
          !SAFE_ID.test(session.id) ||
          !Number.isSafeInteger(session.startTime) ||
          session.startTime < 0 ||
          session.endTime === undefined ||
          !Number.isSafeInteger(session.endTime) ||
          session.endTime < 0 ||
          session.endTime < session.startTime ||
          !Number.isSafeInteger(session.duration) ||
          session.duration <= 0 ||
          session.completed !== true ||
          (session.points !== undefined &&
            (!Number.isSafeInteger(session.points) || session.points < 0)) ||
          ids.has(session.id)
        ) {
          throw new Error('Stored focus sessions are malformed');
        }
        ids.add(session.id);
        return { ...session };
      });
    }
  }

  async saveFocusSession(session: FocusSession): Promise<FocusSession> {
    assertWebFocus(session);
    if (this.useSQLite) {
      this.requireSQLiteConnection();
      const existing = await this.getFocusSessions();
      if (
        !existing.some((saved) => saved.id === session.id) &&
        existing.length >= WEB_COLLECTION_CAP
      )
        throw new Error('Stored focus sessions exceed the safe limit');
      return databaseService.saveFocusSession(session);
    } else {
      const sessions = await this.getFocusSessions();
      const existing = sessions.findIndex((entry) => entry.id === session.id);
      if (existing >= 0) sessions[existing] = { ...session };
      else sessions.push({ ...session });
      if (sessions.length > WEB_COLLECTION_CAP)
        throw new Error('Stored focus sessions exceed the safe limit');
      sessions.forEach(assertWebFocus);
      appStore.setStrict('focusSessions', sessions);
      return { ...session };
    }
  }

  // ========== Avatar State ==========

  async getAvatarState(): Promise<AvatarState | null> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(`SELECT value FROM user_settings WHERE key = ?`, [
        AVATAR_STATE_KEY,
      ]);
      if (result.values && result.values.length > 0) {
        return parseAvatarState(JSON.parse(result.values[0].value));
      }
      const legacyAvatar = await this.getUserSettings('user_avatar');
      return legacyAvatar ? createLegacyAvatarState(legacyAvatar) : null;
    } else {
      const stored = appStore.getStrict<unknown>(AVATAR_STATE_KEY);
      if (stored !== null) return parseAvatarState(stored);
      const legacyAvatar = appStore.getStrict<unknown>('user_avatar');
      if (legacyAvatar === null || legacyAvatar === '') return null;
      if (typeof legacyAvatar !== 'string') throw new Error('Legacy avatar selection is malformed');
      return createLegacyAvatarState(legacyAvatar);
    }
  }

  async saveAvatarState(state: AvatarState): Promise<void> {
    const validated = parseAvatarState(state);
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
      await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
        AVATAR_STATE_KEY,
        JSON.stringify(validated),
      ]);
    } else {
      appStore.setStrict(AVATAR_STATE_KEY, validated);
    }
  }

  // ========== Generic User Settings ==========

  async getUserSettings(key: string): Promise<string> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(`SELECT value FROM user_settings WHERE key = ?`, [key]);
      if (result.values && result.values.length > 0) {
        return result.values[0].value;
      }
      return '';
    } else {
      return getUserSettingFromStore(key);
    }
  }

  async saveUserSettings(key: string, value: string): Promise<void> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
      await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [key, value]);
    } else {
      appStore.set(key, value);
    }
  }

  // ========== Chat History ==========

  async getChatHistory(type: 'tutor' | 'friend'): Promise<ChatMessage[]> {
    const key = `chat-history-${type}`;

    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      // Store chat history in user_settings as JSON
      const result = await db.query(`SELECT value FROM user_settings WHERE key = ?`, [key]);
      if (result.values && result.values.length > 0) {
        const messages = JSON.parse(result.values[0].value) as ChatMessage[];
        return messages;
      }
      return [];
    } else {
      const messages = appStore.get<ChatMessage[]>(key) ?? [];
      return messages;
    }
  }

  async saveChatHistory(type: 'tutor' | 'friend', messages: ChatMessage[]): Promise<void> {
    const key = `chat-history-${type}`;
    const capped =
      messages.length > CHAT_HISTORY_CAP ? messages.slice(-CHAT_HISTORY_CAP) : messages;

    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
      await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
        key,
        JSON.stringify(capped),
      ]);
    } else {
      appStore.set(key, JSON.stringify(capped));
    }
  }

  // ========== Brain Game Stats ==========

  async getBrainGameStats(): Promise<BrainGameStats | null> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(
        `SELECT value FROM user_settings WHERE key = 'brainGamesStats'`,
      );
      if (result.values && result.values.length > 0) {
        return JSON.parse(result.values[0].value) as BrainGameStats;
      }
      return null;
    } else {
      return appStore.get<BrainGameStats>('brainGamesStats');
    }
  }

  async saveBrainGameStats(stats: BrainGameStats): Promise<void> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
      await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
        'brainGamesStats',
        JSON.stringify(stats),
      ]);
    } else {
      appStore.set('brainGamesStats', JSON.stringify(stats));
    }
  }

  // ========== Schedule ==========

  async getSchedule(): Promise<DailySchedule[]> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(
        `SELECT value FROM user_settings WHERE key = 'blake_daily_schedule'`,
      );
      if (result.values && result.values.length > 0) {
        return JSON.parse(result.values[0].value) as DailySchedule[];
      }
      return [];
    } else {
      return appStore.get<DailySchedule[]>('blake_daily_schedule') ?? [];
    }
  }

  async saveSchedule(items: DailySchedule[]): Promise<void> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run(`
          CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
      await db.run(`INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)`, [
        'blake_daily_schedule',
        JSON.stringify(items),
      ]);
    } else {
      appStore.set('blake_daily_schedule', JSON.stringify(items));
    }
  }

  // ========== Sensory Preferences ==========

  async getSensoryPreferences(): Promise<SensoryPreferences | null> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      const result = await db.query(
        `SELECT value FROM user_preferences WHERE key = 'sensory_prefs'`,
      );
      if (result.values && result.values.length > 0) {
        return JSON.parse(result.values[0].value) as SensoryPreferences;
      }
      return null;
    } else {
      return appStore.get<SensoryPreferences>('sensory-prefs');
    }
  }

  async saveSensoryPreferences(prefs: SensoryPreferences): Promise<void> {
    if (this.useSQLite) {
      const db = this.requireSQLiteConnection();
      await db.run(`
          CREATE TABLE IF NOT EXISTS user_preferences (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
      await db.run(`INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)`, [
        'sensory_prefs',
        JSON.stringify(prefs),
      ]);
    } else {
      appStore.set('sensory-prefs', JSON.stringify(prefs));
    }
  }
}

// Export singleton instance
export const dataStore = new DataStore();
