import { weaponOptions, abilitySetOptions } from '../data/partyData.js';

export class IntermissionUI {
  constructor() {
    this.containerEl = document.getElementById('intermission-party');
    this.nextBossLabelEl = document.getElementById('next-boss-label');
  }

  render(partyUnits, nextBoss) {
    this.nextBossLabelEl.textContent = nextBoss
      ? `つぎのボス: ${nextBoss.name} （弱点: ${nextBoss.weakness ?? '不明'}）`
      : '';

    this.containerEl.innerHTML = '';
    partyUnits.forEach((unit) => {
      const card = document.createElement('div');
      card.className = 'ff5-window intermission-card';

      const spriteSlot = document.createElement('div');
      spriteSlot.className = 'sprite-slot';
      spriteSlot.style.width = '48px';
      spriteSlot.style.height = '48px';
      const sprite = document.createElement('div');
      sprite.className = 'sprite-placeholder player';
      sprite.style.width = '100%';
      sprite.style.height = '100%';
      const blob = document.createElement('div');
      blob.className = 'blob';
      blob.style.width = '100%';
      blob.style.height = '100%';
      sprite.appendChild(blob);
      spriteSlot.appendChild(sprite);
      card.appendChild(spriteSlot);

      const info = document.createElement('div');
      info.style.flex = '1';

      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = unit.name;
      info.appendChild(nameEl);

      const statsEl = document.createElement('div');
      statsEl.className = 'card-stats';
      statsEl.innerHTML = `HP ${unit.hp}/${unit.maxHp}　MP ${unit.mp}/${unit.maxMp}<br>ATK ${unit.atk}　MAG ${unit.magic}　AGI ${unit.agility}`;
      info.appendChild(statsEl);

      const selects = document.createElement('div');
      selects.className = 'ability-select';

      // Weapon select
      const weaponLabel = document.createElement('label');
      weaponLabel.className = 'card-stats';
      weaponLabel.textContent = 'ぶき: ';
      const weaponSelect = document.createElement('select');
      weaponOptions.forEach((w) => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.name;
        if (unit.weaponId === w.id || (!unit.weaponId && w.id === 'w_neutral')) opt.selected = true;
        weaponSelect.appendChild(opt);
      });
      weaponSelect.addEventListener('change', () => {
        const chosen = weaponOptions.find((w) => w.id === weaponSelect.value);
        unit.weaponId = chosen.id;
        unit.weaponElement = chosen.element;
        unit.atk = unit.baseAtk + chosen.atkBonus;
      });
      weaponLabel.appendChild(weaponSelect);
      selects.appendChild(weaponLabel);

      // Ability-set select
      const abilityLabel = document.createElement('label');
      abilityLabel.className = 'card-stats';
      abilityLabel.textContent = 'まほう: ';
      const abilitySelect = document.createElement('select');
      abilitySetOptions.forEach((setName) => {
        const opt = document.createElement('option');
        opt.value = setName;
        opt.textContent = setName;
        if (unit.equippedAbilitySet === setName) opt.selected = true;
        abilitySelect.appendChild(opt);
      });
      abilitySelect.addEventListener('change', () => {
        unit.equippedAbilitySet = abilitySelect.value;
      });
      abilityLabel.appendChild(abilitySelect);
      selects.appendChild(abilityLabel);

      info.appendChild(selects);
      card.appendChild(info);
      this.containerEl.appendChild(card);
    });
  }
}
