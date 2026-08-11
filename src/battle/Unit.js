import {
  DEFAULT_STATUS_DURATIONS,
  canIssueCommand,
  canUseMagic,
  statusTick,
} from './StatusEngine.js';

let uidCounter = 0;

export class Unit {
  constructor(config) {
    this.uid = `u${uidCounter++}`;
    this.id = config.id;
    this.name = config.name;
    this.isEnemy = !!config.isEnemy;
    this.role = config.role || null;

    this.maxHp = config.maxHp;
    this.hp = config.hp ?? config.maxHp;
    this.maxMp = config.maxMp ?? 0;
    this.mp = config.mp ?? this.maxMp;

    this.atk = config.atk ?? 10;
    this.def = config.def ?? 10;
    this.magicDef = config.magicDef ?? Math.round(this.def * 0.5);
    this.magic = config.magic ?? 10;
    this.agility = config.agility ?? 20;
    this.evasion = config.evasion ?? 0;

    this.weakness = config.weakness ?? null; // element string
    this.resist = config.resist ?? null;
    this.weaponElement = config.weaponElement ?? null;
    this.weaponAccuracy = config.weaponAccuracy ?? 100;
    this.weaponSpecial = config.weaponSpecial ?? null;
    this.weaponId = config.weaponId ?? 'w_neutral';
    this.baseAtk = config.baseAtk ?? this.atk;
    this.baseDef = config.baseDef ?? this.def;
    this.baseMagicDef = config.baseMagicDef ?? this.magicDef;
    this.baseMagic = config.baseMagic ?? this.magic;
    this.baseAgility = config.baseAgility ?? this.agility;
    this.equipmentEffects = config.equipmentEffects ?? {};
    this.mpCostMultiplier = this.equipmentEffects.mpCostMultiplier ?? 1;
    this.physicalDamageMultiplier = this.equipmentEffects.physicalDamageMultiplier ?? 1;
    this.imageHits = this.equipmentEffects.initialImageHits ?? 0;
    this.nextAttackMultiplier = 1;
    this.magicDamageMultiplier = 1;
    this.physicalBarrier = Math.max(0, config.physicalBarrier ?? 0);
    this.statuses = new Set(config.statuses ?? []);
    this.statusDurations = new Map(config.statusDurations ?? []);
    this.statusImmunities = new Set([
      ...(config.statusImmunities ?? []),
      ...(this.equipmentEffects.statusImmunities ?? []),
    ]);
    this.statusResistance = Math.min(0.9, Math.max(0, config.statusResistance ?? this.equipmentEffects.statusResistance ?? 0));
    this.level = config.level ?? 1;
    this.equippedAbilitySet = config.equippedAbilitySet ?? 'たたかう型';
    this.equipment = config.equipment ?? {
      weapon: null,
      shield: null,
      head: null,
      body: null,
      accessory: null,
    };
    this.abilityId = config.abilityId ?? 'ability_guard';
    this.crystalShardId = config.crystalShardId ?? 'shard_azure';

    this.size = config.size ?? 1.0;
    this.ai = config.ai ?? null;
    this.aiActions = config.aiActions ?? [];
    this.creatureTypes = new Set(config.creatureTypes ?? (config.isEnemy ? ['boss'] : ['human']));
    this.row = config.row ?? 'front';
    this.heavy = config.heavy ?? this.creatureTypes.has('boss');
    this.isUndead = config.isUndead ?? this.equipmentEffects.undeadProperties ?? this.creatureTypes.has('undead');
    this.removedFromBattle = false;

    // CTB state
    this.ctValue = config.ctValue ?? Math.random() * 200 + (this.equipmentEffects.initialCtBonus ?? 0); // slight stagger at battle start
    this.defending = false;

    this.magicList = config.magicList ?? [];

    (this.equipmentEffects.autoStatuses ?? []).forEach((status) => this.addStatus(status, { force: true }));
  }

  isAlive() {
    return this.hp > 0;
  }

  applyDamage(amount) {
    const dmg = Math.max(0, Math.round(amount));
    const before = this.hp;
    this.hp = Math.max(0, this.hp - dmg);
    if (this.hp === 0) this.statuses.add('ko');
    return before - this.hp;
  }

  applyHeal(amount) {
    if (!this.isAlive() || this.statuses.has('zombie')) return 0;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.round(amount));
    return this.hp - before;
  }

  spendMp(amount) {
    this.mp = Math.max(0, this.mp - amount);
  }

  hpRatio() {
    return this.hp / this.maxHp;
  }

  canAffordMp(amount) {
    return this.mp >= Math.ceil(Math.max(0, amount) * (this.mpCostMultiplier ?? 1));
  }

  canIssueCommand() {
    return canIssueCommand(this);
  }

  canUseMagic() {
    return canUseMagic(this);
  }

  addStatus(status, { duration, chance = 1, force = false, random = Math.random } = {}) {
    if (!status || (!force && this.statusImmunities.has(status))) return false;
    if (!force && random() > Math.max(0.05, chance * (1 - this.statusResistance))) return false;
    if (status === 'ko') {
      this.hp = 0;
      this.statuses.add('ko');
      return true;
    }
    if (!this.isAlive()) return false;
    this.statuses.add(status);
    const turns = duration ?? DEFAULT_STATUS_DURATIONS[status];
    if (turns) this.statusDurations.set(status, turns);
    return true;
  }

  removeStatus(status) {
    const removed = this.statuses.delete(status);
    this.statusDurations.delete(status);
    return removed;
  }

  revive(hpRatio = 0.25) {
    if (this.isAlive() && !this.statuses.has('ko')) return 0;
    this.removeStatus('ko');
    this.hp = Math.max(1, Math.round(this.maxHp * hpRatio));
    return this.hp;
  }

  processTurnStatuses() {
    return statusTick(this);
  }
}
