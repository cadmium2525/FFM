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

    // CTB state
    this.ctValue = config.ctValue ?? Math.random() * 200; // slight stagger at battle start
    this.defending = false;

    this.magicList = config.magicList ?? [];
  }

  isAlive() {
    return this.hp > 0;
  }

  applyDamage(amount) {
    const dmg = Math.max(0, Math.round(amount));
    this.hp = Math.max(0, this.hp - dmg);
    return dmg;
  }

  applyHeal(amount) {
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
}
