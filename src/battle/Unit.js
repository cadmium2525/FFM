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
    this.magic = config.magic ?? 10;
    this.agility = config.agility ?? 20;

    this.weakness = config.weakness ?? null; // element string
    this.resist = config.resist ?? null;
    this.weaponElement = config.weaponElement ?? null;
    this.weaponId = config.weaponId ?? 'w_neutral';
    this.baseAtk = config.baseAtk ?? this.atk;
    this.equippedAbilitySet = config.equippedAbilitySet ?? 'たたかう型';

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
